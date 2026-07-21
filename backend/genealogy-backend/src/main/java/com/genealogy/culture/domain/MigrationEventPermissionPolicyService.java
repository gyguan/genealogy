package com.genealogy.culture.domain;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.common.domain.DraftDeletePolicy;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class MigrationEventPermissionPolicyService {

    public static final String VIEW = "migration_event.view";
    public static final String CREATE = "migration_event.create";
    public static final String UPDATE = "migration_event.update";
    public static final String DELETE = "migration_event.delete";
    public static final String SUBMIT_REVIEW = "migration_event.submit_review";
    public static final String ARCHIVE = "migration_event.archive";
    public static final String VIEW_SENSITIVE = "migration_event.view_sensitive";

    private static final Set<String> RESTRICTED_PRIVACY = Set.of("relatives_only", "private", "sealed");

    private final AuthorizationApplicationService authorizationApplicationService;
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService;

    public MigrationEventPermissionPolicyService(
            AuthorizationApplicationService authorizationApplicationService,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService
    ) {
        this.authorizationApplicationService = authorizationApplicationService;
        this.rbacAuthorizationApplicationService = rbacAuthorizationApplicationService;
    }

    @Transactional(readOnly = true)
    public void requireVisible(MigrationEventEntity event, Long actorId) {
        if (event == null || event.getDeletedAt() != null) throw notFound();
        authorizationApplicationService.requireClanMember(event.getClanId(), actorId);
        if (!can(event, actorId, VIEW) || !privacyAllows(event, actorId)) throw notFound();
    }

    @Transactional(readOnly = true)
    public void requireAction(MigrationEventEntity event, Long actorId, String permissionCode) {
        requireVisible(event, actorId);
        if (!can(event, actorId, permissionCode)) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限执行该迁徙事件操作");
        }
    }

    @Transactional(readOnly = true)
    public boolean can(MigrationEventEntity event, Long actorId, String permissionCode) {
        if (event == null || actorId == null || permissionCode == null) return false;
        if (authorizationApplicationService.isCrossClanAdmin(actorId)) return true;
        return rbacAuthorizationApplicationService.hasPermission(
                actorId,
                event.getClanId(),
                permissionCode,
                MemberRoleScopeType.branch,
                event.getBranchId()
        );
    }

    @Transactional(readOnly = true)
    public boolean canCreate(Long clanId, Long branchId, Long actorId) {
        if (authorizationApplicationService.isCrossClanAdmin(actorId)) return true;
        return rbacAuthorizationApplicationService.hasPermission(
                actorId,
                clanId,
                CREATE,
                MemberRoleScopeType.branch,
                branchId
        );
    }

    @Transactional(readOnly = true)
    public boolean canViewSensitive(MigrationEventEntity event, Long actorId) {
        return Objects.equals(event.getCreatedBy(), actorId) || can(event, actorId, VIEW_SENSITIVE);
    }

    @Transactional(readOnly = true)
    public List<String> allowedActions(MigrationEventEntity event, Long actorId, boolean reviewPending) {
        requireVisible(event, actorId);
        LinkedHashSet<String> actions = new LinkedHashSet<>();
        actions.add("view");
        String status = normalize(event.getDataStatus());
        if (("draft".equals(status) || "rejected".equals(status)) && !reviewPending) {
            addIf(actions, "update", can(event, actorId, UPDATE));
            if (DraftDeletePolicy.isDraft(status)) {
                addIf(actions, "delete", can(event, actorId, DELETE));
            }
            addIf(actions, "submit_review", can(event, actorId, SUBMIT_REVIEW));
            addIf(actions, "archive", can(event, actorId, ARCHIVE));
        } else if ("official".equals(status) && !reviewPending) {
            addIf(actions, "request_update", can(event, actorId, UPDATE));
            addIf(actions, "request_delete", can(event, actorId, DELETE));
            addIf(actions, "request_archive", can(event, actorId, ARCHIVE));
        }
        addIf(actions, "view_sensitive", canViewSensitive(event, actorId));
        return List.copyOf(actions);
    }

    private boolean privacyAllows(MigrationEventEntity event, Long actorId) {
        String privacy = normalize(event.getPrivacyLevel());
        String sensitive = normalize(event.getSensitiveLevel());
        if ("sealed".equals(privacy) || "highly_sensitive".equals(sensitive)) return canViewSensitive(event, actorId);
        if (RESTRICTED_PRIVACY.contains(privacy) || "sensitive".equals(sensitive)) return canViewSensitive(event, actorId);
        return true;
    }

    private void addIf(LinkedHashSet<String> actions, String action, boolean allowed) {
        if (allowed) actions.add(action);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private BusinessException notFound() {
        return new BusinessException("MIGRATION_EVENT_NOT_FOUND", "迁徙事件不存在或不可见");
    }
}
