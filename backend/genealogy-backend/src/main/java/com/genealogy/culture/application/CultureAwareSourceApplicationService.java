package com.genealogy.culture.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CulturePermissionPolicyService;
import com.genealogy.culture.domain.MigrationEventPermissionPolicyService;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.entity.MigrationEventEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.culture.repository.MigrationEventRepository;
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

    private final CultureItemRepository cultureItemRepository;
    private final CulturePermissionPolicyService culturePermissionPolicyService;
    private final MigrationEventRepository migrationEventRepository;
    private final MigrationEventPermissionPolicyService migrationPermissionPolicyService;

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
            CultureItemRepository cultureItemRepository,
            CulturePermissionPolicyService culturePermissionPolicyService,
            MigrationEventRepository migrationEventRepository,
            MigrationEventPermissionPolicyService migrationPermissionPolicyService
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
        this.cultureItemRepository = cultureItemRepository;
        this.culturePermissionPolicyService = culturePermissionPolicyService;
        this.migrationEventRepository = migrationEventRepository;
        this.migrationPermissionPolicyService = migrationPermissionPolicyService;
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
        String normalized = normalize(targetType);
        if ("culture_item".equals(normalized) || "culture_items".equals(normalized)) {
            CultureItemEntity item = requireCulture(targetId);
            if (clanId == null || !clanId.equals(item.getClanId())) throw cultureNotFound();
            culturePermissionPolicyService.requireVisible(item, actorId);
        } else if ("migration_event".equals(normalized) || "migration_events".equals(normalized)) {
            MigrationEventEntity event = requireMigration(targetId);
            if (clanId == null || !clanId.equals(event.getClanId())) throw migrationNotFound();
            migrationPermissionPolicyService.requireVisible(event, actorId);
        }
    }

    private boolean visible(String targetType, Long targetId, Long clanId, Long actorId) {
        String normalized = normalize(targetType);
        try {
            if ("culture_item".equals(normalized) || "culture_items".equals(normalized)) {
                CultureItemEntity item = requireCulture(targetId);
                if (clanId != null && !clanId.equals(item.getClanId())) return false;
                culturePermissionPolicyService.requireVisible(item, actorId);
            } else if ("migration_event".equals(normalized) || "migration_events".equals(normalized)) {
                MigrationEventEntity event = requireMigration(targetId);
                if (clanId != null && !clanId.equals(event.getClanId())) return false;
                migrationPermissionPolicyService.requireVisible(event, actorId);
            }
            return true;
        } catch (BusinessException ignored) {
            return false;
        }
    }

    private CultureItemEntity requireCulture(Long targetId) {
        return cultureItemRepository.findByIdAndDeletedAtIsNull(targetId)
                .orElseThrow(this::cultureNotFound);
    }

    private MigrationEventEntity requireMigration(Long targetId) {
        return migrationEventRepository.findByIdAndDeletedAtIsNull(targetId)
                .orElseThrow(this::migrationNotFound);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private BusinessException cultureNotFound() {
        return new BusinessException("CULTURE_ITEM_NOT_FOUND", "文化资料不存在或不可见");
    }

    private BusinessException migrationNotFound() {
        return new BusinessException("MIGRATION_EVENT_NOT_FOUND", "迁徙事件不存在或不可见");
    }
}
