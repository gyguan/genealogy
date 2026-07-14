package com.genealogy.culture.domain;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class CulturePermissionPolicyService {

    public static final String VIEW = "culture.view";
    public static final String CREATE = "culture.create";
    public static final String UPDATE = "culture.update";
    public static final String DELETE = "culture.delete";
    public static final String SUBMIT_REVIEW = "culture.submit_review";
    public static final String REVIEW = "culture.review";
    public static final String ARCHIVE = "culture.archive";
    public static final String FEATURE = "culture.feature";
    public static final String VIEW_SENSITIVE = "culture.view_sensitive";

    private static final Set<String> RESTRICTED_PRIVACY = Set.of("relatives_only", "private", "sealed");

    private final AuthorizationApplicationService authorizationApplicationService;
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService;

    public CulturePermissionPolicyService(
            AuthorizationApplicationService authorizationApplicationService,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService
    ) {
        this.authorizationApplicationService = authorizationApplicationService;
        this.rbacAuthorizationApplicationService = rbacAuthorizationApplicationService;
    }

    @Transactional(readOnly = true)
    public void requireVisible(CultureItemEntity item, Long actorId) {
        if (item == null || item.getDeletedAt() != null) {
            throw notFound();
        }
        authorizationApplicationService.requireClanMember(item.getClanId(), actorId);
        if (!can(item, actorId, VIEW) || !privacyAllows(item, actorId)) {
            throw notFound();
        }
    }

    @Transactional(readOnly = true)
    public void requireAction(CultureItemEntity item, Long actorId, String permissionCode) {
        requireVisible(item, actorId);
        if (!can(item, actorId, permissionCode)) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限执行该文化资料操作");
        }
    }

    @Transactional(readOnly = true)
    public boolean can(CultureItemEntity item, Long actorId, String permissionCode) {
        if (item == null || actorId == null || permissionCode == null) {
            return false;
        }
        if (authorizationApplicationService.isCrossClanAdmin(actorId)) {
            return true;
        }
        MemberRoleScopeType scopeType = item.getBranchId() == null
                ? MemberRoleScopeType.clan
                : MemberRoleScopeType.branch;
        Long scopeId = item.getBranchId() == null ? item.getClanId() : item.getBranchId();
        return rbacAuthorizationApplicationService.hasPermission(
                actorId,
                item.getClanId(),
                permissionCode,
                scopeType,
                scopeId
        );
    }

    @Transactional(readOnly = true)
    public boolean canViewSensitive(CultureItemEntity item, Long actorId) {
        return Objects.equals(item.getCreatedBy(), actorId) || can(item, actorId, VIEW_SENSITIVE);
    }

    @Transactional(readOnly = true)
    public List<String> allowedActions(CultureItemEntity item, Long actorId, boolean reviewPending) {
        requireVisible(item, actorId);
        LinkedHashSet<String> actions = new LinkedHashSet<>();
        actions.add("view");
        String status = normalize(item.getDataStatus());
        if (("draft".equals(status) || "rejected".equals(status)) && !reviewPending) {
            addIf(actions, "update", can(item, actorId, UPDATE));
            addIf(actions, "delete", can(item, actorId, DELETE));
            addIf(actions, "submit_review", can(item, actorId, SUBMIT_REVIEW));
            addIf(actions, "archive", can(item, actorId, ARCHIVE));
        } else if ("official".equals(status) && !reviewPending) {
            addIf(actions, "request_update", can(item, actorId, UPDATE));
            addIf(actions, "request_delete", can(item, actorId, DELETE));
            addIf(actions, "request_archive", can(item, actorId, ARCHIVE));
            addIf(actions, "request_feature", can(item, actorId, FEATURE));
        }
        addIf(actions, "view_sensitive", canViewSensitive(item, actorId));
        return List.copyOf(actions);
    }

    private boolean privacyAllows(CultureItemEntity item, Long actorId) {
        String privacy = normalize(item.getPrivacyLevel());
        String sensitive = normalize(item.getSensitiveLevel());
        if ("sealed".equals(privacy) || "highly_sensitive".equals(sensitive)) {
            return canViewSensitive(item, actorId);
        }
        if (RESTRICTED_PRIVACY.contains(privacy) || "sensitive".equals(sensitive)) {
            return canViewSensitive(item, actorId);
        }
        return true;
    }

    private void addIf(LinkedHashSet<String> actions, String action, boolean allowed) {
        if (allowed) actions.add(action);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private BusinessException notFound() {
        return new BusinessException("CULTURE_ITEM_NOT_FOUND", "文化资料不存在或不可见");
    }
}
