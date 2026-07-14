package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobRowResponse;
import com.genealogy.imports.dto.SourceImportRowRetryRequest;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.source.entity.SourceEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class SourceImportJobRowApplicationService {

    private final ImportJobRepository importJobRepository;
    private final ImportJobRowRepository importJobRowRepository;
    private final SourceImportApplicationService sourceImportApplicationService;

    public SourceImportJobRowApplicationService(
            ImportJobRepository importJobRepository,
            ImportJobRowRepository importJobRowRepository,
            SourceImportApplicationService sourceImportApplicationService
    ) {
        this.importJobRepository = importJobRepository;
        this.importJobRowRepository = importJobRowRepository;
        this.sourceImportApplicationService = sourceImportApplicationService;
    }

    @Transactional
    public ImportJobRowResponse retry(Long clanId, Long jobId, Long rowId, SourceImportRowRetryRequest request, Long actorId) {
        ImportJobEntity job = importJobRepository.findByIdAndClanId(jobId, clanId)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_NOT_FOUND", "导入任务不存在"));
        if (!ImportJobEntity.TYPE_SOURCE.equals(job.getImportType())) {
            throw new BusinessException("IMPORT_JOB_TYPE_MISMATCH", "当前批次不是来源资料导入");
        }
        ImportJobRowEntity row = importJobRowRepository.findById(rowId)
                .filter(item -> Objects.equals(item.getJobId(), jobId))
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_ROW_NOT_FOUND", "导入失败行不存在"));
        if (!Objects.equals(row.getVersion(), request.expectedVersion())) {
            throw new ObjectOptimisticLockingFailureException(ImportJobRowEntity.class, rowId);
        }
        Map<String, Object> data = normalized(request);
        try {
            SourceImportApplicationService.ParsedSource parsed = sourceImportApplicationService.parseRow(List.of(
                    request.sourceName(), request.sourceType(), safe(request.providerName()), safe(request.bookTitle()),
                    safe(request.volumeNo()), safe(request.pageNo()), safe(request.sourceDate()), safe(request.collectionLocation()),
                    safe(request.sourceDescription()), safe(request.excerpt()), safe(request.confidenceLevel()),
                    request.privacyLevel(), safe(request.sensitiveLevel())
            ));
            sourceImportApplicationService.ensureNotDuplicated(clanId, parsed, new java.util.HashSet<>());
            SourceEntity draft = sourceImportApplicationService.createDraft(clanId, parsed, actorId);
            row.setNormalizedData(sourceImportApplicationService.normalizedData(parsed));
            row.setCorrectedData(data);
            row.setDraftTargetType(ImportJobEntity.TYPE_SOURCE);
            row.setDraftTargetId(draft.getId());
            row.setRowStatus(ImportJobRowEntity.STATUS_DRAFT_CREATED);
            row.setErrorCode(null);
            row.setErrorMessage(null);
        } catch (RuntimeException exception) {
            row.setCorrectedData(data);
            row.setRowStatus(ImportJobRowEntity.STATUS_RETRY_FAILED);
            row.setErrorCode(exception instanceof BusinessException business ? business.getCode() : "IMPORT_SOURCE_ROW_INVALID");
            row.setErrorMessage(exception.getMessage());
        }
        row.setRetryCount((row.getRetryCount() == null ? 0 : row.getRetryCount()) + 1);
        row.setCorrectedBy(actorId);
        row.setCorrectedAt(LocalDateTime.now());
        row.setUpdatedAt(LocalDateTime.now());
        ImportJobRowEntity saved = importJobRowRepository.save(row);
        recalculateJob(job);
        return response(saved);
    }

    private void recalculateJob(ImportJobEntity job) {
        long failed = importJobRowRepository.countByJobIdAndRowStatus(job.getId(), ImportJobRowEntity.STATUS_INVALID)
                + importJobRowRepository.countByJobIdAndRowStatus(job.getId(), ImportJobRowEntity.STATUS_RETRY_FAILED);
        long draft = importJobRowRepository.countByJobIdAndRowStatus(job.getId(), ImportJobRowEntity.STATUS_DRAFT_CREATED);
        job.setSuccessCount((int) draft);
        job.setFailureCount((int) failed);
        if (failed == 0) {
            job.setStatus("completed");
            job.setProcessingStatus(ImportJobEntity.PROCESSING_READY_FOR_REVIEW);
            job.setErrorSummary(null);
        } else if (draft > 0) {
            job.setStatus("partial_completed");
            job.setProcessingStatus(ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
            job.setErrorSummary("存在 " + failed + " 行来源资料导入失败，请修正后再提交审核");
        } else {
            job.setStatus("failed");
            job.setProcessingStatus(ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
            job.setErrorSummary("全部来源资料导入行处理失败，请修正后再提交审核");
        }
        job.setUpdatedAt(LocalDateTime.now());
        importJobRepository.save(job);
    }

    private Map<String, Object> normalized(SourceImportRowRetryRequest request) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("sourceName", request.sourceName());
        data.put("sourceType", request.sourceType());
        data.put("providerName", request.providerName());
        data.put("bookTitle", request.bookTitle());
        data.put("volumeNo", request.volumeNo());
        data.put("pageNo", request.pageNo());
        data.put("sourceDate", request.sourceDate());
        data.put("collectionLocation", request.collectionLocation());
        data.put("sourceDescription", request.sourceDescription());
        data.put("excerpt", request.excerpt());
        data.put("confidenceLevel", request.confidenceLevel());
        data.put("privacyLevel", request.privacyLevel());
        data.put("sensitiveLevel", request.sensitiveLevel());
        return data;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private ImportJobRowResponse response(ImportJobRowEntity row) {
        boolean draftCreated = ImportJobRowEntity.STATUS_DRAFT_CREATED.equals(row.getRowStatus());
        return new ImportJobRowResponse(row.getId(), row.getRowNo(), row.getRawData(), row.getNormalizedData(),
                row.getCorrectedData(), row.getRowStatus(), row.getErrorCode(), row.getErrorMessage(),
                row.getRetryCount(), draftCreated, row.getVersion(), row.getUpdatedAt());
    }
}
