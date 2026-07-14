package com.genealogy.imports.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobReviewSubmitRequest;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class ImportJobReviewApplicationService {

    private static final String TARGET_IMPORT_JOB = "import_job";
    private static final String CHANGE_SUBMIT_REVIEW = "submit_review";
    private static final String STATUS_PENDING = "pending";
    private static final String PERSON_SUBMIT_REVIEW = "person:submit_review";
    private static final String RELATIONSHIP_SUBMIT_REVIEW = "relationship:submit_review";
    private static final String RELATIONSHIP_TYPE_SPOUSE = "spouse";

    private final ImportJobRepository importJobRepository;
    private final ImportJobRowRepository importJobRowRepository;
    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final BranchRepository branchRepository;
    private final AuditRecordRepository auditRecordRepository;
    private final CheckTaskRepository checkTaskRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;
    private final ObjectMapper objectMapper;

    public ImportJobReviewApplicationService(
            ImportJobRepository importJobRepository,
            ImportJobRowRepository importJobRowRepository,
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            BranchRepository branchRepository,
            AuditRecordRepository auditRecordRepository,
            CheckTaskRepository checkTaskRepository,
            AuthorizationApplicationService authorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService,
            ObjectMapper objectMapper
    ) {
        this.importJobRepository = importJobRepository;
        this.importJobRowRepository = importJobRowRepository;
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.branchRepository = branchRepository;
        this.auditRecordRepository = auditRecordRepository;
        this.checkTaskRepository = checkTaskRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CheckTaskResponse submit(
            Long clanId,
            Long jobId,
            ImportJobReviewSubmitRequest request,
            Long actorId
    ) {
        ImportJobEntity job = importJobRepository.findByIdAndClanId(jobId, clanId)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_NOT_FOUND", "导入任务不存在"));
        String type = importType(job);
        String permission = ImportJobEntity.TYPE_RELATIONSHIP.equals(type)
                ? RELATIONSHIP_SUBMIT_REVIEW
                : PERSON_SUBMIT_REVIEW;
        authorizationApplicationService.requireBranchPermission(clanId, actorId, job.getBranchId(), permission);
        validateSubmittable(job);
        List<ImportJobRowEntity> draftRows = validateRows(job);
        if (auditRecordRepository.existsByTargetTypeAndTargetIdAndStatus(TARGET_IMPORT_JOB, jobId, STATUS_PENDING)) {
            throw new BusinessException("IMPORT_JOB_REVIEW_ALREADY_PENDING", "导入批次已经提交审核，不能重复提交");
        }

        LocalDateTime now = LocalDateTime.now();
        lockDraftTargets(job, draftRows, actorId, now);
        int nextRound = value(job.getReviewRound()) + 1;
        String branchName = branchName(job.getBranchId());
        String summary = reviewSummary(job, branchName, nextRound, request.comment());
        Map<String, Object> before = batchSnapshot(job, branchName, job.getReviewStatus(), value(job.getReviewRound()));
        Map<String, Object> after = batchSnapshot(job, branchName, ImportJobEntity.REVIEW_PENDING, nextRound);

        AuditRecordEntity record = new AuditRecordEntity();
        record.setClanId(clanId);
        record.setTargetType(TARGET_IMPORT_JOB);
        record.setTargetId(jobId);
        record.setChangeType(CHANGE_SUBMIT_REVIEW);
        record.setOldPayload(toJson(before));
        record.setNewPayload(toJson(after));
        record.setDiffSummary(summary);
        record.setSubmitterId(actorId);
        record.setSubmitTime(now);
        record.setStatus(STATUS_PENDING);
        AuditRecordEntity savedRecord = auditRecordRepository.save(record);

        CheckTaskEntity task = new CheckTaskEntity();
        task.setClanId(clanId);
        task.setRevisionId(savedRecord.getId());
        task.setReviewLevel(1);
        task.setReviewerRole("clan_admin");
        task.setBranchId(job.getBranchId());
        task.setStatus(STATUS_PENDING);
        task.setCreatedAt(now);
        CheckTaskEntity savedTask = checkTaskRepository.save(task);

        job.setReviewStatus(ImportJobEntity.REVIEW_PENDING);
        job.setReviewRound(nextRound);
        job.setLatestReviewTaskId(savedTask.getId());
        job.setUpdatedAt(now);
        importJobRepository.save(job);

        String title = typeTitle(type) + "导入批次审核";
        operationLogApplicationService.record(
                clanId,
                actorId,
                "import_job_review_submit",
                TARGET_IMPORT_JOB,
                jobId,
                "提交" + title,
                summary
        );
        return new CheckTaskResponse(
                savedTask.getId(), savedTask.getClanId(), savedTask.getRevisionId(), savedTask.getReviewLevel(),
                savedTask.getReviewerId(), savedTask.getReviewerRole(), savedTask.getBranchId(), savedTask.getStatus(),
                savedTask.getReviewComment(), savedTask.getReviewedAt(), savedTask.getCreatedAt(), TARGET_IMPORT_JOB,
                jobId, title, summary, actorId, now
        );
    }

    private void validateSubmittable(ImportJobEntity job) {
        if (!ImportJobEntity.PROCESSING_READY_FOR_REVIEW.equals(job.getProcessingStatus())
                || value(job.getFailureCount()) > 0) {
            throw new BusinessException("IMPORT_JOB_NOT_READY_FOR_REVIEW", "导入批次仍有待修正数据，不能提交审核");
        }
        if (!ImportJobEntity.REVIEW_NOT_SUBMITTED.equals(job.getReviewStatus())
                && !ImportJobEntity.REVIEW_REJECTED.equals(job.getReviewStatus())) {
            throw new BusinessException("IMPORT_JOB_REVIEW_STATUS_INVALID", "导入批次当前状态不能提交审核");
        }
        if (!ImportJobEntity.TYPE_PERSON.equals(importType(job))
                && !ImportJobEntity.TYPE_RELATIONSHIP.equals(importType(job))) {
            throw new BusinessException("IMPORT_JOB_TYPE_UNSUPPORTED", "当前导入类型暂不支持审核");
        }
    }

    private List<ImportJobRowEntity> validateRows(ImportJobEntity job) {
        long total = importJobRowRepository.countByJobId(job.getId());
        long draftCount = importJobRowRepository.countByJobIdAndRowStatus(job.getId(), ImportJobRowEntity.STATUS_DRAFT_CREATED);
        long excludedCount = importJobRowRepository.countByJobIdAndRowStatus(job.getId(), ImportJobRowEntity.STATUS_EXCLUDED);
        if (total == 0) {
            throw new BusinessException("IMPORT_JOB_ROW_EMPTY", "导入批次没有可审核的数据");
        }
        if (draftCount + excludedCount != total) {
            throw new BusinessException("IMPORT_JOB_ROW_NOT_READY", "导入批次仍有未完成处理的数据行");
        }
        List<ImportJobRowEntity> draftRows = importJobRowRepository.findByJobIdAndRowStatusOrderByRowNoAsc(
                job.getId(), ImportJobRowEntity.STATUS_DRAFT_CREATED
        );
        if (draftRows.isEmpty() || draftRows.stream().anyMatch(row -> targetId(row) == null)) {
            throw new BusinessException("IMPORT_JOB_DRAFT_TARGET_MISSING", "导入批次存在未关联业务草稿的数据行");
        }
        return draftRows;
    }

    private void lockDraftTargets(
            ImportJobEntity job,
            List<ImportJobRowEntity> draftRows,
            Long actorId,
            LocalDateTime now
    ) {
        if (ImportJobEntity.TYPE_RELATIONSHIP.equals(importType(job))) {
            lockDraftRelationships(job, draftRows, actorId, now);
        } else {
            lockDraftPersons(job, draftRows, now);
        }
    }

    private void lockDraftPersons(ImportJobEntity job, List<ImportJobRowEntity> draftRows, LocalDateTime now) {
        List<PersonEntity> persons = new ArrayList<>();
        for (ImportJobRowEntity row : draftRows) {
            PersonEntity person = personRepository.findByIdAndDeletedAtIsNull(targetId(row))
                    .orElseThrow(() -> new BusinessException("IMPORT_JOB_DRAFT_PERSON_NOT_FOUND", "导入批次关联的人物草稿不存在"));
            if (!Objects.equals(person.getClanId(), job.getClanId())
                    || !Objects.equals(person.getBranchId(), job.getBranchId())) {
                throw new BusinessException("IMPORT_JOB_DRAFT_PERSON_SCOPE_MISMATCH", "导入批次关联的人物草稿不属于当前宗族或支派");
            }
            requireDraftOrRejected(person.getDataStatus(), "导入批次关联的人物当前不能提交审核");
            person.setDataStatus("pending_review");
            person.setUpdatedAt(now);
            persons.add(person);
        }
        personRepository.saveAll(persons);
    }

    private void lockDraftRelationships(
            ImportJobEntity job,
            List<ImportJobRowEntity> draftRows,
            Long actorId,
            LocalDateTime now
    ) {
        List<RelationshipEntity> relationships = new ArrayList<>();
        for (ImportJobRowEntity row : draftRows) {
            RelationshipEntity relationship = relationshipRepository.findByIdAndClanIdAndDeletedAtIsNull(targetId(row), job.getClanId())
                    .orElseThrow(() -> new BusinessException("IMPORT_JOB_DRAFT_RELATIONSHIP_NOT_FOUND", "导入批次关联的关系草稿不存在"));
            requireDraftOrRejected(relationship.getDataStatus(), "导入批次关联的关系当前不能提交审核");
            PersonEntity from = personRepository.findByIdAndDeletedAtIsNull(relationship.getFromPersonId())
                    .orElseThrow(() -> new BusinessException("PERSON_NOT_FOUND", "关系主体人物不存在"));
            PersonEntity to = personRepository.findByIdAndDeletedAtIsNull(relationship.getToPersonId())
                    .orElseThrow(() -> new BusinessException("PERSON_NOT_FOUND", "关系对象人物不存在"));
            authorizationApplicationService.requireBranchPermission(job.getClanId(), actorId, from.getBranchId(), RELATIONSHIP_SUBMIT_REVIEW);
            authorizationApplicationService.requireBranchPermission(job.getClanId(), actorId, to.getBranchId(), RELATIONSHIP_SUBMIT_REVIEW);
            relationship.setDataStatus("pending_review");
            relationship.setUpdatedAt(now);
            relationships.add(relationship);
            if (RELATIONSHIP_TYPE_SPOUSE.equals(relationship.getRelationType())) {
                relationshipRepository.findActiveSameRelation(
                        job.getClanId(), relationship.getToPersonId(), relationship.getFromPersonId(), RELATIONSHIP_TYPE_SPOUSE
                ).forEach(reverse -> {
                    reverse.setDataStatus("pending_review");
                    reverse.setUpdatedAt(now);
                    relationships.add(reverse);
                });
            }
        }
        relationshipRepository.saveAll(relationships);
    }

    private void requireDraftOrRejected(String status, String message) {
        String normalized = normalize(status);
        if (!"draft".equals(normalized) && !"rejected".equals(normalized)) {
            throw new BusinessException("IMPORT_JOB_DRAFT_STATUS_INVALID", message);
        }
    }

    private Long targetId(ImportJobRowEntity row) {
        return row.getDraftTargetId() != null ? row.getDraftTargetId() : row.getDraftPersonId();
    }

    private Map<String, Object> batchSnapshot(
            ImportJobEntity job,
            String branchName,
            String reviewStatus,
            int reviewRound
    ) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("importType", importType(job));
        snapshot.put("fileName", job.getOriginalFilename());
        snapshot.put("branchName", branchName);
        snapshot.put("totalCount", value(job.getTotalCount()));
        snapshot.put("draftCount", value(job.getSuccessCount()));
        snapshot.put("excludedCount", Math.max(0, value(job.getTotalCount()) - value(job.getSuccessCount())));
        snapshot.put("processingStatus", job.getProcessingStatus());
        snapshot.put("reviewStatus", reviewStatus);
        snapshot.put("reviewRound", reviewRound);
        return snapshot;
    }

    private String reviewSummary(ImportJobEntity job, String branchName, int reviewRound, String comment) {
        String type = importType(job);
        StringBuilder summary = new StringBuilder()
                .append(typeTitle(type)).append("导入批次：")
                .append(safe(job.getOriginalFilename()))
                .append("，管理支派：").append(branchName)
                .append("，草稿：").append(value(job.getSuccessCount())).append(" 条，第 ")
                .append(reviewRound).append(" 轮审核");
        if (comment != null && !comment.isBlank()) {
            summary.append("，说明：").append(comment.trim());
        }
        return summary.toString();
    }

    private String typeTitle(String type) {
        return ImportJobEntity.TYPE_RELATIONSHIP.equals(type) ? "人物关系" : "人物";
    }

    private String branchName(Long branchId) {
        if (branchId == null) {
            return "未指定支派";
        }
        return branchRepository.findById(branchId)
                .map(branch -> safe(branch.getBranchName()))
                .orElse("未知支派");
    }

    private String toJson(Map<String, Object> snapshot) {
        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("IMPORT_JOB_REVIEW_SERIALIZE_FAILED", "导入批次审核摘要生成失败");
        }
    }

    private int value(Integer value) {
        return value == null ? 0 : value;
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "未命名" : value.trim();
    }

    private String importType(ImportJobEntity job) {
        String type = normalize(job.getImportType());
        return type.isBlank() ? ImportJobEntity.TYPE_PERSON : type;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
