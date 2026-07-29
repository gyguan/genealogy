package com.genealogy.imports.application;

import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.dto.ImportRowErrorResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobErrorEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ImportJobLifecycleService {

    private static final String LEGACY_STATUS_RUNNING = "running";
    private static final String LEGACY_STATUS_COMPLETED = "completed";
    private static final String LEGACY_STATUS_PARTIAL_COMPLETED = "partial_completed";
    private static final String LEGACY_STATUS_FAILED = "failed";

    private final ImportJobRepository jobRepository;
    private final ImportJobErrorRepository errorRepository;

    public ImportJobLifecycleService(
            ImportJobRepository jobRepository,
            ImportJobErrorRepository errorRepository
    ) {
        this.jobRepository = jobRepository;
        this.errorRepository = errorRepository;
    }

    @Transactional
    public ImportJobEntity start(
            Long clanId,
            Long branchId,
            String filename,
            String importType,
            Long actorId
    ) {
        LocalDateTime now = LocalDateTime.now();
        ImportJobEntity job = new ImportJobEntity();
        job.setClanId(clanId);
        job.setBranchId(branchId);
        job.setImportType(importType);
        job.setOriginalFilename(filename);
        job.setStatus(LEGACY_STATUS_RUNNING);
        job.setProcessingStatus(ImportJobEntity.PROCESSING_PROCESSING);
        job.setReviewStatus(ImportJobEntity.REVIEW_NOT_SUBMITTED);
        job.setReviewRound(0);
        job.setTotalCount(0);
        job.setSuccessCount(0);
        job.setFailureCount(0);
        job.setCreatedBy(actorId);
        job.setCreatedAt(now);
        job.setUpdatedAt(now);
        return jobRepository.save(job);
    }

    @Transactional
    public ImportJobResponse complete(Long jobId, ImportBatchSummary summary) {
        ImportJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalStateException("import job not found: " + jobId));
        job.setTotalCount(summary.total());
        job.setSuccessCount(summary.success());
        job.setFailureCount(summary.failure());
        job.setStatus(legacyStatus(summary.success(), summary.failure()));
        job.setProcessingStatus(summary.failure() == 0
                ? ImportJobEntity.PROCESSING_READY_FOR_REVIEW
                : ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        job.setErrorSummary(summary.failure() == 0
                ? null
                : "存在 " + summary.failure() + " 行导入失败，请修正后再提交审核");
        job.setUpdatedAt(LocalDateTime.now());
        ImportJobEntity saved = jobRepository.save(job);
        return toResponse(saved, errorRepository.findByJobIdOrderByRowNoAsc(saved.getId()));
    }

    @Transactional(readOnly = true)
    public List<ImportJobResponse> list(Long clanId) {
        return jobRepository.findByClanIdOrderByCreatedAtDesc(clanId).stream()
                .map(job -> toResponse(job, errorRepository.findByJobIdOrderByRowNoAsc(job.getId())))
                .toList();
    }

    private String legacyStatus(int success, int failure) {
        if (failure == 0) return LEGACY_STATUS_COMPLETED;
        return success == 0 ? LEGACY_STATUS_FAILED : LEGACY_STATUS_PARTIAL_COMPLETED;
    }

    private ImportJobResponse toResponse(ImportJobEntity job, List<ImportJobErrorEntity> errors) {
        return new ImportJobResponse(
                job.getId(),
                job.getClanId(),
                job.getBranchId(),
                job.getImportType(),
                job.getOriginalFilename(),
                job.getTotalCount(),
                job.getSuccessCount(),
                job.getFailureCount(),
                job.getStatus(),
                job.getErrorSummary(),
                job.getCreatedAt(),
                errors.stream()
                        .map(item -> new ImportRowErrorResponse(
                                item.getRowNo(),
                                item.getErrorMessage(),
                                item.getRawData()
                        ))
                        .toList()
        );
    }

    public record ImportBatchSummary(int total, int success, int failure, int skipped) {
        public ImportBatchSummary plus(ImportBatchSummary other) {
            return new ImportBatchSummary(
                    total + other.total,
                    success + other.success,
                    failure + other.failure,
                    skipped + other.skipped
            );
        }

        public static ImportBatchSummary empty() {
            return new ImportBatchSummary(0, 0, 0, 0);
        }
    }
}
