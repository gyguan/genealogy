package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobRowResponse;
import com.genealogy.imports.dto.PersonImportRowRetryRequest;
import com.genealogy.imports.dto.RelationshipImportRowRetryRequest;
import com.genealogy.imports.dto.SourceImportRowRetryRequest;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class ImportRowBulkMutationExecutor {

    private static final Set<String> FAILED_STATUSES = Set.of(
            ImportJobRowEntity.STATUS_INVALID,
            ImportJobRowEntity.STATUS_RETRY_FAILED
    );

    private final ImportJobRepository importJobRepository;
    private final ImportJobRowRepository importJobRowRepository;
    private final ImportJobErrorRepository importJobErrorRepository;
    private final ImportJobRowApplicationService personRowService;
    private final RelationshipImportJobRowApplicationService relationshipRowService;
    private final SourceImportJobRowApplicationService sourceRowService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ImportRowBulkMutationExecutor(
            ImportJobRepository importJobRepository,
            ImportJobRowRepository importJobRowRepository,
            ImportJobErrorRepository importJobErrorRepository,
            ImportJobRowApplicationService personRowService,
            RelationshipImportJobRowApplicationService relationshipRowService,
            SourceImportJobRowApplicationService sourceRowService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.importJobRepository = importJobRepository;
        this.importJobRowRepository = importJobRowRepository;
        this.importJobErrorRepository = importJobErrorRepository;
        this.personRowService = personRowService;
        this.relationshipRowService = relationshipRowService;
        this.sourceRowService = sourceRowService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Transactional
    public ImportJobRowResponse retry(
            Long clanId,
            Long jobId,
            Integer rowNo,
            Long expectedVersion,
            Map<String, Object> uploadedCorrection,
            Long actorId
    ) {
        ImportJobEntity job = requireEditableJob(clanId, jobId, actorId);
        ImportJobRowEntity row = requireRetryableRow(jobId, rowNo, expectedVersion);
        Map<String, Object> correction = uploadedCorrection == null
                ? currentCorrection(row)
                : new LinkedHashMap<>(uploadedCorrection);

        ImportJobRowResponse response;
        if (ImportJobEntity.TYPE_RELATIONSHIP.equals(job.getImportType())) {
            response = relationshipRowService.retry(
                    clanId,
                    jobId,
                    row.getId(),
                    new RelationshipImportRowRetryRequest(
                            stringValue(correction, "fromPersonCode"),
                            stringValue(correction, "toPersonCode"),
                            stringValue(correction, "relationshipType"),
                            stringValue(correction, "description"),
                            expectedVersion
                    ),
                    actorId
            );
        } else if (ImportJobEntity.TYPE_SOURCE.equals(job.getImportType())) {
            response = sourceRowService.retry(
                    clanId,
                    jobId,
                    row.getId(),
                    new SourceImportRowRetryRequest(
                            stringValue(correction, "sourceName"),
                            stringValue(correction, "sourceType"),
                            stringValue(correction, "providerName"),
                            stringValue(correction, "bookTitle"),
                            stringValue(correction, "volumeNo"),
                            stringValue(correction, "pageNo"),
                            stringValue(correction, "sourceDate"),
                            stringValue(correction, "collectionLocation"),
                            stringValue(correction, "sourceDescription"),
                            stringValue(correction, "excerpt"),
                            stringValue(correction, "confidenceLevel"),
                            stringValue(correction, "privacyLevel"),
                            stringValue(correction, "sensitiveLevel"),
                            expectedVersion
                    ),
                    actorId
            );
        } else {
            response = personRowService.retryPersonRow(
                    clanId,
                    jobId,
                    row.getId(),
                    new PersonImportRowRetryRequest(
                            stringValue(correction, "name"),
                            stringValue(correction, "gender"),
                            integerValue(correction, "generationNo"),
                            stringValue(correction, "generationWord"),
                            stringValue(correction, "birthDate"),
                            booleanValue(correction, "isLiving", true),
                            booleanValue(correction, "confirmDuplicates", false),
                            expectedVersion
                    ),
                    actorId
            );
        }
        importJobRowRepository.flush();
        return importJobRowRepository.findByJobIdAndRowNo(jobId, rowNo)
                .map(this::toResponse)
                .orElse(response);
    }

    @Transactional
    public ImportJobRowResponse updateCorrection(
            Long clanId,
            Long jobId,
            Integer rowNo,
            Long expectedVersion,
            Map<String, Object> correction,
            Long actorId
    ) {
        requireEditableJob(clanId, jobId, actorId);
        ImportJobRowEntity row = requireRetryableRow(jobId, rowNo, expectedVersion);
        LocalDateTime now = LocalDateTime.now();
        row.setCorrectedData(new LinkedHashMap<>(correction));
        row.setCorrectedBy(actorId);
        row.setCorrectedAt(now);
        row.setUpdatedAt(now);
        return toResponse(importJobRowRepository.saveAndFlush(row));
    }

    @Transactional
    public ImportJobRowResponse exclude(
            Long clanId,
            Long jobId,
            Integer rowNo,
            Long expectedVersion,
            String reason,
            Long actorId
    ) {
        ImportJobEntity job = requireEditableJob(clanId, jobId, actorId);
        ImportJobRowEntity row = requireRetryableRow(jobId, rowNo, expectedVersion);
        LocalDateTime now = LocalDateTime.now();
        row.setRowStatus(ImportJobRowEntity.STATUS_EXCLUDED);
        row.setExcludedReason(reason);
        row.setExcludedBy(actorId);
        row.setExcludedAt(now);
        row.setUpdatedAt(now);
        ImportJobRowEntity saved = importJobRowRepository.saveAndFlush(row);
        importJobErrorRepository.deleteByJobIdAndRowNo(jobId, rowNo);
        recalculateJob(job);
        return toResponse(saved);
    }

    private ImportJobEntity requireEditableJob(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = importJobRepository.findByIdAndClanIdForUpdate(jobId, clanId)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_NOT_FOUND", "导入任务不存在"));
        authorizationApplicationService.requireClanMember(clanId, actorId);
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, job.getBranchId());
        if (!Set.of(ImportJobEntity.TYPE_PERSON, ImportJobEntity.TYPE_RELATIONSHIP, ImportJobEntity.TYPE_SOURCE)
                .contains(job.getImportType())) {
            throw new BusinessException("IMPORT_JOB_TYPE_UNSUPPORTED", "当前导入类型暂不支持批量失败行处理");
        }
        if (!ImportJobEntity.REVIEW_NOT_SUBMITTED.equals(job.getReviewStatus())
                && !ImportJobEntity.REVIEW_REJECTED.equals(job.getReviewStatus())) {
            throw new BusinessException("IMPORT_JOB_REVIEW_LOCKED", "导入批次已进入审核流程，不能批量修改");
        }
        if (!ImportJobEntity.PROCESSING_CORRECTION_REQUIRED.equals(job.getProcessingStatus())) {
            throw new BusinessException("IMPORT_JOB_NOT_CORRECTABLE", "导入批次当前不需要修正");
        }
        return job;
    }

    private ImportJobRowEntity requireRetryableRow(Long jobId, Integer rowNo, Long expectedVersion) {
        ImportJobRowEntity row = importJobRowRepository.findByJobIdAndRowNoForUpdate(jobId, rowNo)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_ROW_NOT_FOUND", "导入失败行不存在"));
        if (!FAILED_STATUSES.contains(row.getRowStatus())
                || row.getDraftTargetId() != null
                || row.getDraftPersonId() != null) {
            throw new BusinessException("IMPORT_JOB_ROW_NOT_RETRYABLE", "该行已经处理成功或不能再次处理");
        }
        if (!Objects.equals(row.getVersion(), expectedVersion)) {
            throw new BusinessException("IMPORT_JOB_ROW_VERSION_CONFLICT", "该行已被其他用户修改，请刷新后重试");
        }
        return row;
    }

    private Map<String, Object> currentCorrection(ImportJobRowEntity row) {
        Map<String, Object> data = row.getCorrectedData() != null ? row.getCorrectedData() : row.getNormalizedData();
        return data == null ? new LinkedHashMap<>() : new LinkedHashMap<>(data);
    }

    private void recalculateJob(ImportJobEntity job) {
        long total = importJobRowRepository.countByJobId(job.getId());
        long success = importJobRowRepository.countByJobIdAndRowStatus(job.getId(), ImportJobRowEntity.STATUS_DRAFT_CREATED);
        long failure = importJobRowRepository.countByJobIdAndRowStatusIn(job.getId(), FAILED_STATUSES);
        long excluded = importJobRowRepository.countByJobIdAndRowStatus(job.getId(), ImportJobRowEntity.STATUS_EXCLUDED);
        job.setTotalCount(toInteger(total));
        job.setSuccessCount(toInteger(success));
        job.setFailureCount(toInteger(failure));
        job.setStatus(failure == 0 ? "completed" : success == 0 && excluded == 0 ? "failed" : "partial_completed");
        job.setProcessingStatus(failure == 0
                ? ImportJobEntity.PROCESSING_READY_FOR_REVIEW
                : ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        job.setErrorSummary(failure == 0 ? null : "存在 " + failure + " 行导入失败，请修正或排除后再提交审核");
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

    private String stringValue(Map<String, Object> data, String key) {
        Object value = data.get(key);
        return value == null ? null : String.valueOf(value).trim();
    }

    private Integer integerValue(Map<String, Object> data, String key) {
        Object value = data.get(key);
        if (value == null || String.valueOf(value).isBlank()) return null;
        if (value instanceof Number number) return number.intValue();
        try {
            return Integer.valueOf(String.valueOf(value).trim());
        } catch (NumberFormatException exception) {
            throw new BusinessException("IMPORT_CORRECTION_VALUE_INVALID", key + " 必须是整数");
        }
    }

    private Boolean booleanValue(Map<String, Object> data, String key, boolean defaultValue) {
        Object value = data.get(key);
        if (value == null) return defaultValue;
        if (value instanceof Boolean booleanValue) return booleanValue;
        String normalized = String.valueOf(value).trim().toLowerCase();
        if (Set.of("true", "1", "yes", "y", "是").contains(normalized)) return true;
        if (Set.of("false", "0", "no", "n", "否").contains(normalized)) return false;
        throw new BusinessException("IMPORT_CORRECTION_VALUE_INVALID", key + " 必须是布尔值");
    }

    private int toInteger(long value) {
        if (value > Integer.MAX_VALUE) {
            throw new BusinessException("IMPORT_COUNT_OVERFLOW", "导入行数量超出系统支持范围");
        }
        return (int) value;
    }
}
