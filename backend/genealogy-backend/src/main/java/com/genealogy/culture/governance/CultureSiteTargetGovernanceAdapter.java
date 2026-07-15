package com.genealogy.culture.governance;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CultureSitePermissionPolicyService;
import com.genealogy.culture.entity.CultureSiteEntity;
import com.genealogy.culture.repository.CultureSiteRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CultureSiteTargetGovernanceAdapter implements CultureTargetGovernanceAdapter {

    public static final String TARGET_TYPE = "culture_site";

    private final CultureSiteRepository repository;
    private final CultureSitePermissionPolicyService permissionPolicy;

    public CultureSiteTargetGovernanceAdapter(CultureSiteRepository repository, CultureSitePermissionPolicyService permissionPolicy) {
        this.repository = repository;
        this.permissionPolicy = permissionPolicy;
    }

    @Override public String targetType() { return TARGET_TYPE; }
    @Override public String viewPermission() { return CultureSitePermissionPolicyService.VIEW; }
    @Override public String sensitiveViewPermission() { return CultureSitePermissionPolicyService.VIEW_SENSITIVE; }
    @Override public String restrictedLogSummary() { return "受限文化场所操作"; }

    @Override
    @Transactional(readOnly = true)
    public CultureTargetContext requireExisting(Long targetId) {
        return context(requireEntity(targetId));
    }

    @Override
    @Transactional(readOnly = true)
    public CultureTargetContext require(Long targetId, Long actorId, CultureTargetAction action) {
        CultureSiteEntity entity = requireEntity(targetId);
        switch (action) {
            case VISIBLE, REVIEW -> permissionPolicy.requireVisible(entity, actorId);
            case UPDATE -> permissionPolicy.requireAction(entity, actorId, CultureSitePermissionPolicyService.UPDATE);
            case ARCHIVE -> permissionPolicy.requireAction(entity, actorId, CultureSitePermissionPolicyService.ARCHIVE);
        }
        return context(entity);
    }

    private CultureSiteEntity requireEntity(Long targetId) {
        return repository.findByIdAndDeletedAtIsNull(targetId)
                .orElseThrow(() -> new BusinessException("CULTURE_SITE_NOT_FOUND", "文化场所不存在或不可见"));
    }

    private CultureTargetContext context(CultureSiteEntity entity) {
        return new CultureTargetContext(entity.getClanId(), entity.getBranchId(), TARGET_TYPE, entity.getId(),
                display(entity.getSiteName(), "文化场所"), entity.getDataStatus(), entity.getPrivacyLevel(),
                entity.getSensitiveLevel(), entity.getCreatedBy(), sensitiveViewPermission(), restrictedLogSummary());
    }

    private String display(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
