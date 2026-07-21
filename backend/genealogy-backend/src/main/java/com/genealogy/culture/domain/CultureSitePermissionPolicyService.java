package com.genealogy.culture.domain;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.common.domain.DraftDeletePolicy;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.entity.CultureSiteEntity;
import com.genealogy.member.enums.MemberRoleScopeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class CultureSitePermissionPolicyService {

    public static final String VIEW = "culture_site.view";
    public static final String CREATE = "culture_site.create";
    public static final String UPDATE = "culture_site.update";
    public static final String DELETE = "culture_site.delete";
    public static final String SUBMIT_REVIEW = "culture_site.submit_review";
    public static final String ARCHIVE = "culture_site.archive";
    public static final String FEATURE = "culture_site.feature";
    public static final String VIEW_SENSITIVE = "culture_site.view_sensitive";

    private static final Set<String> RESTRICTED_PRIVACY = Set.of("relatives_only", "private", "sealed");

    private final AuthorizationApplicationService authorizationApplicationService;
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService;

    public CultureSitePermissionPolicyService(
            AuthorizationApplicationService authorizationApplicationService,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService
    ) {
        this.authorizationApplicationService = authorizationApplicationService;
        this.rbacAuthorizationApplicationService = rbacAuthorizationApplicationService;
    }

    @Transactional(readOnly = true)
    public void requireVisible(CultureSiteEntity site, Long actorId) {
        if (site == null || site.getDeletedAt() != null) throw notFound();
        authorizationApplicationService.requireClanMember(site.getClanId(), actorId);
        if (!can(site, actorId, VIEW) || !privacyAllows(site, actorId)) throw notFound();
    }

    @Transactional(readOnly = true)
    public void requireAction(CultureSiteEntity site, Long actorId, String permissionCode) {
        requireVisible(site, actorId);
        if (!can(site, actorId, permissionCode)) {
            throw new BusinessException("AUTH_FORBIDDEN", "您暂无权限执行该文化场所操作");
        }
    }

    @Transactional(readOnly = true)
    public boolean can(CultureSiteEntity site, Long actorId, String permissionCode) {
        if (site == null || actorId == null || permissionCode == null) return false;
        return canOnScope(actorId, site.getClanId(), site.getBranchId(), permissionCode);
    }

    @Transactional(readOnly = true)
    public boolean canCreate(Long clanId, Long branchId, Long actorId) {
        return canOnScope(actorId, clanId, branchId, CREATE);
    }

    @Transactional(readOnly = true)
    public boolean canUpdate(Long clanId, Long branchId, Long actorId) {
        return canOnScope(actorId, clanId, branchId, UPDATE);
    }

    @Transactional(readOnly = true)
    public boolean canViewSensitive(CultureSiteEntity site, Long actorId) {
        if (!requiresSensitiveAccess(site)) return true;
        return Objects.equals(site.getCreatedBy(), actorId) || can(site, actorId, VIEW_SENSITIVE);
    }

    @Transactional(readOnly = true)
    public List<String> allowedActions(CultureSiteEntity site, Long actorId, boolean reviewPending) {
        requireVisible(site, actorId);
        LinkedHashSet<String> actions = new LinkedHashSet<>();
        actions.add("view");
        String status = normalize(site.getDataStatus());
        if (("draft".equals(status) || "rejected".equals(status)) && !reviewPending) {
            addIf(actions, "update", can(site, actorId, UPDATE));
            if (DraftDeletePolicy.isDraft(status)) {
                addIf(actions, "delete", can(site, actorId, DELETE));
            }
            addIf(actions, "submit_review", can(site, actorId, SUBMIT_REVIEW));
            addIf(actions, "archive", can(site, actorId, ARCHIVE));
        } else if ("official".equals(status) && !reviewPending) {
            addIf(actions, "request_update", can(site, actorId, UPDATE));
            addIf(actions, "request_delete", can(site, actorId, DELETE));
            addIf(actions, "request_archive", can(site, actorId, ARCHIVE));
            addIf(actions, "request_feature", can(site, actorId, FEATURE));
        }
        addIf(actions, "view_sensitive", requiresSensitiveAccess(site) && canViewSensitive(site, actorId));
        return List.copyOf(actions);
    }

    private boolean canOnScope(Long actorId, Long clanId, Long branchId, String permissionCode) {
        if (authorizationApplicationService.isCrossClanAdmin(actorId)) return true;
        MemberRoleScopeType scopeType = branchId == null ? MemberRoleScopeType.clan : MemberRoleScopeType.branch;
        Long scopeId = branchId == null ? clanId : branchId;
        return rbacAuthorizationApplicationService.hasPermission(actorId, clanId, permissionCode, scopeType, scopeId);
    }

    private boolean privacyAllows(CultureSiteEntity site, Long actorId) {
        return !requiresSensitiveAccess(site) || canViewSensitive(site, actorId);
    }

    private boolean requiresSensitiveAccess(CultureSiteEntity site) {
        String privacy = normalize(site.getPrivacyLevel());
        String sensitive = normalize(site.getSensitiveLevel());
        return RESTRICTED_PRIVACY.contains(privacy)
                || "sensitive".equals(sensitive)
                || "highly_sensitive".equals(sensitive);
    }

    private void addIf(LinkedHashSet<String> actions, String action, boolean allowed) {
        if (allowed) actions.add(action);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private BusinessException notFound() {
        return new BusinessException("CULTURE_SITE_NOT_FOUND", "文化场所不存在或不可见");
    }
}
