package com.genealogy.culture.application;

import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.dto.CultureItemPageResponse;
import com.genealogy.culture.dto.CultureItemSearchCriteria;
import com.genealogy.culture.dto.CultureItemSummaryResponse;
import com.genealogy.culture.dto.CultureOverviewEntryResponse;
import com.genealogy.culture.dto.CultureOverviewResponse;
import com.genealogy.culture.dto.CultureOverviewStatisticsResponse;
import com.genealogy.culture.dto.CultureSitePageResponse;
import com.genealogy.culture.dto.CultureSiteSearchCriteria;
import com.genealogy.culture.dto.CultureSiteSummaryResponse;
import com.genealogy.culture.dto.MigrationEventPageResponse;
import com.genealogy.culture.dto.MigrationEventSearchCriteria;
import com.genealogy.culture.dto.MigrationEventSummaryResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class CultureOverviewApplicationService {

    private static final String OFFICIAL = "official";
    private static final String PENDING_REVIEW = "pending_review";
    private static final int HOME_LIMIT = 6;

    private final CultureItemApplicationService cultureItemApplicationService;
    private final MigrationEventApplicationService migrationEventApplicationService;
    private final CultureSiteApplicationService cultureSiteApplicationService;
    private final ClanRepository clanRepository;

    public CultureOverviewApplicationService(
            CultureItemApplicationService cultureItemApplicationService,
            MigrationEventApplicationService migrationEventApplicationService,
            CultureSiteApplicationService cultureSiteApplicationService,
            ClanRepository clanRepository
    ) {
        this.cultureItemApplicationService = cultureItemApplicationService;
        this.migrationEventApplicationService = migrationEventApplicationService;
        this.cultureSiteApplicationService = cultureSiteApplicationService;
        this.clanRepository = clanRepository;
    }

    @Transactional(readOnly = true)
    public CultureOverviewResponse getOverview(Long clanId, Long actorId) {
        ClanEntity clan = clanRepository.findById(clanId)
                .orElseThrow(() -> new BusinessException("CLAN_NOT_FOUND", "宗族不存在"));

        CultureItemPageResponse officialItems = cultureItemApplicationService.search(
                clanId,
                itemCriteria(OFFICIAL, null, null),
                1,
                1,
                actorId
        );
        CultureItemPageResponse pendingItems = cultureItemApplicationService.search(
                clanId,
                itemCriteria(PENDING_REVIEW, null, null),
                1,
                1,
                actorId
        );
        CultureItemPageResponse coveredItems = cultureItemApplicationService.search(
                clanId,
                itemCriteria(OFFICIAL, true, null),
                1,
                1,
                actorId
        );
        CultureItemPageResponse featuredItems = cultureItemApplicationService.search(
                clanId,
                itemCriteria(OFFICIAL, null, true),
                1,
                HOME_LIMIT,
                actorId
        );

        long officialCount = officialItems.page().totalElements();
        long pendingCount = pendingItems.page().totalElements();
        long coveredCount = coveredItems.page().totalElements();
        double coverageRate = officialCount == 0 ? 0D : (double) coveredCount / officialCount;

        List<MigrationEventSummaryResponse> migrationHighlights = migrationHighlights(clanId, actorId);
        List<CultureSiteSummaryResponse> siteHighlights = siteHighlights(clanId, actorId);
        List<CultureOverviewEntryResponse> entries = buildEntries(
                clan,
                featuredItems.items(),
                migrationHighlights,
                siteHighlights
        );
        List<String> missingHints = buildMissingHints(
                clan,
                officialCount,
                coveredCount,
                featuredItems.items(),
                migrationHighlights,
                siteHighlights
        );

        return new CultureOverviewResponse(
                clan.getId(),
                clan.getClanName(),
                new CultureOverviewStatisticsResponse(officialCount, pendingCount, coverageRate),
                featuredItems.items(),
                migrationHighlights,
                siteHighlights,
                entries,
                missingHints
        );
    }

    private CultureItemSearchCriteria itemCriteria(String status, Boolean hasSource, Boolean featured) {
        return new CultureItemSearchCriteria(
                null,
                null,
                null,
                status,
                null,
                hasSource,
                featured,
                featured != null ? "sortOrder,asc" : "updatedAt,desc"
        );
    }

    private List<MigrationEventSummaryResponse> migrationHighlights(Long clanId, Long actorId) {
        try {
            MigrationEventPageResponse page = migrationEventApplicationService.search(
                    clanId,
                    MigrationEventSearchCriteria.multi(
                            null,
                            List.of(),
                            null,
                            null,
                            null,
                            null,
                            List.of(OFFICIAL),
                            null,
                            "sequenceNo,asc"
                    ),
                    1,
                    HOME_LIMIT,
                    actorId
            );
            return page.items();
        } catch (BusinessException ignored) {
            return List.of();
        }
    }

    private List<CultureSiteSummaryResponse> siteHighlights(Long clanId, Long actorId) {
        try {
            CultureSitePageResponse featured = cultureSiteApplicationService.search(
                    clanId,
                    CultureSiteSearchCriteria.multi(
                            null,
                            List.of(),
                            List.of(),
                            null,
                            null,
                            null,
                            null,
                            List.of(OFFICIAL),
                            null,
                            true,
                            "sortOrder,asc"
                    ),
                    1,
                    HOME_LIMIT,
                    actorId
            );
            if (!featured.items().isEmpty()) return featured.items();
            return cultureSiteApplicationService.search(
                    clanId,
                    CultureSiteSearchCriteria.multi(
                            null,
                            List.of(),
                            List.of(),
                            null,
                            null,
                            null,
                            null,
                            List.of(OFFICIAL),
                            null,
                            null,
                            "sortOrder,asc"
                    ),
                    1,
                    HOME_LIMIT,
                    actorId
            ).items();
        } catch (BusinessException ignored) {
            return List.of();
        }
    }

    private List<CultureOverviewEntryResponse> buildEntries(
            ClanEntity clan,
            List<CultureItemSummaryResponse> featuredItems,
            List<MigrationEventSummaryResponse> migrations,
            List<CultureSiteSummaryResponse> sites
    ) {
        List<CultureOverviewEntryResponse> entries = new ArrayList<>();
        addCompatibility(entries, "hall_name", "堂号", clan.getHallName());
        addCompatibility(entries, "commandery", "郡望", clan.getCommandery());
        addCompatibility(entries, "surname_origin", "祖籍/发源地", clan.getOriginPlace());

        featuredItems.forEach(item -> entries.add(new CultureOverviewEntryResponse(
                "culture_item",
                safe(item.category(), "other"),
                safe(item.title(), "未命名文化资料"),
                first(item.summary(), item.scope() == null ? null : item.scope().branchName(), "正式精选文化资料"),
                safe(item.dataStatus(), OFFICIAL),
                item.sourceCount(),
                item.sourceCount() > 0 ? 1D : 0D,
                "items",
                "cultureKeyword",
                safe(item.title(), "")
        )));

        migrations.forEach(item -> {
            String route = safe(item.fromLocation(), "迁出地待考") + " → " + safe(item.toLocation(), "迁入地待考");
            entries.add(new CultureOverviewEntryResponse(
                    "migration_event",
                    "migration",
                    route,
                    first(
                            item.scope() == null ? null : item.scope().branchName(),
                            item.migrationTimeText(),
                            item.founderPersonName(),
                            "正式迁徙事件"
                    ),
                    safe(item.dataStatus(), OFFICIAL),
                    item.sourceCount() == null ? 0 : item.sourceCount(),
                    item.sourceCount() != null && item.sourceCount() > 0 ? 1D : 0D,
                    "migrations",
                    "migrationKeyword",
                    route.replace("待考", "").trim()
            ));
        });

        sites.forEach(item -> entries.add(new CultureOverviewEntryResponse(
                "culture_site",
                safe(item.siteType(), "other"),
                safe(item.name(), "未命名文化场所"),
                first(
                        item.scope() == null ? null : item.scope().branchName(),
                        item.foundedPeriod(),
                        item.currentStatus(),
                        "正式文化场所"
                ),
                safe(item.dataStatus(), OFFICIAL),
                item.sourceCount() == null ? 0 : item.sourceCount(),
                item.sourceCount() != null && item.sourceCount() > 0 ? 1D : 0D,
                "sites",
                "siteKeyword",
                safe(item.name(), "")
        )));
        return List.copyOf(entries);
    }

    private void addCompatibility(
            List<CultureOverviewEntryResponse> entries,
            String category,
            String label,
            String value
    ) {
        if (blank(value)) return;
        entries.add(new CultureOverviewEntryResponse(
                "compatibility",
                category,
                value.trim(),
                label + "（旧字段只读兼容，建议迁移至正式文化资料）",
                "legacy_read_only",
                0,
                0D,
                "items",
                "cultureCategory",
                category
        ));
    }

    private List<String> buildMissingHints(
            ClanEntity clan,
            long officialCount,
            long coveredCount,
            List<CultureItemSummaryResponse> featuredItems,
            List<MigrationEventSummaryResponse> migrations,
            List<CultureSiteSummaryResponse> sites
    ) {
        List<String> hints = new ArrayList<>();
        if (featuredItems.isEmpty()) hints.add("暂无可展示的正式精选文化资料。");
        if (migrations.isEmpty()) hints.add("暂无当前账号可见的正式迁徙事件。");
        if (sites.isEmpty()) hints.add("暂无当前账号可见的正式祠堂与文化场所。");
        if (blank(clan.getHallName()) && blank(clan.getCommandery())) {
            hints.add("堂号与郡望尚未形成兼容摘要，可在文化资料中维护并审核发布。");
        }
        if (officialCount > coveredCount) hints.add("部分正式文化资料尚未绑定来源证据。");
        return List.copyOf(hints);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String safe(String value, String fallback) {
        return blank(value) ? fallback : value.trim();
    }

    private static String first(String... values) {
        for (String value : values) {
            if (!blank(value)) return value.trim();
        }
        return "";
    }
}
