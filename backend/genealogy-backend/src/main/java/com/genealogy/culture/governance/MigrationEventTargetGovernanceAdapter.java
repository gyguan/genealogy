package com.genealogy.culture.governance;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.MigrationEventPermissionPolicyService;
import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.culture.repository.MigrationEventRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class MigrationEventTargetGovernanceAdapter implements CultureTargetGovernanceAdapter {

    public static final String TARGET_TYPE = "migration_event";

    private final MigrationEventRepository repository;
    private final MigrationEventPermissionPolicyService permissionPolicy;

    public MigrationEventTargetGovernanceAdapter(
            MigrationEventRepository repository,
            MigrationEventPermissionPolicyService permissionPolicy
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
        MigrationEventEntity entity = requireEntity(targetId);
        switch (action) {
            case VISIBLE, REVIEW -> permissionPolicy.requireVisible(entity, actorId);
            case UPDATE -> permissionPolicy.requireAction(entity, actorId, MigrationEventPermissionPolicyService.UPDATE);
            case ARCHIVE -> permissionPolicy.requireAction(entity, actorId, MigrationEventPermissionPolicyService.ARCHIVE);
        }
        return context(entity);
    }

    private MigrationEventEntity requireEntity(Long targetId) {
        return repository.findByIdAndDeletedAtIsNull(targetId)
                .orElseThrow(() -> new BusinessException("MIGRATION_EVENT_NOT_FOUND", "迁徙事件不存在或不可见"));
    }

    private CultureTargetContext context(MigrationEventEntity entity) {
        String from = display(entity.getFromLocation(), "待维护迁出地");
        String to = display(entity.getToLocation(), "待维护迁入地");
        return new CultureTargetContext(
                entity.getClanId(),
                entity.getBranchId(),
                TARGET_TYPE,
                entity.getId(),
                from + " → " + to,
                entity.getDataStatus(),
                entity.getPrivacyLevel(),
                entity.getSensitiveLevel(),
                entity.getCreatedBy(),
                MigrationEventPermissionPolicyService.VIEW_SENSITIVE,
                "受限迁徙事件操作"
        );
    }

    private String display(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
