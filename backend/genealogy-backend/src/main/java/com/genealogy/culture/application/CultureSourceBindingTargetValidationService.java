package com.genealogy.culture.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.governance.CultureTargetContext;
import com.genealogy.culture.governance.CultureTargetGovernanceRegistry;
import com.genealogy.generation.repository.GenerationSchemeRepository;
import com.genealogy.generation.repository.GenerationWordRepository;
import com.genealogy.source.application.SourceBindingTargetValidationService;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Primary
@Service
public class CultureSourceBindingTargetValidationService extends SourceBindingTargetValidationService {

    private final CultureTargetGovernanceRegistry targetRegistry;

    public CultureSourceBindingTargetValidationService(
            GenerationWordRepository generationWordRepository,
            GenerationSchemeRepository generationSchemeRepository,
            CultureTargetGovernanceRegistry targetRegistry
    ) {
        super(generationWordRepository, generationSchemeRepository);
        this.targetRegistry = targetRegistry;
    }

    @Override
    @Transactional(readOnly = true)
    public void validate(Long clanId, String targetType, Long targetId) {
        if (!targetRegistry.supports(targetType)) {
            super.validate(clanId, targetType, targetId);
            return;
        }
        CultureTargetContext target = targetRegistry.requireExisting(clanId, targetType, targetId);
        if (target.archived()) {
            throw new BusinessException("SOURCE_TARGET_ARCHIVED", "已归档文化对象不能新增来源绑定");
        }
    }
}
