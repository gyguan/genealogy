package com.genealogy.operationlog.application;

import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.dto.RiskAuditEventResponse;
import com.genealogy.operationlog.dto.RiskAuditStatsResponse;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
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
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("clanId"), clanId));
            predicates.add(criteriaBuilder.isNotNull(root.get("riskEventType")));
            if (!effectiveScope.fullClanAccess()) {
                predicates.add(root.get("branchId").in(effectiveScope.queryVisibleBranchIds()));
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
            if (branchId != null) {
                predicates.add(criteriaBuilder.equal(root.get("branchId"), branchId));
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
