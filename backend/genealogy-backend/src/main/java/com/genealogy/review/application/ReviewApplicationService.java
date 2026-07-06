package com.genealogy.review.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.dto.ReviewDecisionRequest;
import com.genealogy.review.dto.ReviewDiffResponse;
import com.genealogy.review.dto.ReviewSubmitRequest;
import com.genealogy.review.dto.ReviewTaskResponse;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;

@Service
public class ReviewApplicationService {

    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";
    private static final String CHANGE_MODIFIED = "modified";

    private final RevisionRepository revisionRepository;
    private final ReviewTaskRepository reviewTaskRepository;
    private final RevisionApplyService revisionApplyService;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;
    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final SourceRepository sourceRepository;
    private final SourceBindingRepository sourceBindingRepository;
    private final ObjectMapper objectMapper;

    public ReviewApplicationService(
            RevisionRepository revisionRepository,
            ReviewTaskRepository reviewTaskRepository,
            RevisionApplyService revisionApplyService,
            AuthorizationApplicationService authorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService,
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            SourceRepository sourceRepository,
            SourceBindingRepository sourceBindingRepository,
            ObjectMapper objectMapper
    ) {
        this.revisionRepository = revisionRepository;
        this.reviewTaskRepository = reviewTaskRepository;
        this.revisionApplyService = revisionApplyService;
        this.authorizationApplicationService = authorizationApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.sourceRepository = sourceRepository;
        this.sourceBindingRepository = sourceBindingRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ReviewTaskResponse submit(Long clanId, ReviewSubmitRequest request, Long actorId) {
        authorizationApplicationService.requireClanMember(clanId, actorId);
        TargetSnapshot snapshot = loadTarget(clanId, request.targetType(), request.targetId());
        RevisionEntity revision = new RevisionEntity();
        revision.setClanId(clanId);
        revision.setTargetType(snapshot.targetType());
        revision.setTargetId(snapshot.targetId());
        revision.setChangeType(normalizeOrDefault(request.changeType(), CHANGE_MODIFIED));
        revision.setBeforeData(toJson(snapshot.beforeData()));
        revision.setAfterData(toJson(snapshot.afterData()));
        revision.setDiffSummary(hasText(request.comment()) ? request.comment().trim() : snapshot.summary());
        revision.setSubmitterId(actorId);
        revision.setSubmitTime(LocalDateTime.now());
        revision.setStatus(STATUS_PENDING);
        revision = revisionRepository.save(revision);

        ReviewTaskEntity task = new ReviewTaskEntity();
        task.setClanId(clanId);
        task.setRevisionId(revision.getId());
        task.setReviewLevel(1);
        task.setReviewerRole("reviewer");
        task.setBranchId(snapshot.branchId());
        task.setStatus(STATUS_PENDING);
        task.setReviewComment(request.comment());
        task.setCreatedAt(LocalDateTime.now());
        task = reviewTaskRepository.save(task);

        operationLogApplicationService.record(clanId, actorId, "review_submit", "review_task", task.getId(), "提交审核：" + snapshot.title(), revision.getDiffSummary());
        return toResponse(task, revision);
    }

    @Transactional(readOnly = true)
    public List<ReviewTaskResponse> pending(Long clanId, Long actorId) {
        authorizationApplicationService.requireClanMember(clanId, actorId);
        return reviewTaskRepository.findByClanIdAndStatusOrderByCreatedAtDesc(clanId, STATUS_PENDING)
                .stream()
                .map(task -> toResponse(task, requireRevision(task.getRevisionId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public ReviewDiffResponse diff(Long taskId, Long actorId) {
        ReviewTaskEntity task = requireTask(taskId);
        authorizationApplicationService.requireClanMember(task.getClanId(), actorId);
        RevisionEntity revision = requireRevision(task.getRevisionId());
        return toDiffResponse(task, revision);
    }

    @Transactional
    public ReviewTaskResponse approve(Long taskId, ReviewDecisionRequest request, Long actorId) {
        ReviewTaskEntity task = requireTask(taskId);
        authorizationApplicationService.requireAnyRole(task.getClanId(), actorId,
                AuthorizationApplicationService.ROLE_CLAN_ADMIN,
                AuthorizationApplicationService.ROLE_REVIEWER
        );
        if (!STATUS_PENDING.equals(task.getStatus())) {
            throw new BusinessException("REVIEW_TASK_NOT_PENDING", "只有待审核任务可以通过");
        }
        RevisionEntity revision = requireRevision(task.getRevisionId());
        revisionApplyService.apply(revision, actorId);
        revision.setStatus(STATUS_APPROVED);
        revision.setApprovedAt(LocalDateTime.now());
        revision.setRejectedReason(null);
        revisionRepository.save(revision);

        task.setStatus(STATUS_APPROVED);
        task.setReviewerId(actorId);
        task.setReviewComment(comment(request));
        task.setReviewedAt(LocalDateTime.now());
        task = reviewTaskRepository.save(task);

        operationLogApplicationService.record(task.getClanId(), actorId, "review_approve", "review_task", task.getId(), "审核通过：" + targetTitle(revision), comment(request));
        return toResponse(task, revision);
    }

    @Transactional
    public ReviewTaskResponse reject(Long taskId, ReviewDecisionRequest request, Long actorId) {
        ReviewTaskEntity task = requireTask(taskId);
        authorizationApplicationService.requireAnyRole(task.getClanId(), actorId,
                AuthorizationApplicationService.ROLE_CLAN_ADMIN,
                AuthorizationApplicationService.ROLE_REVIEWER
        );
        if (!STATUS_PENDING.equals(task.getStatus())) {
            throw new BusinessException("REVIEW_TASK_NOT_PENDING", "只有待审核任务可以驳回");
        }
        RevisionEntity revision = requireRevision(task.getRevisionId());
        revision.setStatus(STATUS_REJECTED);
        revision.setRejectedReason(comment(request));
        revisionRepository.save(revision);

        task.setStatus(STATUS_REJECTED);
        task.setReviewerId(actorId);
        task.setReviewComment(comment(request));
        task.setReviewedAt(LocalDateTime.now());
        task = reviewTaskRepository.save(task);

        operationLogApplicationService.record(task.getClanId(), actorId, "review_reject", "review_task", task.getId(), "审核驳回：" + targetTitle(revision), comment(request));
        return toResponse(task, revision);
    }

    private TargetSnapshot loadTarget(Long clanId, String rawTargetType, Long targetId) {
        String targetType = normalizeOrDefault(rawTargetType, "person");
        if ("person".equals(targetType)) {
            PersonEntity person = personRepository.findByIdAndDeletedAtIsNull(targetId)
                    .filter(item -> clanId.equals(item.getClanId()))
                    .orElseThrow(() -> new BusinessException("PERSON_NOT_FOUND", "人物不存在或不属于当前宗族"));
            ObjectNode after = valueTree(person);
            after.put("dataStatus", "official");
            return new TargetSnapshot("person", targetId, person.getBranchId(), person.getName(), "人物入谱审核：" + person.getName(), valueTree(person), after);
        }
        if ("relationship".equals(targetType)) {
            RelationshipEntity relationship = relationshipRepository.findById(targetId)
                    .filter(item -> clanId.equals(item.getClanId()))
                    .filter(item -> item.getDeletedAt() == null)
                    .orElseThrow(() -> new BusinessException("RELATIONSHIP_NOT_FOUND", "亲属关系不存在或不属于当前宗族"));
            ObjectNode after = valueTree(relationship);
            after.put("dataStatus", "official");
            return new TargetSnapshot("relationship", targetId, null, "亲属关系", "亲属关系审核", valueTree(relationship), after);
        }
        if ("source".equals(targetType)) {
            SourceEntity source = sourceRepository.findById(targetId)
                    .filter(item -> clanId.equals(item.getClanId()))
                    .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "来源资料不存在或不属于当前宗族"));
            ObjectNode after = valueTree(source);
            after.put("verificationStatus", "verified");
            return new TargetSnapshot("source", targetId, null, source.getSourceName(), "来源资料审核：" + source.getSourceName(), valueTree(source), after);
        }
        if ("source_binding".equals(targetType)) {
            SourceBindingEntity binding = sourceBindingRepository.findById(targetId)
                    .filter(item -> clanId.equals(item.getClanId()))
                    .orElseThrow(() -> new BusinessException("SOURCE_BINDING_NOT_FOUND", "来源绑定不存在或不属于当前宗族"));
            return new TargetSnapshot("source_binding", targetId, null, "来源绑定", "来源绑定审核", valueTree(binding), valueTree(binding));
        }
        throw new BusinessException("REVIEW_TARGET_UNSUPPORTED", "暂不支持该对象类型提交审核");
    }

    private ReviewTaskResponse toResponse(ReviewTaskEntity task, RevisionEntity revision) {
        return new ReviewTaskResponse(
                task.getId(), task.getClanId(), task.getRevisionId(), targetTitle(revision), revision.getTargetType(), revision.getTargetId(), revision.getChangeType(),
                task.getStatus(), revision.getSubmitterId(), task.getReviewerId(), task.getReviewerRole(), task.getBranchId(), task.getReviewComment(), revision.getDiffSummary(),
                task.getCreatedAt(), task.getReviewedAt()
        );
    }

    private ReviewDiffResponse toDiffResponse(ReviewTaskEntity task, RevisionEntity revision) {
        return new ReviewDiffResponse(
                task.getId(), revision.getId(), revision.getClanId(), revision.getTargetType(), revision.getTargetId(), revision.getChangeType(), revision.getDiffSummary(),
                fieldDiffs(revision.getBeforeData(), revision.getAfterData())
        );
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

    private ReviewTaskEntity requireTask(Long taskId) {
        return reviewTaskRepository.findById(taskId)
                .orElseThrow(() -> new BusinessException("REVIEW_TASK_NOT_FOUND", "审核任务不存在"));
    }

    private RevisionEntity requireRevision(Long revisionId) {
        return revisionRepository.findById(revisionId)
                .orElseThrow(() -> new BusinessException("REVISION_NOT_FOUND", "修订记录不存在"));
    }

    private ObjectNode valueTree(Object value) {
        return objectMapper.valueToTree(value);
    }

    private String toJson(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException error) {
            throw new BusinessException("REVIEW_JSON_SERIALIZE_FAILED", "审核数据序列化失败");
        }
    }

    private JsonNode readTree(String json) {
        try {
            if (json == null || json.isBlank()) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(json);
        } catch (JsonProcessingException error) {
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

    private String targetTitle(RevisionEntity revision) {
        JsonNode after = readTree(revision.getAfterData());
        Iterator<Map.Entry<String, JsonNode>> fields = after.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            if ("name".equals(field.getKey()) || "sourceName".equals(field.getKey()) || "relationLabel".equals(field.getKey())) {
                return field.getValue().asText();
            }
        }
        return revision.getTargetType() + "#" + revision.getTargetId();
    }

    private String comment(ReviewDecisionRequest request) {
        return request == null || request.comment() == null ? null : request.comment().trim();
    }

    private String normalizeOrDefault(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value.trim().toLowerCase();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record TargetSnapshot(
            String targetType,
            Long targetId,
            Long branchId,
            String title,
            String summary,
            JsonNode beforeData,
            JsonNode afterData
    ) {
    }
}
