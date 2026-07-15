package com.genealogy.culture.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.culture.repository.MigrationEventRepository;
import com.genealogy.generation.repository.GenerationSchemeRepository;
import com.genealogy.generation.repository.GenerationWordRepository;
import com.genealogy.source.application.SourceBindingTargetValidationService;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Primary
@Service
public class CultureSourceBindingTargetValidationService extends SourceBindingTargetValidationService {

    private final CultureItemRepository cultureItemRepository;
    private final MigrationEventRepository migrationEventRepository;

    public CultureSourceBindingTargetValidationService(
            GenerationWordRepository generationWordRepository,
            GenerationSchemeRepository generationSchemeRepository,
            CultureItemRepository cultureItemRepository,
            MigrationEventRepository migrationEventRepository
    ) {
        super(generationWordRepository, generationSchemeRepository);
        this.cultureItemRepository = cultureItemRepository;
        this.migrationEventRepository = migrationEventRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public void validate(Long clanId, String targetType, Long targetId) {
        String normalizedType = normalize(targetType);
        if (CultureItemGovernanceApplicationService.TARGET_TYPE.equals(normalizedType)) {
            validateCultureItem(clanId, targetId);
            return;
        }
        if (MigrationEventGovernanceApplicationService.TARGET_TYPE.equals(normalizedType)) {
            validateMigrationEvent(clanId, targetId);
            return;
        }
        super.validate(clanId, targetType, targetId);
    }

    private void validateCultureItem(Long clanId, Long targetId) {
        CultureItemEntity item = cultureItemRepository.findByIdAndDeletedAtIsNull(targetId)
                .orElseThrow(() -> new BusinessException("CULTURE_ITEM_NOT_FOUND", "文化资料不存在或不可见"));
        if (!Objects.equals(clanId, item.getClanId())) {
            throw new BusinessException("SOURCE_TARGET_CLAN_MISMATCH", "文化资料不属于当前宗族");
        }
        if ("archived".equals(normalize(item.getDataStatus()))) {
            throw new BusinessException("SOURCE_TARGET_ARCHIVED", "已归档文化资料不能新增来源绑定");
        }
    }

    private void validateMigrationEvent(Long clanId, Long targetId) {
        MigrationEventEntity event = migrationEventRepository.findByIdAndDeletedAtIsNull(targetId)
                .orElseThrow(() -> new BusinessException("MIGRATION_EVENT_NOT_FOUND", "迁徙事件不存在或不可见"));
        if (!Objects.equals(clanId, event.getClanId())) {
            throw new BusinessException("SOURCE_TARGET_CLAN_MISMATCH", "迁徙事件不属于当前宗族");
        }
        if ("archived".equals(normalize(event.getDataStatus()))) {
            throw new BusinessException("SOURCE_TARGET_ARCHIVED", "已归档迁徙事件不能新增来源绑定");
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
