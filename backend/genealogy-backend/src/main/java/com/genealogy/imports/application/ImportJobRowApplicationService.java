package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobRowResponse;
import com.genealogy.imports.dto.PersonImportRowRetryRequest;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobErrorEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class ImportJobRowApplicationService {

    private static final Set<String> FAILED_STATUSES = Set.of(
            ImportJobRowEntity.STATUS_INVALID,
            ImportJobRowEntity.STATUS_RETRY_FAILED
    );
    private static final Set<String> QUERYABLE_STATUSES = Set.of(
            ImportJobRowEntity.STATUS_INVALID,
            ImportJobRowEntity.STATUS_RETRY_FAILED,
            ImportJobRowEntity.STATUS_DRAFT_CREATED,
            ImportJobRowEntity.STATUS_EXCLUDED
    );
    private static final Set<String> GENDERS = Set.of("male", "female", "unknown");

    private final ImportJobRepository importJobRepository;
    private final ImportJobRowRepository importJobRowRepository;
    private final ImportJobErrorRepository importJobErrorRepository;
    private final PersonRepository personRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public ImportJobRowApplicationService(
            ImportJobRepository importJobRepository,
            ImportJobRowRepository importJobRowRepository,
            ImportJobErrorRepository importJobErrorRepository,
            PersonRepository personRepository,
            AuthorizationApplicationService authorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.importJobRepository = importJobRepository;
        this.importJobRowRepository = importJobRowRepository;
        this.importJobErrorRepository = importJobErrorRepository;
        this.personRepository = personRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    @Transactional(readOnly = true)
    public PageResponse<ImportJobRowResponse> listRows(
            Long clanId,
            Long jobId,
            String status,
            int pageNo,
            int pageSize,
            Long actorId
    ) {
        ImportJobEntity job = requireJob(clanId, jobId, actorId);
        PageRequest pageRequest = PageRequest.of(
                Math.max(0, pageNo - 1),
                pageSize,
                Sort.by(Sort.Direction.ASC, "rowNo")
        );
        Page<ImportJobRowEntity> page;
        String normalizedStatus = normalize(status);
        if (normalizedStatus == null || "failed".equals(normalizedStatus)) {
            page = importJobRowRepository.findByJobIdAndRowStatusInOrderByRowNoAsc(job.getId(), FAILED_STATUSES, pageRequest);
        } else if ("all".equals(normalizedStatus)) {
            page = importJobRowRepository.findByJobIdOrderByRowNoAsc(job.getId(), pageRequest);
        } else {
            if (!QUERYABLE_STATUSES.contains(normalizedStatus)) {
                throw new BusinessException("IMPORT_ROW_STATUS_INVALID", "导入行状态不合法");
            }
            page = importJobRowRepository.findByJobIdAndRowStatusOrderByRowNoAsc(job.getId(), normalizedStatus, pageRequest);
        }
        return PageResponse.of(
                page.getContent().stream().map(this::toResponse).toList(),
                page.getTotalElements(),
                pageNo,
                pageSize
        );
    }

    @Transactional
    public ImportJobRowResponse retryPersonRow(
            Long clanId,
            Long jobId,
            Long rowId,
            PersonImportRowRetryRequest request,
            Long actorId
    ) {
        ImportJobEntity job = requireJob(clanId, jobId, actorId);
        ensureJobEditable(job);
        ImportJobRowEntity row = importJobRowRepository.findByIdAndJobId(rowId, jobId)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_ROW_NOT_FOUND", "导入失败行不存在"));
        ensureRowRetryable(row, request.expectedVersion());

        LocalDateTime now = LocalDateTime.now();
        row.setCorrectedData(correctionData(request));
        row.setCorrectedBy(actorId);
        row.setCorrectedAt(now);
        row.setRetryCount(value(row.getRetryCount()) + 1);
        row.setUpdatedAt(now);

        try {
            PersonEntity person = buildDraftPerson(job, request, actorId, now);
            ensureDuplicateConfirmed(job, person, Boolean.TRUE.equals(request.confirmDuplicates()));
            PersonEntity savedPerson = personRepository.save(person);
            row.setDraftPersonId(savedPerson.getId());
            row.setRowStatus(ImportJobRowEntity.STATUS_DRAFT_CREATED);
            row.setErrorCode(null);
            row.setErrorMessage(null);
            ImportJobRowEntity savedRow = importJobRowRepository.saveAndFlush(row);
            importJobErrorRepository.deleteByJobIdAndRowNo(jobId, row.getRowNo());
            recalculateJob(job);
            operationLogApplicationService.record(
                    clanId,
                    actorId,
                    "import_row_retry_success",
                    "import_job",
                    jobId,
                    "导入失败行修正成功",
                    "rowNo=" + row.getRowNo() + ", retryCount=" + row.getRetryCount()
            );
            return toResponse(savedRow);
        } catch (BusinessException exception) {
            row.setRowStatus(ImportJobRowEntity.STATUS_RETRY_FAILED);
            row.setErrorCode(exception.getCode());
            row.setErrorMessage(exception.getMessage());
            ImportJobRowEntity savedRow = importJobRowRepository.saveAndFlush(row);
            synchronizeCompatibilityError(jobId, row, now);
            recalculateJob(job);
            operationLogApplicationService.record(
                    clanId,
                    actorId,
                    "import_row_retry_failed",
                    "import_job",
                    jobId,
                    "导入失败行修正后仍未通过",
                    "rowNo=" + row.getRowNo() + ", errorCode=" + exception.getCode()
            );
            return toResponse(savedRow);
        }
    }

    private ImportJobEntity requireJob(Long clanId, Long jobId, Long actorId) {
        authorizationApplicationService.requireClanMember(clanId, actorId);
        ImportJobEntity job = importJobRepository.findByIdAndClanId(jobId, clanId)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_NOT_FOUND", "导入任务不存在"));
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, job.getBranchId());
        return job;
    }

    private void ensureJobEditable(ImportJobEntity job) {
        String reviewStatus = normalize(job.getReviewStatus());
        if (!ImportJobEntity.REVIEW_NOT_SUBMITTED.equals(reviewStatus)
                && !ImportJobEntity.REVIEW_REJECTED.equals(reviewStatus)) {
            throw new BusinessException("IMPORT_JOB_REVIEW_LOCKED", "导入批次已进入审核流程，不能继续修正");
        }
        if (!ImportJobEntity.PROCESSING_CORRECTION_REQUIRED.equals(job.getProcessingStatus())) {
            throw new BusinessException("IMPORT_JOB_NOT_CORRECTABLE", "导入批次当前不需要修正");
        }
    }

    private void ensureRowRetryable(ImportJobRowEntity row, Long expectedVersion) {
        if (!FAILED_STATUSES.contains(row.getRowStatus()) || row.getDraftPersonId() != null) {
            throw new BusinessException("IMPORT_JOB_ROW_NOT_RETRYABLE", "该行已经处理成功或不能再次重试");
        }
        if (!Objects.equals(row.getVersion(), expectedVersion)) {
            throw new BusinessException("IMPORT_JOB_ROW_VERSION_CONFLICT", "该行已被其他用户修改，请刷新后重试");
        }
    }

    private Map<String, Object> correctionData(PersonImportRowRetryRequest request) {
        Map<String, Object> data = new LinkedHashMap<>();
        String gender = normalize(request.gender());
        data.put("name", trim(request.name()));
        data.put("gender", gender == null ? "unknown" : gender);
        data.put("generationNo", request.generationNo());
        data.put("generationWord", trim(request.generationWord()));
        data.put("birthDate", trim(request.birthDate()));
        data.put("isLiving", request.isLiving() == null || request.isLiving());
        return data;
    }

    private PersonEntity buildDraftPerson(
            ImportJobEntity job,
            PersonImportRowRetryRequest request,
            Long actorId,
            LocalDateTime now
    ) {
        String name = trim(request.name());
        if (name == null) {
            throw new BusinessException("IMPORT_PERSON_NAME_REQUIRED", "姓名不能为空");
        }
        String gender = normalizeGender(request.gender());
        LocalDate birthDate = parseDate(request.birthDate());
        PersonEntity person = new PersonEntity();
        person.setClanId(job.getClanId());
        person.setBranchId(job.getBranchId());
        person.setName(name);
        person.setGender(gender);
        person.setGenerationNo(request.generationNo());
        person.setGenerationWord(defaultString(request.generationWord()));
        person.setBirthDate(birthDate);
        person.setIsLiving(request.isLiving() == null || request.isLiving());
        person.setPrivacyLevel("clan_only");
        person.setDataStatus("draft");
        person.setLineageStatus("normal");
        person.setHasDescendant(false);
        person.setCreatedBy(actorId);
        person.setUpdatedBy(actorId);
        person.setCreatedAt(now);
        person.setUpdatedAt(now);
        return person;
    }

    private void ensureDuplicateConfirmed(ImportJobEntity job, PersonEntity person, boolean confirmed) {
        Specification<PersonEntity> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("clanId"), job.getClanId()));
            predicates.add(criteriaBuilder.isNull(root.get("deletedAt")));
            predicates.add(criteriaBuilder.equal(criteriaBuilder.lower(root.get("name")), person.getName().toLowerCase(Locale.ROOT)));
            predicates.add(criteriaBuilder.equal(root.get("branchId"), job.getBranchId()));
            if (person.getGenerationNo() != null) {
                predicates.add(criteriaBuilder.equal(root.get("generationNo"), person.getGenerationNo()));
            }
            if (person.getGenerationWord() != null && !person.getGenerationWord().isBlank()) {
                predicates.add(criteriaBuilder.equal(root.get("generationWord"), person.getGenerationWord()));
            }
            if (person.getBirthDate() != null) {
                predicates.add(criteriaBuilder.equal(root.get("birthDate"), person.getBirthDate()));
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
        if (personRepository.count(specification) > 0 && !confirmed) {
            throw new BusinessException("IMPORT_DUPLICATE_CONFIRM_REQUIRED", "修正后的人物疑似重复，请确认后再重试");
        }
    }

    private void synchronizeCompatibilityError(Long jobId, ImportJobRowEntity row, LocalDateTime now) {
        ImportJobErrorEntity error = importJobErrorRepository.findFirstByJobIdAndRowNo(jobId, row.getRowNo())
                .orElseGet(ImportJobErrorEntity::new);
        error.setJobId(jobId);
        error.setRowNo(row.getRowNo());
        error.setErrorMessage(row.getErrorMessage());
        error.setRawData(row.getRawData());
        if (error.getCreatedAt() == null) {
            error.setCreatedAt(now);
        }
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
        job.setErrorSummary(failure == 0 ? null : "存在 " + failure + " 行导入失败，请修正后再提交审核");
        if (ImportJobEntity.REVIEW_REJECTED.equals(job.getReviewStatus())) {
            job.setReviewStatus(ImportJobEntity.REVIEW_NOT_SUBMITTED);
            job.setLatestReviewTaskId(null);
        }
        job.setUpdatedAt(LocalDateTime.now());
        importJobRepository.save(job);
    }

    private ImportJobRowResponse toResponse(ImportJobRowEntity entity) {
        return new ImportJobRowResponse(
                entity.getId(),
                entity.getRowNo(),
                entity.getRawData(),
                entity.getNormalizedData(),
                entity.getCorrectedData(),
                entity.getRowStatus(),
                entity.getErrorCode(),
                entity.getErrorMessage(),
                entity.getRetryCount(),
                entity.getDraftPersonId() != null,
                entity.getVersion(),
                entity.getUpdatedAt()
        );
    }

    private String normalizeGender(String value) {
        String gender = normalize(value);
        if (gender == null) {
            return "unknown";
        }
        if (!GENDERS.contains(gender)) {
            throw new BusinessException("IMPORT_GENDER_INVALID", "性别必须是 male、female 或 unknown");
        }
        return gender;
    }

    private LocalDate parseDate(String value) {
        String normalized = trim(value);
        if (normalized == null) {
            return null;
        }
        try {
            return LocalDate.parse(normalized);
        } catch (RuntimeException exception) {
            throw new BusinessException("IMPORT_DATE_INVALID", "出生日期格式必须是 yyyy-MM-dd");
        }
    }

    private int toInteger(long value) {
        if (value > Integer.MAX_VALUE) {
            throw new BusinessException("IMPORT_COUNT_OVERFLOW", "导入行数量超出系统支持范围");
        }
        return (int) value;
    }

    private int value(Integer value) {
        return value == null ? 0 : value;
    }

    private String normalize(String value) {
        String trimmed = trim(value);
        return trimmed == null ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private String trim(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String defaultString(String value) {
        String trimmed = trim(value);
        return trimmed == null ? "" : trimmed;
    }
}
