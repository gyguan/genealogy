package com.genealogy.member.application;

import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.member.domain.MemberGrantPolicyService;
import com.genealogy.member.domain.MemberGrantPolicyService.ActorScope;
import com.genealogy.member.dto.MemberPermissionAuditResponse;
import com.genealogy.member.entity.ClanMembershipEntity;
import com.genealogy.member.entity.MemberRoleEntity;
import com.genealogy.member.entity.RoleEntity;
import com.genealogy.member.repository.ClanMembershipRepository;
import com.genealogy.member.repository.MemberRoleRepository;
import com.genealogy.member.repository.RoleRepository;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MemberPermissionAuditApplicationService {

    private static final String TARGET_MEMBERSHIP = "clan_membership";
    private static final String TARGET_GRANT = "member_role";
    private static final Set<String> ACTION_TYPES = Set.of(
            "member_grant_create",
            "member_grant_update",
            "member_grant_revoke",
            "member_status_update"
    );

    private final OperationLogRepository operationLogRepository;
    private final ClanMembershipRepository clanMembershipRepository;
    private final MemberRoleRepository memberRoleRepository;
    private final RoleRepository roleRepository;
    private final AppUserRepository appUserRepository;
    private final MemberGrantPolicyService memberGrantPolicyService;

    public MemberPermissionAuditApplicationService(
            OperationLogRepository operationLogRepository,
            ClanMembershipRepository clanMembershipRepository,
            MemberRoleRepository memberRoleRepository,
            RoleRepository roleRepository,
            AppUserRepository appUserRepository,
            MemberGrantPolicyService memberGrantPolicyService
    ) {
        this.operationLogRepository = operationLogRepository;
        this.clanMembershipRepository = clanMembershipRepository;
        this.memberRoleRepository = memberRoleRepository;
        this.roleRepository = roleRepository;
        this.appUserRepository = appUserRepository;
        this.memberGrantPolicyService = memberGrantPolicyService;
    }

    @Transactional(readOnly = true)
    public PageResponse<MemberPermissionAuditResponse> search(
            Long clanId,
            Long actorId,
            Long membershipId,
            Long grantId,
            Long filterActorId,
            String actionType,
            LocalDateTime startTime,
            LocalDateTime endTime,
            int pageNo,
            int pageSize
    ) {
        if (startTime != null && endTime != null && startTime.isAfter(endTime)) {
            throw new BusinessException("MEMBER_PERMISSION_AUDIT_TIME_INVALID", "开始时间不能晚于结束时间");
        }
        String normalizedAction = normalizeAction(actionType);
        ActorScope actorScope = memberGrantPolicyService.actorScope(clanId, actorId);
        AuditTargetFilter targetFilter = resolveTargetFilter(clanId, actorScope, membershipId, grantId);

        int normalizedPageNo = Math.max(1, pageNo);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, 100));
        PageRequest pageable = PageRequest.of(
                normalizedPageNo - 1,
                normalizedPageSize,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))
        );
        Page<OperationLogEntity> page = operationLogRepository.findAll(
                buildSpecification(clanId, filterActorId, normalizedAction, startTime, endTime, targetFilter),
                pageable
        );
        List<MemberPermissionAuditResponse> records = toResponses(clanId, page.getContent());
        return PageResponse.of(records, page.getTotalElements(), normalizedPageNo, normalizedPageSize);
    }

    private AuditTargetFilter resolveTargetFilter(
            Long clanId,
            ActorScope actorScope,
            Long membershipId,
            Long grantId
    ) {
        if (grantId != null) {
            MemberRoleEntity grant = memberRoleRepository.findById(grantId)
                    .orElseThrow(() -> new BusinessException("MEMBER_GRANT_NOT_FOUND", "成员授权不存在"));
            ClanMembershipEntity membership = requireMembershipInClan(clanId, grant.getMembershipId());
            RoleEntity role = roleRepository.findById(grant.getRoleId())
                    .orElseThrow(() -> new BusinessException("ROLE_NOT_FOUND", "成员角色不存在"));
            if (membershipId != null && !membershipId.equals(membership.getId())) {
                throw new BusinessException("MEMBER_GRANT_NOT_FOUND", "成员授权不属于指定成员");
            }
            if (!memberGrantPolicyService.canViewGrant(
                    actorScope,
                    grant.getScopeType(),
                    grant.getScopeId()
            )) {
                throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限查看该成员授权记录");
            }
            return new AuditTargetFilter(membership.getId(), Set.of(grantId), false, false);
        }

        if (membershipId != null) {
            requireMembershipInClan(clanId, membershipId);
            List<MemberRoleEntity> grants = memberRoleRepository.findByMembershipIdIn(List.of(membershipId));
            if (actorScope.fullClanAccess()) {
                return new AuditTargetFilter(
                        membershipId,
                        grants.stream().map(MemberRoleEntity::getId).collect(Collectors.toUnmodifiableSet()),
                        true,
                        false
                );
            }
            Set<Long> visibleGrantIds = grants.stream()
                    .filter(grant -> memberGrantPolicyService.canViewGrant(
                            actorScope,
                            grant.getScopeType(),
                            grant.getScopeId()
                    ))
                    .map(MemberRoleEntity::getId)
                    .collect(Collectors.toUnmodifiableSet());
            if (visibleGrantIds.isEmpty()) {
                throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限查看该成员授权记录");
            }
            return new AuditTargetFilter(membershipId, visibleGrantIds, false, false);
        }

        if (!actorScope.fullClanAccess()) {
            throw new BusinessException("AUTH_FORBIDDEN", "支派范围用户必须指定可见成员后查询权限记录");
        }
        return new AuditTargetFilter(null, Set.of(), true, true);
    }

    private ClanMembershipEntity requireMembershipInClan(Long clanId, Long membershipId) {
        return clanMembershipRepository.findById(membershipId)
                .filter(membership -> clanId.equals(membership.getClanId()))
                .orElseThrow(() -> new BusinessException("MEMBER_NOT_FOUND", "宗族成员不存在"));
    }

    private Specification<OperationLogEntity> buildSpecification(
            Long clanId,
            Long filterActorId,
            String actionType,
            LocalDateTime startTime,
            LocalDateTime endTime,
            AuditTargetFilter targetFilter
    ) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("clanId"), clanId));
            predicates.add(root.get("actionType").in(ACTION_TYPES));
            if (filterActorId != null) {
                predicates.add(criteriaBuilder.equal(root.get("actorId"), filterActorId));
            }
            if (actionType != null) {
                predicates.add(criteriaBuilder.equal(root.get("actionType"), actionType));
            }
            if (startTime != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), startTime));
            }
            if (endTime != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), endTime));
            }
            predicates.add(targetPredicate(criteriaBuilder, root.get("targetType"), root.get("targetId"), targetFilter));
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Predicate targetPredicate(
            jakarta.persistence.criteria.CriteriaBuilder criteriaBuilder,
            jakarta.persistence.criteria.Path<Object> targetType,
            jakarta.persistence.criteria.Path<Object> targetId,
            AuditTargetFilter filter
    ) {
        if (filter.unrestricted()) {
            return targetType.in(List.of(TARGET_MEMBERSHIP, TARGET_GRANT));
        }
        List<Predicate> targets = new ArrayList<>();
        if (filter.includeMembershipLogs() && filter.membershipId() != null) {
            targets.add(criteriaBuilder.and(
                    criteriaBuilder.equal(targetType, TARGET_MEMBERSHIP),
                    criteriaBuilder.equal(targetId, filter.membershipId())
            ));
        }
        if (!filter.grantIds().isEmpty()) {
            targets.add(criteriaBuilder.and(
                    criteriaBuilder.equal(targetType, TARGET_GRANT),
                    targetId.in(filter.grantIds())
            ));
        }
        return targets.size() == 1
                ? targets.get(0)
                : criteriaBuilder.or(targets.toArray(new Predicate[0]));
    }

    private List<MemberPermissionAuditResponse> toResponses(Long clanId, List<OperationLogEntity> logs) {
        if (logs.isEmpty()) {
            return List.of();
        }
        Set<Long> grantIds = logs.stream()
                .filter(log -> TARGET_GRANT.equals(log.getTargetType()))
                .map(OperationLogEntity::getTargetId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<Long, MemberRoleEntity> grants = memberRoleRepository.findAllById(grantIds).stream()
                .collect(Collectors.toMap(MemberRoleEntity::getId, Function.identity()));

        Set<Long> membershipIds = logs.stream()
                .filter(log -> TARGET_MEMBERSHIP.equals(log.getTargetType()))
                .map(OperationLogEntity::getTargetId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        grants.values().stream().map(MemberRoleEntity::getMembershipId).forEach(membershipIds::add);
        Map<Long, ClanMembershipEntity> memberships = clanMembershipRepository.findAllById(membershipIds).stream()
                .filter(membership -> clanId.equals(membership.getClanId()))
                .collect(Collectors.toMap(ClanMembershipEntity::getId, Function.identity()));

        Set<Long> userIds = memberships.values().stream()
                .map(ClanMembershipEntity::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        logs.stream().map(OperationLogEntity::getActorId).filter(Objects::nonNull).forEach(userIds::add);
        Map<Long, AppUserEntity> users = appUserRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(AppUserEntity::getId, Function.identity()));

        return logs.stream().map(log -> {
            MemberRoleEntity grant = TARGET_GRANT.equals(log.getTargetType()) ? grants.get(log.getTargetId()) : null;
            Long resolvedMembershipId = TARGET_MEMBERSHIP.equals(log.getTargetType())
                    ? log.getTargetId()
                    : grant == null ? null : grant.getMembershipId();
            ClanMembershipEntity membership = memberships.get(resolvedMembershipId);
            AppUserEntity targetUser = membership == null ? null : users.get(membership.getUserId());
            AppUserEntity actor = users.get(log.getActorId());
            ParsedDetail detail = parseDetail(log.getDetail());
            return new MemberPermissionAuditResponse(
                    log.getId(),
                    log.getActorId(),
                    displayName(actor, "未知操作者"),
                    maskAccount(actor == null ? null : actor.getUsername()),
                    log.getActionType(),
                    resolvedMembershipId,
                    grant == null ? null : grant.getId(),
                    displayName(targetUser, "未知成员"),
                    maskAccount(targetUser == null ? null : targetUser.getUsername()),
                    detail.beforeValue(),
                    detail.afterValue(),
                    detail.reason(),
                    log.getCreatedAt()
            );
        }).toList();
    }

    private String normalizeAction(String actionType) {
        if (actionType == null || actionType.isBlank()) {
            return null;
        }
        String normalized = actionType.trim().toLowerCase(Locale.ROOT);
        if (!ACTION_TYPES.contains(normalized)) {
            throw new BusinessException("MEMBER_PERMISSION_AUDIT_ACTION_INVALID", "权限变更动作类型不正确");
        }
        return normalized;
    }

    private ParsedDetail parseDetail(String detail) {
        if (detail == null || !detail.startsWith("before=")) {
            return new ParsedDetail(null, null, null);
        }
        int afterIndex = detail.indexOf("; after=");
        int reasonIndex = detail.indexOf("; reason=", afterIndex < 0 ? 0 : afterIndex + 8);
        if (afterIndex < 0 || reasonIndex < 0) {
            return new ParsedDetail(null, null, null);
        }
        return new ParsedDetail(
                emptyToNull(detail.substring("before=".length(), afterIndex)),
                emptyToNull(detail.substring(afterIndex + "; after=".length(), reasonIndex)),
                emptyToNull(detail.substring(reasonIndex + "; reason=".length()))
        );
    }

    private String displayName(AppUserEntity user, String fallback) {
        if (user == null || user.getDisplayName() == null || user.getDisplayName().isBlank()) {
            return fallback;
        }
        return user.getDisplayName().trim();
    }

    private String maskAccount(String username) {
        if (username == null || username.isBlank()) {
            return "***";
        }
        String normalized = username.trim();
        if (normalized.length() <= 2) {
            return normalized.charAt(0) + "***";
        }
        return normalized.substring(0, 2) + "***";
    }

    private String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record AuditTargetFilter(
            Long membershipId,
            Set<Long> grantIds,
            boolean includeMembershipLogs,
            boolean unrestricted
    ) {
    }

    private record ParsedDetail(String beforeValue, String afterValue, String reason) {
    }
}
