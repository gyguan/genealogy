package com.genealogy.culture.application;

import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.governance.CultureTargetContext;
import com.genealogy.culture.governance.CultureTargetGovernanceRegistry;
import com.genealogy.generation.repository.GenerationSchemeRepository;
import com.genealogy.generation.repository.GenerationWordRepository;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
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
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            BranchRepository branchRepository,
            ClanRepository clanRepository,
            CultureTargetGovernanceRegistry targetRegistry
    ) {
        super(generationWordRepository, generationSchemeRepository, personRepository, relationshipRepository, branchRepository, clanRepository);
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
