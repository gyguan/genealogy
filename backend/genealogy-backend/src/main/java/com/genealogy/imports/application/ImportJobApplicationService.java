package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
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
            int pageNo,
            int pageSize,
            Long actorId
    ) {
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, branchId);
        Specification<ImportJobEntity> specification = jobSpecification(clanId, branchId, status, importType);
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
                errors
        );
    }

    private Specification<ImportJobEntity> jobSpecification(
            Long clanId,
            Long branchId,
            String status,
            String importType
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
            if (!isBlank(importType)) {
                predicates.add(criteriaBuilder.equal(root.get("importType"), importType.trim().toLowerCase()));
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private ImportJobSummaryResponse toSummary(ImportJobEntity job) {
        return new ImportJobSummaryResponse(
                job.getId(),
                job.getImportType(),
                job.getOriginalFilename(),
                job.getTotalCount(),
                job.getSuccessCount(),
                job.getFailureCount(),
                job.getStatus(),
                job.getErrorSummary(),
                job.getCreatedAt()
        );
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
