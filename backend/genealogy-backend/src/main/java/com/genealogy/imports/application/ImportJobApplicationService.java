package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.domain.ImportJobDescriptor;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.dto.ImportJobSummaryResponse;
import com.genealogy.imports.dto.ImportRowErrorResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.query.ImportJobQueryCriteria;
import com.genealogy.common.persistence.PageResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ImportJobApplicationService {

    private final ImportJobRepository importJobRepository;
    private final ImportJobErrorRepository importJobErrorRepository;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ImportJobApplicationService(
            ImportJobRepository importJobRepository,
            ImportJobErrorRepository importJobErrorRepository,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.importJobRepository = importJobRepository;
        this.importJobErrorRepository = importJobErrorRepository;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    /**
     * Compatibility overload for callers that do not yet provide a file-format filter.
     */
    @Transactional(readOnly = true)
    public PageResponse<ImportJobSummaryResponse> listJobs(
            Long clanId,
            Long branchId,
            String status,
            String importType,
            int pageNo,
            int pageSize,
            Long actorId
    ) {
        return listJobs(clanId, branchId, status, importType, null, pageNo, pageSize, actorId);
    }

    @Transactional(readOnly = true)
    public PageResponse<ImportJobSummaryResponse> listJobs(
            Long clanId,
            Long branchId,
            String status,
            String importType,
            String fileFormat,
            int pageNo,
            int pageSize,
            Long actorId
    ) {
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, branchId);
        ImportJobDescriptor filter = parseFilter(importType, fileFormat);
        PageResult<ImportJobEntity> page = importJobRepository.search(
                new ImportJobQueryCriteria(clanId, branchId, normalize(status), filter.importType(), filter.fileFormat()),
                Math.max(0, pageNo - 1),
                pageSize
        );
        return PageResponse.of(
                page.records().stream().map(this::toSummary).toList(),
                page.total(),
                pageNo,
                pageSize
        );
    }

    @Transactional(readOnly = true)
    public ImportJobResponse getJob(Long clanId, Long jobId, Long actorId) {
        authorizationApplicationService.requireClanMember(clanId, actorId);
        ImportJobEntity job = importJobRepository.findByIdAndClanId(jobId, clanId)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_NOT_FOUND", "导入任务不存在"));
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, job.getBranchId());
        List<ImportRowErrorResponse> errors = importJobErrorRepository.findByJobIdOrderByRowNoAsc(job.getId())
                .stream()
                .map(error -> new ImportRowErrorResponse(error.getRowNo(), error.getErrorMessage(), error.getRawData()))
                .toList();
        ImportJobDescriptor descriptor = descriptor(job);
        return new ImportJobResponse(
                job.getId(),
                job.getClanId(),
                job.getBranchId(),
                descriptor.importType(),
                descriptor.fileFormat(),
                descriptor.legacyImportType(),
                job.getOriginalFilename(),
                job.getTotalCount(),
                job.getSuccessCount(),
                job.getFailureCount(),
                job.getStatus(),
                job.getErrorSummary(),
                job.getCreatedAt(),
                errors,
                job.getProcessingStatus(),
                job.getReviewStatus(),
                job.getReviewRound(),
                job.getLatestReviewTaskId()
        );
    }

    private ImportJobSummaryResponse toSummary(ImportJobEntity job) {
        ImportJobDescriptor descriptor = descriptor(job);
        return new ImportJobSummaryResponse(
                job.getId(),
                descriptor.importType(),
                descriptor.fileFormat(),
                descriptor.legacyImportType(),
                job.getOriginalFilename(),
                job.getTotalCount(),
                job.getSuccessCount(),
                job.getFailureCount(),
                job.getStatus(),
                job.getErrorSummary(),
                job.getCreatedAt(),
                job.getProcessingStatus(),
                job.getReviewStatus(),
                job.getReviewRound(),
                job.getLatestReviewTaskId(),
                job.getExecutionMode(),
                job.getExecutionStatus(),
                job.getExecutionStage(),
                job.getProcessedCount(),
                job.getPublishedCount(),
                job.getChunkSize(),
                job.getExecutionRetryCount(),
                job.getExecutionMaxRetries(),
                job.getManualInterventionRequired(),
                job.getNextRetryAt(),
                job.getHeartbeatAt()
        );
    }

    private ImportJobDescriptor descriptor(ImportJobEntity job) {
        return ImportJobDescriptor.resolve(job.getImportType(), job.getFileFormat(), job.getOriginalFilename());
    }

    private ImportJobDescriptor parseFilter(String importType, String fileFormat) {
        try {
            return ImportJobDescriptor.fromFilter(importType, fileFormat);
        } catch (IllegalArgumentException exception) {
            throw new BusinessException("IMPORT_FILE_FORMAT_INVALID", "文件格式必须是 csv 或 xlsx");
        }
    }

    private String normalize(String value) {
        return isBlank(value) ? null : value.trim().toLowerCase();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
