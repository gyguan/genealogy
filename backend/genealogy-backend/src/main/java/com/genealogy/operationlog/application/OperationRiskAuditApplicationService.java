package com.genealogy.operationlog.application;

import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import com.genealogy.operationlog.dto.RiskAuditEventResponse;
import com.genealogy.operationlog.dto.RiskAuditStatsResponse;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.source.entity.SourceAttachmentEntity;
import com.genealogy.source.entity.SourceBindingEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class OperationRiskAuditApplicationService {

    private static final Set<String> LEVELS = Set.of("low", "medium", "high", "critical");
    private static final Set<String> EVENT_TYPES = Set.of(
            "permission_change", "sensitive_access", "bulk_export",
            "formal_data_change", "review_anomaly", "access_denied"
    );
    private static final Set<String> DISPOSITIONS = Set.of("open", "reviewing", "resolved", "accepted");

    private final OperationLogRepository operationLogRepository;
    private final EntityManager entityManager;

    public OperationRiskAuditApplicationService(
            OperationLogRepository operationLogRepository,
            EntityManager entityManager
    ) {
        this.operationLogRepository = operationLogRepository;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public PageResponse<RiskAuditEventResponse> search(
            Long clanId,
            Long actorId,
            String riskLevel,
            String eventType,
            Long branchId,
            String dispositionStatus,
            LocalDateTime startTime,
            LocalDateTime endTime,
            int pageNo,
            int pageSize,
            boolean includeTechnicalFields,
            PermissionDataScope scope
    ) {
        int normalizedPageNo = Math.max(1, pageNo);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, 100));
        Specification<OperationLogEntity> specification = specification(
                clanId, actorId, riskLevel, eventType, branchId, dispositionStatus, startTime, endTime, scope
        );
        PageRequest pageRequest = PageRequest.of(
                normalizedPageNo - 1,
                normalizedPageSize,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))
        );
        Page<OperationLogEntity> page = operationLogRepository.findAll(specification, pageRequest);
        return PageResponse.of(
                page.map(entity -> toResponse(entity, includeTechnicalFields)).getContent(),
                page.getTotalElements(),
                normalizedPageNo,
                normalizedPageSize
        );
    }

    @Transactional(readOnly = true)
    public RiskAuditStatsResponse stats(
            Long clanId,
            Long actorId,
            String riskLevel,
            String eventType,
            Long branchId,
            String dispositionStatus,
            LocalDateTime startTime,
            LocalDateTime endTime,
            PermissionDataScope scope
    ) {
        Specification<OperationLogEntity> specification = specification(
                clanId, actorId, riskLevel, eventType, branchId, dispositionStatus, startTime, endTime, scope
        );
        return new RiskAuditStatsResponse(
                operationLogRepository.count(specification),
                group(specification, "riskLevel"),
                group(specification, "riskEventType"),
                group(specification, "dispositionStatus")
        );
    }

    private Specification<OperationLogEntity> specification(
            Long clanId,
            Long actorId,
            String riskLevel,
            String eventType,
            Long branchId,
            String dispositionStatus,
            LocalDateTime startTime,
            LocalDateTime endTime,
            PermissionDataScope scope
    ) {
        String normalizedLevel = validated(riskLevel, LEVELS, "OPERATION_RISK_LEVEL_INVALID", "风险等级不正确");
        String normalizedEventType = validated(eventType, EVENT_TYPES, "OPERATION_RISK_EVENT_INVALID", "风险事件类型不正确");
        String normalizedDisposition = validated(
                dispositionStatus, DISPOSITIONS, "OPERATION_RISK_DISPOSITION_INVALID", "风险处置状态不正确"
        );
        PermissionDataScope effectiveScope = scope == null ? PermissionDataScope.none() : scope;
        if (branchId != null && !effectiveScope.canAccessBranch(branchId)) {
            throw new BusinessException("AUTH_FORBIDDEN", "当前账号无权查看该支派的风险事件");
        }
        Set<Long> constrainedBranchIds = branchId == null
                ? effectiveScope.visibleBranchIds()
                : Set.of(branchId);
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("clanId"), clanId));
            predicates.add(criteriaBuilder.isNotNull(root.get("riskEventType")));
            if (branchId != null || !effectiveScope.fullClanAccess()) {
                predicates.add(branchVisibilityPredicate(
                        root,
                        query,
                        criteriaBuilder,
                        clanId,
                        constrainedBranchIds
                ));
            }
            if (actorId != null) {
                predicates.add(criteriaBuilder.equal(root.get("actorId"), actorId));
            }
            if (normalizedLevel != null) {
                predicates.add(criteriaBuilder.equal(root.get("riskLevel"), normalizedLevel));
            }
            if (normalizedEventType != null) {
                predicates.add(criteriaBuilder.equal(root.get("riskEventType"), normalizedEventType));
            }
            if (normalizedDisposition != null) {
                predicates.add(criteriaBuilder.equal(root.get("dispositionStatus"), normalizedDisposition));
            }
            if (startTime != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), startTime));
            }
            if (endTime != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), endTime));
            }
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Predicate branchVisibilityPredicate(
            Root<OperationLogEntity> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder,
            Long clanId,
            Set<Long> branchIds
    ) {
        if (branchIds == null || branchIds.isEmpty()) {
            return criteriaBuilder.disjunction();
        }

        Subquery<Long> personIds = query.subquery(Long.class);
        Root<PersonEntity> person = personIds.from(PersonEntity.class);
        personIds.select(person.get("id")).where(
                criteriaBuilder.equal(person.get("clanId"), clanId),
                person.get("branchId").in(branchIds)
        );

        Subquery<Long> relationshipIds = query.subquery(Long.class);
        Root<RelationshipEntity> relationship = relationshipIds.from(RelationshipEntity.class);
        relationshipIds.select(relationship.get("id")).where(
                criteriaBuilder.equal(relationship.get("clanId"), clanId),
                criteriaBuilder.or(
                        relationship.get("successorBranchId").in(branchIds),
                        relationship.get("fromPersonId").in(personIds),
                        relationship.get("toPersonId").in(personIds)
                )
        );

        Subquery<Long> reviewTaskIds = query.subquery(Long.class);
        Root<ReviewTaskEntity> reviewTask = reviewTaskIds.from(ReviewTaskEntity.class);
        reviewTaskIds.select(reviewTask.get("id")).where(
                criteriaBuilder.equal(reviewTask.get("clanId"), clanId),
                reviewTask.get("branchId").in(branchIds)
        );

        Subquery<Long> memberRoleIds = query.subquery(Long.class);
        Root<MemberRoleEntity> memberRole = memberRoleIds.from(MemberRoleEntity.class);
        memberRoleIds.select(memberRole.get("id")).where(
                memberRole.get("scopeType").in(MemberRoleScopeType.branch, MemberRoleScopeType.branch_subtree),
                memberRole.get("scopeId").in(branchIds)
        );

        Subquery<Long> sourceIds = query.subquery(Long.class);
        Root<SourceBindingEntity> sourceBinding = sourceIds.from(SourceBindingEntity.class);
        sourceIds.select(sourceBinding.get("sourceId")).distinct(true).where(
                criteriaBuilder.equal(sourceBinding.get("clanId"), clanId),
                criteriaBuilder.or(
                        criteriaBuilder.and(
                                criteriaBuilder.equal(sourceBinding.get("targetType"), "branch"),
                                sourceBinding.get("targetId").in(branchIds)
                        ),
                        criteriaBuilder.and(
                                criteriaBuilder.equal(sourceBinding.get("targetType"), "person"),
                                sourceBinding.get("targetId").in(personIds)
                        ),
                        criteriaBuilder.and(
                                criteriaBuilder.equal(sourceBinding.get("targetType"), "relationship"),
                                sourceBinding.get("targetId").in(relationshipIds)
                        )
                )
        );

        Subquery<Long> attachmentIds = query.subquery(Long.class);
        Root<SourceAttachmentEntity> sourceAttachment = attachmentIds.from(SourceAttachmentEntity.class);
        attachmentIds.select(sourceAttachment.get("id")).where(
                criteriaBuilder.equal(sourceAttachment.get("clanId"), clanId),
                sourceAttachment.get("sourceId").in(sourceIds)
        );

        return criteriaBuilder.or(
                root.get("branchId").in(branchIds),
                targetMatches(root, criteriaBuilder, "branch", branchIds),
                targetMatches(root, criteriaBuilder, "person", personIds),
                targetMatches(root, criteriaBuilder, "relationship", relationshipIds),
                targetMatches(root, criteriaBuilder, "review_task", reviewTaskIds),
                targetMatches(root, criteriaBuilder, "member_role", memberRoleIds),
                targetMatches(root, criteriaBuilder, "source", sourceIds),
                targetMatches(root, criteriaBuilder, "source_attachment", attachmentIds)
        );
    }

    private Predicate targetMatches(
            Root<OperationLogEntity> root,
            CriteriaBuilder criteriaBuilder,
            String targetType,
            Set<Long> ids
    ) {
        return criteriaBuilder.or(
                criteriaBuilder.and(
                        criteriaBuilder.equal(root.get("targetType"), targetType),
                        root.get("targetId").in(ids)
                ),
                criteriaBuilder.and(
                        criteriaBuilder.equal(root.get("businessTargetType"), targetType),
                        root.get("businessTargetId").in(ids)
                )
        );
    }

    private Predicate targetMatches(
            Root<OperationLogEntity> root,
            CriteriaBuilder criteriaBuilder,
            String targetType,
            Subquery<Long> ids
    ) {
        return criteriaBuilder.or(
                criteriaBuilder.and(
                        criteriaBuilder.equal(root.get("targetType"), targetType),
                        root.get("targetId").in(ids)
                ),
                criteriaBuilder.and(
                        criteriaBuilder.equal(root.get("businessTargetType"), targetType),
                        root.get("businessTargetId").in(ids)
                )
        );
    }

    private List<RiskAuditStatsResponse.Item> group(
            Specification<OperationLogEntity> specification,
            String field
    ) {
        CriteriaBuilder criteriaBuilder = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = criteriaBuilder.createTupleQuery();
        Root<OperationLogEntity> root = query.from(OperationLogEntity.class);
        Predicate predicate = specification.toPredicate(root, query, criteriaBuilder);
        query.multiselect(
                root.get(field).alias("key"),
                criteriaBuilder.count(root).alias("count")
        );
        if (predicate != null) {
            query.where(predicate);
        }
        query.groupBy(root.get(field));
        query.orderBy(criteriaBuilder.desc(criteriaBuilder.count(root)));
        return entityManager.createQuery(query).getResultList().stream()
                .map(tuple -> new RiskAuditStatsResponse.Item(
                        tuple.get("key", String.class),
                        tuple.get("count", Long.class)
                ))
                .toList();
    }

    private RiskAuditEventResponse toResponse(OperationLogEntity entity, boolean includeTechnicalFields) {
        String trackingTargetType = entity.getBusinessTargetType() == null
                ? entity.getTargetType()
                : entity.getBusinessTargetType();
        Long trackingTargetId = entity.getBusinessTargetId() == null
                ? entity.getTargetId()
                : entity.getBusinessTargetId();
        return new RiskAuditEventResponse(
                entity.getId(),
                entity.getClanId(),
                entity.getActorId(),
                null,
                entity.getActionType(),
                entity.getRiskLevel(),
                entity.getRiskEventType(),
                entity.getDispositionStatus(),
                entity.getBranchId(),
                entity.getTargetType(),
                entity.getTargetId(),
                null,
                null,
                null,
                entity.getEventResult(),
                entity.getSummary(),
                includeTechnicalFields ? entity.getDetail() : null,
                includeTechnicalFields ? entity.getRequestId() : null,
                includeTechnicalFields ? entity.getClientIp() : null,
                entity.getCreatedAt(),
                entity.getTraceId(),
                entity.getRevisionId(),
                entity.getReviewTaskId(),
                trackingTargetType,
                trackingTargetId,
                includeTechnicalFields
        );
    }

    private String validated(String value, Set<String> allowed, String code, String message) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (!allowed.contains(normalized)) {
            throw new BusinessException(code, message);
        }
        return normalized;
    }
}
