package com.genealogy.culture.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.governance.CultureTargetAction;
import com.genealogy.culture.governance.CultureTargetGovernanceRegistry;
import com.genealogy.generation.repository.GenerationSchemeRepository;
import com.genealogy.generation.repository.GenerationWordRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.application.SourceApplicationService;
import com.genealogy.source.dto.SourceBindingResponse;
import com.genealogy.source.dto.SourceBindingSummaryResponse;
import com.genealogy.source.repository.SourceAttachmentRepository;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Primary
@Service
public class CultureAwareSourceApplicationService extends SourceApplicationService {

    private final CultureTargetGovernanceRegistry targetRegistry;

    public CultureAwareSourceApplicationService(
            SourceRepository sourceRepository,
            SourceBindingRepository sourceBindingRepository,
            RevisionRepository revisionRepository,
            SourceAttachmentRepository sourceAttachmentRepository,
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            BranchRepository branchRepository,
            GenerationWordRepository generationWordRepository,
            GenerationSchemeRepository generationSchemeRepository,
            ClanRepository clanRepository,
            OperationLogApplicationService operationLogApplicationService,
            AuthorizationApplicationService authorizationApplicationService,
            CultureTargetGovernanceRegistry targetRegistry
    ) {
        super(
                sourceRepository,
                sourceBindingRepository,
                revisionRepository,
                sourceAttachmentRepository,
                personRepository,
                relationshipRepository,
                branchRepository,
                generationWordRepository,
                generationSchemeRepository,
                clanRepository,
                operationLogApplicationService,
                authorizationApplicationService
        );
        this.targetRegistry = targetRegistry;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SourceBindingResponse> listBindingsByTarget(
            String targetType,
            Long targetId,
            Long clanId,
            Long actorId
    ) {
        requireGovernedTargetVisible(targetType, targetId, clanId, actorId);
        return super.listBindingsByTarget(targetType, targetId, clanId, actorId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SourceBindingResponse> listBindingsBySource(Long sourceId, Long actorId) {
        return super.listBindingsBySource(sourceId, actorId).stream()
                .filter(binding -> visible(binding.targetType(), binding.targetId(), binding.clanId(), actorId))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<SourceBindingSummaryResponse> listBindingSummariesBySource(
            Long sourceId,
            String targetType,
            int pageNo,
            int pageSize,
            Long actorId
    ) {
        PageResponse<SourceBindingSummaryResponse> page = super.listBindingSummariesBySource(
                sourceId, targetType, pageNo, pageSize, actorId
        );
        List<SourceBindingSummaryResponse> visible = page.records().stream()
                .filter(binding -> visible(binding.targetType(), binding.targetId(), null, actorId))
                .toList();
        if (visible.size() == page.records().size()) return page;
        return PageResponse.of(visible, visible.size(), pageNo, pageSize);
    }

    private void requireGovernedTargetVisible(String targetType, Long targetId, Long clanId, Long actorId) {
        if (!targetRegistry.supports(targetType)) return;
        try {
            targetRegistry.require(clanId, targetType, targetId, actorId, CultureTargetAction.VISIBLE);
        } catch (BusinessException exception) {
            throw notFound();
        }
    }

    private boolean visible(String targetType, Long targetId, Long clanId, Long actorId) {
        if (!targetRegistry.supports(targetType)) return true;
        try {
            if (clanId == null) {
                var existing = targetRegistry.requireAdapter(targetType).requireExisting(targetId);
                targetRegistry.require(existing.clanId(), targetType, targetId, actorId, CultureTargetAction.VISIBLE);
            } else {
                targetRegistry.require(clanId, targetType, targetId, actorId, CultureTargetAction.VISIBLE);
            }
            return true;
        } catch (BusinessException ignored) {
            return false;
        }
    }

    private BusinessException notFound() {
        return new BusinessException("CULTURE_TARGET_NOT_FOUND", "文化对象不存在或当前用户不可见");
    }
}
