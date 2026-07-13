package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobRowResponse;
import com.genealogy.imports.dto.RelationshipImportRowRetryRequest;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobErrorEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.relationship.application.RelationshipApplicationService;
import com.genealogy.relationship.dto.RelationshipResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class RelationshipImportJobRowApplicationService {

    private static final Set<String> FAILED_STATUSES = Set.of(
            ImportJobRowEntity.STATUS_INVALID,
            ImportJobRowEntity.STATUS_RETRY_FAILED
    );

    private final ImportJobRepository importJobRepository;
    private final ImportJobRowRepository importJobRowRepository;
    private final ImportJobErrorRepository importJobErrorRepository;
    private final RelationshipImportApplicationService relationshipImportApplicationService;
    private final RelationshipApplicationService relationshipApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public RelationshipImportJobRowApplicationService(
            ImportJobRepository importJobRepository,
            ImportJobRowRepository importJobRowRepository,
            ImportJobErrorRepository importJobErrorRepository,
            RelationshipImportApplicationService relationshipImportApplicationService,
            RelationshipApplicationService relationshipApplicationService,
            AuthorizationApplicationService authorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.importJobRepository = importJobRepository;
        this.importJobRowRepository = importJobRowRepository;
        this.importJobErrorRepository = importJobErrorRepository;
        this.relationshipImportApplicationService = relationshipImportApplicationService;
        this.relationshipApplicationService = relationshipApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    @Transactional
    public ImportJobRowResponse retry(
            Long clanId,
            Long jobId,
            Long rowId,
            RelationshipImportRowRetryRequest request,
            Long actorId
    ) {
        ImportJobEntity job = requireJob(clanId, jobId, actorId);
        ensureEditable(job);
        ImportJobRowEntity row = importJobRowRepository.findByIdAndJobId(rowId, jobId)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_ROW_NOT_FOUND", "导入失败行不存在"));
        ensureRetryable(row, request.expectedVersion());

        LocalDateTime now = LocalDateTime.now();
        row.setCorrectedData(correctionData(request));
        row.setCorrectedBy(actorId);
        row.setCorrectedAt(now);
        row.setRetryCount(value(row.getRetryCount()) + 1);
        row.setUpdatedAt(now);

        try {
            List<String> cells = List.of(
                    request.fromPersonCode(),
                    request.toPersonCode(),
                    request.relationshipType(),
                    request.description() == null ? "" : request.description()
            );
            RelationshipImportApplicationService.ParsedRelationship parsed =
                    relationshipImportApplicationService.parseAndResolve(clanId, cells);
            RelationshipResponse relationship = relationshipApplicationService.create(
                    clanId,
                    relationshipImportApplicationService.createRequest(parsed),
                    actorId
            );
            row.setNormalizedData(normalizedData(parsed));
            row.setRowStatus(ImportJobRowEntity.STATUS_DRAFT_CREATED);
            row.setErrorCode(null);
            row.setErrorMessage(null);
            row.setDraftTargetType(ImportJobEntity.TYPE_RELATIONSHIP);
            row.setDraftTargetId(relationship.id());
            ImportJobRowEntity saved = importJobRowRepository.saveAndFlush(row);
            importJobErrorRepository.deleteByJobIdAndRowNo(jobId, row.getRowNo());
            recalculateJob(job);
            operationLogApplicationService.record(
                    clanId,
                    actorId,
                    "relationship_import_row_retry_success",
                    "import_job",
                    jobId,
                    "人物关系导入失败行修正成功",
                    "rowNo=" + row.getRowNo() + ", retryCount=" + row.getRetryCount()
            );
            return toResponse(saved);
        } catch (BusinessException exception) {
            row.setRowStatus(ImportJobRowEntity.STATUS_RETRY_FAILED);
            row.setErrorCode(exception.getCode());
            row.setErrorMessage(exception.getMessage());
            ImportJobRowEntity saved = importJobRowRepository.saveAndFlush(row);
            synchronizeError(jobId, row, now);
            recalculateJob(job);
            operationLogApplicationService.record(
                    clanId,
                    actorId,
                    "relationship_import_row_retry_failed",
                    "import_job",
                    jobId,
                    "人物关系导入失败行修正后仍未通过",
                    "rowNo=" + row.getRowNo() + ", errorCode=" + exception.getCode()
            );
            return toResponse(saved);
        }
    }

    private ImportJobEntity requireJob(Long clanId, Long jobId, Long actorId) {
        authorizationApplicationService.requireClanMember(clanId, actorId);
        ImportJobEntity job = importJobRepository.findByIdAndClanId(jobId, clanId)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_NOT_FOUND", "导入任务不存在"));
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, job.getBranchId());
        if (!ImportJobEntity.TYPE_RELATIONSHIP.equals(job.getImportType())) {
            throw new BusinessException("IMPORT_JOB_TYPE_MISMATCH", "当前批次不是人物关系导入批次");
        }
        return job;
    }

    private void ensureEditable(ImportJobEntity job) {
        if (!ImportJobEntity.REVIEW_NOT_SUBMITTED.equals(job.getReviewStatus())
                && !ImportJobEntity.REVIEW_REJECTED.equals(job.getReviewStatus())) {
            throw new BusinessException("IMPORT_JOB_REVIEW_LOCKED", "导入批次已进入审核流程，不能继续修正");
        }
        if (!ImportJobEntity.PROCESSING_CORRECTION_REQUIRED.equals(job.getProcessingStatus())) {
            throw new BusinessException("IMPORT_JOB_NOT_CORRECTABLE", "导入批次当前不需要修正");
        }
    }

    private void ensureRetryable(ImportJobRowEntity row, Long expectedVersion) {
        if (!FAILED_STATUSES.contains(row.getRowStatus())
                || row.getDraftTargetId() != null
                || row.getDraftPersonId() != null) {
            throw new BusinessException("IMPORT_JOB_ROW_NOT_RETRYABLE", "该行已经处理成功或不能再次重试");
        }
        if (!Objects.equals(row.getVersion(), expectedVersion)) {
            throw new BusinessException("IMPORT_JOB_ROW_VERSION_CONFLICT", "该行已被其他用户修改，请刷新后重试");
        }
    }

    private Map<String, Object> correctionData(RelationshipImportRowRetryRequest request) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("fromPersonCode", request.fromPersonCode().trim());
        data.put("toPersonCode", request.toPersonCode().trim());
        data.put("relationshipType", request.relationshipType().trim());
        data.put("description", request.description() == null ? "" : request.description().trim());
        return data;
    }

    private Map<String, Object> normalizedData(RelationshipImportApplicationService.ParsedRelationship parsed) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("fromPersonCode", parsed.fromCode());
        data.put("fromPersonName", parsed.from().getName());
        data.put("toPersonCode", parsed.toCode());
        data.put("toPersonName", parsed.to().getName());
        data.put("relationshipType", parsed.displayType());
        data.put("description", parsed.description());
        return data;
    }

    private void synchronizeError(Long jobId, ImportJobRowEntity row, LocalDateTime now) {
        ImportJobErrorEntity error = importJobErrorRepository.findFirstByJobIdAndRowNo(jobId, row.getRowNo())
                .orElseGet(ImportJobErrorEntity::new);
        error.setJobId(jobId);
        error.setRowNo(row.getRowNo());
        error.setErrorMessage(row.getErrorMessage());
        error.setRawData(row.getRawData());
        if (error.getCreatedAt() == null) error.setCreatedAt(now);
        importJobErrorRepository.save(error);
    }

    private void recalculateJob(ImportJobEntity job) {
        long total = importJobRowRepository.countByJobId(job.getId());
        long success = importJobRowRepository.countByJobIdAndRowStatus(job.getId(), ImportJobRowEntity.STATUS_DRAFT_CREATED);
        long failure = importJobRowRepository.countByJobIdAndRowStatusIn(job.getId(), FAILED_STATUSES);
        job.setTotalCount(toInteger(total));
        job.setSuccessCount(toInteger(success));
        job.setFailureCount(toInteger(failure));
        job.setStatus(failure == 0 ? "completed" : success == 0 ? "failed" : "partial_completed");
        job.setProcessingStatus(failure == 0
                ? ImportJobEntity.PROCESSING_READY_FOR_REVIEW
                : ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        job.setErrorSummary(failure == 0 ? null : "存在 " + failure + " 行关系导入失败，请修正后再提交审核");
        if (ImportJobEntity.REVIEW_REJECTED.equals(job.getReviewStatus())) {
            job.setReviewStatus(ImportJobEntity.REVIEW_NOT_SUBMITTED);
            job.setLatestReviewTaskId(null);
        }
        job.setUpdatedAt(LocalDateTime.now());
        importJobRepository.save(job);
    }

    private ImportJobRowResponse toResponse(ImportJobRowEntity row) {
        return new ImportJobRowResponse(
                row.getId(), row.getRowNo(), row.getRawData(), row.getNormalizedData(), row.getCorrectedData(),
                row.getRowStatus(), row.getErrorCode(), row.getErrorMessage(), row.getRetryCount(),
                row.getDraftTargetId() != null || row.getDraftPersonId() != null,
                row.getVersion(), row.getUpdatedAt()
        );
    }

    private int value(Integer value) {
        return value == null ? 0 : value;
    }

    private int toInteger(long value) {
        if (value > Integer.MAX_VALUE) {
            throw new BusinessException("IMPORT_COUNT_OVERFLOW", "导入行数量超出系统支持范围");
        }
        return (int) value;
    }
}
