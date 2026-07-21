package com.genealogy.culture.application;

import com.genealogy.common.domain.DraftDeletePolicy;
import com.genealogy.culture.dto.CultureAttachmentSummaryResponse;
import com.genealogy.culture.dto.CultureItemDetailResponse;
import com.genealogy.culture.dto.CultureItemSummaryResponse;
import com.genealogy.culture.dto.CultureReviewSummaryResponse;
import com.genealogy.culture.dto.CultureScopeResponse;
import com.genealogy.culture.dto.CultureSourceSummaryResponse;
import com.genealogy.culture.entity.CultureItemEntity;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CultureItemMapper {

    public CultureItemSummaryResponse toSummary(
            CultureItemEntity entity,
            String clanName,
            String branchName,
            String createdByName,
            int sourceCount,
            int attachmentCount,
            int reviewCount,
            List<String> allowedActions
    ) {
        return new CultureItemSummaryResponse(
                entity.getId(),
                new CultureScopeResponse(entity.getClanId(), clanName, entity.getBranchId(), branchName),
                entity.getCategory(),
                entity.getTitle(),
                entity.getSummary(),
                entity.getHistoricalPeriod(),
                entity.getLocationText(),
                entity.getConfidenceLevel(),
                entity.getPrivacyLevel(),
                entity.getSensitiveLevel(),
                entity.getDataStatus(),
                entity.isFeaturedOnHome(),
                entity.getSortOrder() == null ? 0 : entity.getSortOrder(),
                sourceCount,
                attachmentCount,
                reviewCount,
                filterDeleteAction(entity, allowedActions),
                entity.getVersion(),
                createdByName,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public CultureItemDetailResponse toDetail(
            CultureItemSummaryResponse summary,
            String content,
            List<CultureSourceSummaryResponse> sources,
            List<CultureAttachmentSummaryResponse> attachments,
            CultureReviewSummaryResponse review
    ) {
        return new CultureItemDetailResponse(
                summary.id(),
                summary.scope(),
                summary.category(),
                summary.title(),
                summary.summary(),
                summary.historicalPeriod(),
                summary.locationText(),
                summary.confidenceLevel(),
                summary.privacyLevel(),
                summary.sensitiveLevel(),
                summary.dataStatus(),
                summary.featuredOnHome(),
                summary.sortOrder(),
                summary.sourceCount(),
                summary.attachmentCount(),
                summary.reviewCount(),
                summary.allowedActions(),
                summary.version(),
                summary.createdByName(),
                summary.createdAt(),
                summary.updatedAt(),
                content,
                sources,
                attachments,
                review
        );
    }

    private List<String> filterDeleteAction(CultureItemEntity entity, List<String> allowedActions) {
        if (DraftDeletePolicy.isDraft(entity.getDataStatus())) {
            return allowedActions;
        }
        return allowedActions.stream().filter(action -> !"delete".equals(action)).toList();
    }
}
