package com.genealogy.culture.governance;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CulturePermissionPolicyService;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CultureItemTargetGovernanceAdapter implements CultureTargetGovernanceAdapter {

    public static final String TARGET_TYPE = "culture_item";

    private final CultureItemRepository repository;
    private final CulturePermissionPolicyService permissionPolicy;

    public CultureItemTargetGovernanceAdapter(
            CultureItemRepository repository,
            CulturePermissionPolicyService permissionPolicy
    ) {
        this.repository = repository;
        this.permissionPolicy = permissionPolicy;
    }

    @Override
    public String targetType() {
        return TARGET_TYPE;
    }

    @Override
    @Transactional(readOnly = true)
    public CultureTargetContext requireExisting(Long targetId) {
        return context(requireEntity(targetId));
    }

    @Override
    @Transactional(readOnly = true)
    public CultureTargetContext require(Long targetId, Long actorId, CultureTargetAction action) {
        CultureItemEntity entity = requireEntity(targetId);
        switch (action) {
            case VISIBLE -> permissionPolicy.requireVisible(entity, actorId);
            case UPDATE -> permissionPolicy.requireAction(entity, actorId, CulturePermissionPolicyService.UPDATE);
            case REVIEW -> permissionPolicy.requireAction(entity, actorId, CulturePermissionPolicyService.REVIEW);
            case ARCHIVE -> permissionPolicy.requireAction(entity, actorId, CulturePermissionPolicyService.ARCHIVE);
        }
        return context(entity);
    }

    private CultureItemEntity requireEntity(Long targetId) {
        return repository.findByIdAndDeletedAtIsNull(targetId)
                .orElseThrow(() -> new BusinessException("CULTURE_ITEM_NOT_FOUND", "文化资料不存在或不可见"));
    }

    private CultureTargetContext context(CultureItemEntity entity) {
        return new CultureTargetContext(
                entity.getClanId(),
                entity.getBranchId(),
                TARGET_TYPE,
                entity.getId(),
                display(entity.getTitle(), "文化资料"),
                entity.getDataStatus(),
                entity.getPrivacyLevel(),
                entity.getSensitiveLevel(),
                entity.getCreatedBy(),
                CulturePermissionPolicyService.VIEW_SENSITIVE,
                "受限文化资料操作"
        );
    }

    private String display(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
