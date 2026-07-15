package com.genealogy.culture.application;

import com.genealogy.culture.dto.CultureReviewSummaryResponse;
import com.genealogy.culture.dto.CultureScopeResponse;
import com.genealogy.culture.dto.CultureSourceSummaryResponse;
import com.genealogy.culture.dto.MigrationEventDetailResponse;
import com.genealogy.culture.dto.MigrationEventSummaryResponse;
import com.genealogy.culture.entity.MigrationEventEntity;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class MigrationEventMapper {

    public MigrationEventSummaryResponse toSummary(
            MigrationEventEntity entity,
            String clanName,
            String branchName,
            String founderPersonName,
            int sourceCount,
            List<String> allowedActions
    ) {
        return new MigrationEventSummaryResponse(
                entity.getId(),
                new CultureScopeResponse(entity.getClanId(), clanName, entity.getBranchId(), branchName),
                entity.getSequenceNo(),
                entity.getFromLocation(),
                entity.getToLocation(),
                entity.getMigrationTimeText(),
                entity.getFounderPersonId(),
                founderPersonName,
                entity.getReason(),
                entity.getConfidenceLevel(),
                entity.getPrivacyLevel(),
                entity.getSensitiveLevel(),
                entity.getDataStatus(),
                sourceCount,
                allowedActions,
                entity.getVersion(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public MigrationEventDetailResponse toDetail(
            MigrationEventSummaryResponse summary,
            String description,
            List<CultureSourceSummaryResponse> sources,
            CultureReviewSummaryResponse review
    ) {
        return new MigrationEventDetailResponse(
                summary.id(),
                summary.scope(),
                summary.sequenceNo(),
                summary.fromLocation(),
                summary.toLocation(),
                summary.migrationTimeText(),
                summary.founderPersonId(),
                summary.founderPersonName(),
                summary.reason(),
                summary.confidenceLevel(),
                summary.privacyLevel(),
                summary.sensitiveLevel(),
                summary.dataStatus(),
                summary.sourceCount(),
                summary.allowedActions(),
                summary.version(),
                summary.createdAt(),
                summary.updatedAt(),
                description,
                sources,
                review
        );
    }
}
