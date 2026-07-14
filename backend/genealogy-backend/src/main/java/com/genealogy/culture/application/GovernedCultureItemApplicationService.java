package com.genealogy.culture.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CultureItemDomainService;
import com.genealogy.culture.domain.CulturePermissionPolicyService;
import com.genealogy.culture.dto.CultureCommandResponse;
import com.genealogy.culture.dto.CultureItemDetailResponse;
import com.genealogy.culture.dto.CultureItemUpdateRequest;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.repository.SourceAttachmentRepository;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Primary
@Service
public class GovernedCultureItemApplicationService extends CultureItemApplicationService {

    private final CultureItemRepository governedItemRepository;
    private final BranchRepository governedBranchRepository;
    private final CulturePermissionPolicyService permissionPolicyService;
    private final CultureItemGovernanceApplicationService governanceApplicationService;

    public GovernedCultureItemApplicationService(
            CultureItemRepository cultureItemRepository,
            CultureItemDomainService domainService,
            CultureItemMapper mapper,
            ClanRepository clanRepository,
            BranchRepository branchRepository,
            AppUserRepository appUserRepository,
            SourceBindingRepository sourceBindingRepository,
            SourceRepository sourceRepository,
            SourceAttachmentRepository sourceAttachmentRepository,
            RevisionRepository revisionRepository,
            ReviewTaskRepository reviewTaskRepository,
            AuthorizationApplicationService authorizationApplicationService,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService,
            CulturePermissionPolicyService permissionPolicyService,
            CultureItemGovernanceApplicationService governanceApplicationService
    ) {
        super(
                cultureItemRepository,
                domainService,
                mapper,
                clanRepository,
                branchRepository,
                appUserRepository,
                sourceBindingRepository,
                sourceRepository,
                sourceAttachmentRepository,
                revisionRepository,
                reviewTaskRepository,
                authorizationApplicationService,
                rbacAuthorizationApplicationService,
                operationLogApplicationService
        );
        this.governedItemRepository = cultureItemRepository;
        this.governedBranchRepository = branchRepository;
        this.permissionPolicyService = permissionPolicyService;
        this.governanceApplicationService = governanceApplicationService;
    }

    @Override
    @Transactional(readOnly = true)
    public CultureItemDetailResponse getDetail(Long cultureItemId, Long actorId) {
        CultureItemEntity item = requireItem(cultureItemId);
        permissionPolicyService.requireVisible(item, actorId);
        CultureItemDetailResponse detail = super.getDetail(cultureItemId, actorId);
        List<String> allowedActions = permissionPolicyService.allowedActions(
                item,
                actorId,
                governanceApplicationService.hasPendingRevision(cultureItemId)
        );
        return withAllowedActions(detail, allowedActions);
    }

    @Override
    @Transactional
    public CultureItemDetailResponse update(
            Long cultureItemId,
            CultureItemUpdateRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        CultureItemEntity item = requireItem(cultureItemId);
        permissionPolicyService.requireAction(item, actorId, CulturePermissionPolicyService.UPDATE);
        if (request.branchId() != null && governedBranchRepository.findByIdAndClanId(request.branchId(), item.getClanId()).isEmpty()) {
            throw new BusinessException("CULTURE_ITEM_BRANCH_INVALID", "支派不属于当前宗族");
        }
        if ("official".equals(normalize(item.getDataStatus()))) {
            governanceApplicationService.submitOfficialUpdate(item, request, actorId, requestId, clientIp);
            return getDetail(cultureItemId, actorId);
        }
        return withAllowedActions(
                super.update(cultureItemId, request, actorId, requestId, clientIp),
                permissionPolicyService.allowedActions(item, actorId, false)
        );
    }

    @Override
    @Transactional
    public CultureCommandResponse delete(
            Long cultureItemId,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        CultureItemEntity item = requireItem(cultureItemId);
        permissionPolicyService.requireAction(item, actorId, CulturePermissionPolicyService.DELETE);
        if ("official".equals(normalize(item.getDataStatus()))) {
            return governanceApplicationService.submitOfficialDelete(item, actorId, requestId, clientIp);
        }
        return super.delete(cultureItemId, actorId, requestId, clientIp);
    }

    private CultureItemEntity requireItem(Long id) {
        return governedItemRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new BusinessException("CULTURE_ITEM_NOT_FOUND", "文化资料不存在或不可见"));
    }

    private CultureItemDetailResponse withAllowedActions(CultureItemDetailResponse source, List<String> allowedActions) {
        return new CultureItemDetailResponse(
                source.id(),
                source.scope(),
                source.category(),
                source.title(),
                source.summary(),
                source.historicalPeriod(),
                source.locationText(),
                source.confidenceLevel(),
                source.privacyLevel(),
                source.sensitiveLevel(),
                source.dataStatus(),
                source.featuredOnHome(),
                source.sortOrder(),
                source.sourceCount(),
                source.attachmentCount(),
                source.reviewCount(),
                allowedActions,
                source.version(),
                source.createdByName(),
                source.createdAt(),
                source.updatedAt(),
                source.content(),
                source.sources(),
                source.attachments(),
                source.review()
        );
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
