package com.genealogy.review.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.generation.repository.GenWordRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationTraceContext;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.dto.AuditRecordResponse;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.dto.PersonSubmitReviewRequest;
import com.genealogy.review.dto.ReviewDecisionRequest;
import com.genealogy.review.dto.ReviewDiffResponse;
import com.genealogy.review.dto.ReviewSubmitRequest;
import com.genealogy.review.dto.ReviewTaskDetailResponse;
import com.genealogy.review.dto.TargetSubmitRequest;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ApprovalApplicationService {

    private static final String TARGET_PERSON = "person";
    private static final String TARGET_RELATIONSHIP = "relationship";
    private static final String TARGET_SOURCE = "source";
    private static final String TARGET_BRANCH = "branch";
    private static final String TARGET_GENERATION_SCHEME = "generation_scheme";
    private static final String CHANGE_SUBMIT_REVIEW = "submit_review";
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";
    private static final String OBJECT_STATUS_DRAFT = "draft";
    private static final String OBJECT_STATUS_PENDING_REVIEW = "pending_review";
    private static final String OBJECT_STATUS_OFFICIAL = "official";
    private static final String OBJECT_STATUS_ARCHIVED = "archived";

    private static final String REVIEW_VIEW = "review_task:view";
    private static final String REVIEW_APPROVE = "review_task:approve";
    private static final String REVIEW_REJECT = "review_task:reject";
    private static final String PERSON_SUBMIT_REVIEW = "person:submit_review";
    private static final String RELATIONSHIP_SUBMIT_REVIEW = "relationship:submit_review";
    private static final String SOURCE_UPDATE = "source:update";
    private static final String BRANCH_UPDATE = "branch:update";

    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final SourceRepository sourceRepository;
    private final BranchRepository branchRepository;
    private final GenSchemeRepository genSchemeRepository;
    private final GenWordRepository genWordRepository;
    private final AuditRecordRepository auditRecordRepository;
    private final CheckTaskRepository checkTaskRepository;
    private final OperationLogApplicationService operationLogApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final RevisionApplyService revisionApplyService;
    private final ObjectMapper objectMapper;

    public ApprovalApplicationService(
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            SourceRepository sourceRepository,
            BranchRepository branchRepository,
            GenSchemeRepository genSchemeRepository,
            GenWordRepository genWordRepository,
            AuditRecordRepository auditRecordRepository,
            CheckTaskRepository checkTaskRepository,
            OperationLogApplicationService operationLogApplicationService,
            AuthorizationApplicationService authorizationApplicationService,
            RevisionApplyService revisionApplyService,
            ObjectMapper objectMapper
    ) {
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.sourceRepository = sourceRepository;
        this.branchRepository = branchRepository;
        this.genSchemeRepository = genSchemeRepository;
        this.genWordRepository = genWordRepository;
        this.auditRecordRepository = auditRecordRepository;
        this.checkTaskRepository = checkTaskRepository;
        this.operationLogApplicationService = operationLogApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
        this.revisionApplyService = revisionApplyService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CheckTaskResponse submitPerson(Long personId, PersonSubmitReviewRequest request) {
        PersonEntity person = getPerson(personId);
        authorizationApplicationService.requireBranchPermission(person.getClanId(), request.submitterId(), person.getBranchId(), PERSON_SUBMIT_REVIEW);
        ensureReviewSubmitAllowed(TARGET_PERSON, personId, person.getDataStatus());
        String beforePayload = toJson(person);
        LocalDateTime now = LocalDateTime.now();
        person.setDataStatus(OBJECT_STATUS_PENDING_REVIEW);
        person.setUpdatedAt(now);
        String afterPayload = toJson(person);
        CheckTaskResponse response = submitTarget(person.getClanId(), TARGET_PERSON, personId, person.getBranchId(), request.submitterId(), request.diffSummary(), "submit person review: " + person.getName(), beforePayload, afterPayload);
        personRepository.save(person);
        return response;
    }

    @Transactional
    public CheckTaskResponse submitRelationship(Long relationshipId, TargetSubmitRequest request) {
        RelationshipEntity relationship = relationshipRepository.findById(relationshipId)
                .filter(entity -> entity.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.RELATIONSHIP_NOT_FOUND));
        Long branchId = relationshipBranchId(relationship);
        authorizationApplicationService.requireBranchPermission(relationship.getClanId(), request.submitterId(), branchId, RELATIONSHIP_SUBMIT_REVIEW);
        ensureReviewSubmitAllowed(TARGET_RELATIONSHIP, relationshipId, relationship.getDataStatus());
        String beforePayload = toJson(relationship);
        relationship.setDataStatus(OBJECT_STATUS_PENDING_REVIEW);
        relationship.setUpdatedAt(LocalDateTime.now());
        String afterPayload = toJson(relationship);
        CheckTaskResponse response = submitTarget(relationship.getClanId(), TARGET_RELATIONSHIP, relationshipId, branchId, request.submitterId(), request.diffSummary(), "submit relationship review", beforePayload, afterPayload);
        relationshipRepository.save(relationship);
        return response;
    }

    @Transactional
    public CheckTaskResponse submitSource(Long sourceId, TargetSubmitRequest request) {
        SourceEntity source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "source not found"));
        authorizationApplicationService.requirePermission(source.getClanId(), request.submitterId(), SOURCE_UPDATE);
        ensureReviewSubmitAllowed(TARGET_SOURCE, sourceId, source.getVerificationStatus());
        String beforePayload = toJson(source);
        source.setVerificationStatus(OBJECT_STATUS_PENDING_REVIEW);
        String afterPayload = toJson(source);
        CheckTaskResponse response = submitTarget(source.getClanId(), TARGET_SOURCE, sourceId, null, request.submitterId(), request.diffSummary(), "submit source review: " + source.getSourceName(), beforePayload, afterPayload);
        sourceRepository.save(source);
        return response;
    }

    @Transactional
    public CheckTaskResponse submitBranch(Long branchId, TargetSubmitRequest request) {
        BranchEntity branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new BusinessException(ErrorCode.BRANCH_NOT_FOUND));
        authorizationApplicationService.requireBranchPermission(branch.getClanId(), request.submitterId(), branch.getId(), BRANCH_UPDATE);
        ensureReviewSubmitAllowed(TARGET_BRANCH, branchId, branch.getStatus());
        String beforePayload = toJson(branch);
        branch.setStatus(OBJECT_STATUS_PENDING_REVIEW);
        branch.setUpdatedAt(LocalDateTime.now());
        String afterPayload = toJson(branch);
        CheckTaskResponse response = submitTarget(branch.getClanId(), TARGET_BRANCH, branchId, branchId, request.submitterId(), request.diffSummary(), "submit branch review: " + branch.getBranchName(), beforePayload, afterPayload);
        branchRepository.save(branch);
        return response;
    }

    @Transactional
    public CheckTaskResponse submitGenerationScheme(Long schemeId, TargetSubmitRequest request) {
        GenerationSchemeEntity scheme = genSchemeRepository.findById(schemeId)
                .orElseThrow(() -> new BusinessException("GENERATION_SCHEME_NOT_FOUND", "generation scheme not found"));
        authorizationApplicationService.requireBranchPermission(scheme.getClanId(), request.submitterId(), scheme.getBranchId(), BRANCH_UPDATE);
        ensureReviewSubmitAllowed(TARGET_GENERATION_SCHEME, schemeId, scheme.getStatus());
        List<?> words = genWordRepository.findBySchemeIdOrderByGenerationNoAsc(schemeId);
        if (words.isEmpty()) {
            throw new BusinessException("GENERATION_SCHEME_WORD_EMPTY", "请先维护至少一条字辈明细，再提交字辈方案审核");
        }
        String beforePayload = generationSchemeReviewPayload(scheme, words);
        scheme.setStatus(OBJECT_STATUS_PENDING_REVIEW);
        String afterPayload = generationSchemeReviewPayload(scheme, words);
        CheckTaskResponse response = submitTarget(scheme.getClanId(), TARGET_GENERATION_SCHEME, schemeId, scheme.getBranchId(), request.submitterId(), request.diffSummary(), "submit generation scheme review: " + scheme.getSchemeName(), beforePayload, afterPayload);
        genSchemeRepository.save(scheme);
        return response;
    }

    @Transactional
    public CheckTaskResponse submitGeneric(Long clanId, ReviewSubmitRequest request, Long submitterId) {
        TargetSubmitRequest targetRequest = new TargetSubmitRequest(submitterId, request.comment());
        return switch (normalize(request.targetType())) {
            case TARGET_PERSON -> submitPerson(request.targetId(), new PersonSubmitReviewRequest(submitterId, request.comment()));
            case TARGET_RELATIONSHIP -> submitRelationship(request.targetId(), targetRequest);
            case TARGET_SOURCE -> submitSource(request.targetId(), targetRequest);
            case TARGET_BRANCH -> submitBranch(request.targetId(), targetRequest);
            case TARGET_GENERATION_SCHEME -> submitGenerationScheme(request.targetId(), targetRequest);
            default -> throw new BusinessException("REVIEW_TARGET_UNSUPPORTED", "暂不支持该对象类型提交审核");
        };
    }

    private CheckTaskResponse submitTarget(Long clanId, String targetType, Long targetId, Long branchId, Long submitterId, String diffSummary, String logSummary, String beforePayload, String afterPayload) {
        if (auditRecordRepository.existsByTargetTypeAndTargetIdAndStatus(targetType, targetId, STATUS_PENDING)) {
            throw new BusinessException("REVIEW_ALREADY_PENDING", "target already has pending review task");
        }
        LocalDateTime now = LocalDateTime.now();
        AuditRecordEntity record = new AuditRecordEntity();
        record.setClanId(clanId);
        record.setTargetType(targetType);
        record.setTargetId(targetId);
        record.setChangeType(CHANGE_SUBMIT_REVIEW);
        record.setOldPayload(beforePayload);
        record.setNewPayload(afterPayload);
        record.setDiffSummary(trimToNull(diffSummary));
        record.setSubmitterId(submitterId);
        record.setSubmitTime(now);
        record.setStatus(STATUS_PENDING);
        AuditRecordEntity savedRecord = auditRecordRepository.save(record);

        CheckTaskEntity task = new CheckTaskEntity();
        task.setClanId(clanId);
        task.setRevisionId(savedRecord.getId());
        task.setTraceId(savedRecord.getTraceId());
        task.setReviewLevel(1);
        task.setReviewerRole("clan_admin");
        task.setBranchId(branchId);
        task.setStatus(STATUS_PENDING);
        task.setCreatedAt(now);
        CheckTaskEntity savedTask = checkTaskRepository.save(task);
        operationLogApplicationService.record(
                clanId, submitterId, "review_submit", targetType, targetId, logSummary, diffSummary,
                trace(savedRecord, savedTask, "submitted")
        );
        return toTaskResponse(savedTask, savedRecord);
    }

    @Transactional(readOnly = true)
    public List<CheckTaskResponse> listPending(Long clanId) {
        List<CheckTaskEntity> tasks = checkTaskRepository.findByClanIdAndStatus(clanId, STATUS_PENDING);
        Map<Long, AuditRecordEntity> records = auditRecordRepository.findAllById(
                        tasks.stream().map(CheckTaskEntity::getRevisionId).toList()
                ).stream()
                .collect(Collectors.toMap(AuditRecordEntity::getId, Function.identity()));
        return tasks.stream()
                .map(task -> toTaskResponse(task, records.get(task.getRevisionId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CheckTaskResponse> listPending(Long clanId, Long actorId) {
        authorizationApplicationService.requirePermission(clanId, actorId, REVIEW_VIEW);
        return listPending(clanId);
    }

    @Transactional(readOnly = true)
    public CheckTaskResponse getTask(Long taskId) {
        CheckTaskEntity task = getActiveTask(taskId);
        return toTaskResponse(task, getRecord(task.getRevisionId()));
    }

    @Transactional(readOnly = true)
    public ReviewTaskDetailResponse getTaskDetail(Long taskId) {
        CheckTaskEntity task = getActiveTask(taskId);
        AuditRecordEntity record = getRecord(task.getRevisionId());
        return new ReviewTaskDetailResponse(toTaskResponse(task, record), toRecordResponse(record));
    }

    @Transactional(readOnly = true)
    public ReviewTaskDetailResponse getTaskDetail(Long taskId, Long actorId) {
        CheckTaskEntity task = getActiveTask(taskId);
        authorizationApplicationService.requirePermission(task.getClanId(), actorId, REVIEW_VIEW);
        AuditRecordEntity record = getRecord(task.getRevisionId());
        return new ReviewTaskDetailResponse(toTaskResponse(task, record), toRecordResponse(record));
    }

    @Transactional(readOnly = true)
    public ReviewDiffResponse diff(Long taskId, Long actorId) {
        CheckTaskEntity task = getActiveTask(taskId);
        authorizationApplicationService.requirePermission(task.getClanId(), actorId, REVIEW_VIEW);
        AuditRecordEntity record = getRecord(task.getRevisionId());
        return new ReviewDiffResponse(task.getId(), record.getId(), record.getClanId(), record.getTargetType(), record.getTargetId(), record.getChangeType(), record.getDiffSummary(), fieldDiffs(record.getOldPayload(), record.getNewPayload()));
    }

    @Transactional(readOnly = true)
    public List<AuditRecordResponse> listPersonRecords(Long personId) {
        return auditRecordRepository.findByTargetTypeAndTargetIdOrderBySubmitTimeDesc(TARGET_PERSON, personId).stream().map(this::toRecordResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AuditRecordResponse> listPersonRecords(Long personId, Long actorId) {
        PersonEntity person = getPerson(personId);
        authorizationApplicationService.requireBranchPermission(person.getClanId(), actorId, person.getBranchId(), REVIEW_VIEW);
        return listPersonRecords(personId);
    }

    @Transactional(readOnly = true)
    public List<AuditRecordResponse> listMySubmissions(Long actorId, Long clanId) {
        if (clanId == null) {
            return auditRecordRepository.findBySubmitterIdOrderBySubmitTimeDesc(actorId).stream()
                    .map(this::toRecordResponse)
                    .toList();
        }
        return auditRecordRepository.findByClanIdAndSubmitterIdOrderBySubmitTimeDesc(clanId, actorId).stream()
                .map(this::toRecordResponse)
                .toList();
    }

    @Transactional
    public CheckTaskResponse approve(Long taskId, ReviewDecisionRequest request) {
        CheckTaskEntity task = getActiveTask(taskId);
        ensurePending(task);
        AuditRecordEntity record = getRecord(task.getRevisionId());
        authorizationApplicationService.requirePermission(record.getClanId(), request.reviewerId(), REVIEW_APPROVE);
        LocalDateTime now = LocalDateTime.now();
        record.setStatus(STATUS_APPROVED);
        record.setApprovedAt(now);
        auditRecordRepository.save(record);
        task.setStatus(STATUS_APPROVED);
        task.setReviewerId(request.reviewerId());
        task.setReviewComment(trimToNull(request.comment()));
        task.setReviewedAt(now);
        CheckTaskEntity savedTask = checkTaskRepository.save(task);
        revisionApplyService.apply(record, now);
        operationLogApplicationService.record(
                record.getClanId(), request.reviewerId(), "revision_apply", record.getTargetType(), record.getTargetId(),
                "apply approved revision", record.getDiffSummary(), trace(record, savedTask, "applied")
        );
        operationLogApplicationService.record(
                record.getClanId(), request.reviewerId(), "review_approve", record.getTargetType(), record.getTargetId(),
                "approve review", request.comment(), trace(record, savedTask, "approved")
        );
        return toTaskResponse(savedTask, record);
    }

    @Transactional
    public CheckTaskResponse reject(Long taskId, ReviewDecisionRequest request) {
        CheckTaskEntity task = getActiveTask(taskId);
        ensurePending(task);
        AuditRecordEntity record = getRecord(task.getRevisionId());
        authorizationApplicationService.requirePermission(record.getClanId(), request.reviewerId(), REVIEW_REJECT);
        LocalDateTime now = LocalDateTime.now();
        String comment = trimToNull(request.comment());
        record.setStatus(STATUS_REJECTED);
        record.setRejectedReason(comment);
        auditRecordRepository.save(record);
        task.setStatus(STATUS_REJECTED);
        task.setReviewerId(request.reviewerId());
        task.setReviewComment(comment);
        task.setReviewedAt(now);
        CheckTaskEntity savedTask = checkTaskRepository.save(task);
        revisionApplyService.reject(record, now);
        operationLogApplicationService.record(
                record.getClanId(), request.reviewerId(), "review_reject", record.getTargetType(), record.getTargetId(),
                "reject review", comment, trace(record, savedTask, "rejected")
        );
        return toTaskResponse(savedTask, record);
    }

    private void ensureReviewSubmitAllowed(String targetType, Long targetId, String status) {
        String normalized = normalize(status);
        if (OBJECT_STATUS_DRAFT.equals(normalized) || STATUS_REJECTED.equals(normalized)) {
            return;
        }
        if (OBJECT_STATUS_PENDING_REVIEW.equals(normalized) || STATUS_PENDING.equals(normalized)) {
            throw new BusinessException("REVIEW_TARGET_ALREADY_PENDING", "对象已处于待审核状态，不能重复提交审核");
        }
        if (OBJECT_STATUS_OFFICIAL.equals(normalized)) {
            throw new BusinessException("REVIEW_TARGET_ALREADY_OFFICIAL", "对象已是正式数据，不能通过新增审核重复提交");
        }
        if (OBJECT_STATUS_ARCHIVED.equals(normalized)) {
            throw new BusinessException("REVIEW_TARGET_ARCHIVED", "对象已归档，不能提交审核");
        }
        throw new BusinessException("REVIEW_TARGET_STATUS_NOT_SUBMITTABLE", "对象当前状态不允许提交审核: " + targetType + "#" + targetId + " status=" + (status == null ? "null" : status));
    }

    private Long relationshipBranchId(RelationshipEntity relationship) {
        PersonEntity from = getPerson(relationship.getFromPersonId());
        return from.getBranchId();
    }

    private PersonEntity getPerson(Long personId) {
        return personRepository.findByIdAndDeletedAtIsNull(personId).orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
    }

    private CheckTaskEntity getActiveTask(Long taskId) {
        return checkTaskRepository.findById(taskId).orElseThrow(() -> new BusinessException(ErrorCode.REVIEW_TASK_NOT_FOUND));
    }

    private AuditRecordEntity getRecord(Long recordId) {
        return auditRecordRepository.findById(recordId).orElseThrow(() -> new BusinessException("REVIEW_RECORD_NOT_FOUND", "review record not found"));
    }

    private void ensurePending(CheckTaskEntity task) {
        if (!STATUS_PENDING.equals(task.getStatus())) {
            throw new BusinessException("REVIEW_TASK_ALREADY_HANDLED", "review task already handled");
        }
    }

    private CheckTaskResponse toTaskResponse(CheckTaskEntity task, AuditRecordEntity record) {
        return new CheckTaskResponse(
                task.getId(),
                task.getClanId(),
                task.getRevisionId(),
                task.getReviewLevel(),
                task.getReviewerId(),
                task.getReviewerRole(),
                task.getBranchId(),
                task.getStatus(),
                task.getReviewComment(),
                task.getReviewedAt(),
                task.getCreatedAt(),
                record == null ? null : record.getTargetType(),
                record == null ? null : record.getTargetId(),
                reviewTitle(record),
                record == null ? null : record.getDiffSummary(),
                record == null ? null : record.getSubmitterId(),
                record == null ? null : record.getSubmitTime(),
                record == null ? task.getTraceId() : record.getTraceId()
        );
    }

    private String reviewTitle(AuditRecordEntity record) {
        if (record == null) {
            return "审核任务";
        }
        return switch (normalize(record.getTargetType())) {
            case "person" -> "人物变更审核";
            case "relationship" -> "关系变更审核";
            case "source" -> "来源资料审核";
            case "source_binding" -> "来源绑定审核";
            case "branch" -> "支派变更审核";
            case "generation_scheme" -> "字辈方案审核";
            case "import_job" -> "导入批次审核";
            default -> "业务变更审核";
        };
    }

    private AuditRecordResponse toRecordResponse(AuditRecordEntity record) {
        return new AuditRecordResponse(
                record.getId(), record.getClanId(), record.getTargetType(), record.getTargetId(), record.getChangeType(),
                record.getOldPayload(), record.getNewPayload(), record.getDiffSummary(), record.getSubmitterId(),
                record.getSubmitTime(), record.getStatus(), record.getApprovedAt(), record.getRejectedReason(), record.getTraceId()
        );
    }

    private OperationTraceContext trace(AuditRecordEntity revision, CheckTaskEntity task, String result) {
        return OperationTraceContext.of(
                revision.getTraceId(), revision.getId(), task == null ? null : task.getId(),
                revision.getTargetType(), revision.getTargetId(), result
        );
    }

    private String generationSchemeReviewPayload(GenerationSchemeEntity scheme, List<?> words) {
        return toJson(Map.of("scheme", scheme, "words", words));
    }

    private List<ReviewDiffResponse.FieldDiff> fieldDiffs(String beforeData, String afterData) {
        JsonNode before = readTree(beforeData);
        JsonNode after = readTree(afterData);
        TreeSet<String> fields = new TreeSet<>();
        before.fieldNames().forEachRemaining(fields::add);
        after.fieldNames().forEachRemaining(fields::add);
        List<ReviewDiffResponse.FieldDiff> diffs = new ArrayList<>();
        for (String field : fields) {
            JsonNode beforeValue = before.get(field);
            JsonNode afterValue = after.get(field);
            if (!Objects.equals(beforeValue, afterValue)) {
                String changeType = beforeValue == null ? "added" : afterValue == null ? "removed" : "modified";
                diffs.add(new ReviewDiffResponse.FieldDiff(field, nodeText(beforeValue), nodeText(afterValue), changeType));
            }
        }
        return diffs;
    }

    private JsonNode readTree(String json) {
        try {
            if (json == null || json.isBlank()) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(json);
        } catch (JsonProcessingException ignored) {
            return objectMapper.createObjectNode();
        }
    }

    private String nodeText(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isValueNode()) {
            return node.asText();
        }
        return node.toString();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            try {
                return objectMapper.writeValueAsString(Map.of("snapshotError", ex.getMessage()));
            } catch (JsonProcessingException ignored) {
                return "{}";
            }
        }
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
