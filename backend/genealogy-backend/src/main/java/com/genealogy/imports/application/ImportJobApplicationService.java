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
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
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
        Specification<ImportJobEntity> specification = jobSpecification(clanId, branchId, status, filter);
        PageRequest pageRequest = PageRequest.of(
                Math.max(0, pageNo - 1),
                pageSize,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))
        );
        Page<ImportJobEntity> page = importJobRepository.findAll(specification, pageRequest);
        return PageResponse.of(
                page.getContent().stream().map(this::toSummary).toList(),
                page.getTotalElements(),
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

    private Specification<ImportJobEntity> jobSpecification(
            Long clanId,
            Long branchId,
            String status,
            ImportJobDescriptor filter
    ) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("clanId"), clanId));
            if (branchId != null) {
                predicates.add(criteriaBuilder.equal(root.get("branchId"), branchId));
            }
            if (!isBlank(status)) {
                predicates.add(criteriaBuilder.equal(root.get("status"), status.trim().toLowerCase()));
            }
            if (filter.hasImportType()) {
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.equal(root.get("importType"), filter.importType()),
                        criteriaBuilder.equal(root.get("importType"), filter.importType() + "_csv"),
                        criteriaBuilder.equal(root.get("importType"), filter.importType() + "_xlsx")
                ));
            }
            if (filter.hasFileFormat()) {
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.equal(root.get("fileFormat"), filter.fileFormat()),
                        criteriaBuilder.and(
                                criteriaBuilder.isNull(root.get("fileFormat")),
                                criteriaBuilder.like(root.get("importType"), "%_" + filter.fileFormat())
                        )
                ));
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
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
                job.getLatestReviewTaskId()
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

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
