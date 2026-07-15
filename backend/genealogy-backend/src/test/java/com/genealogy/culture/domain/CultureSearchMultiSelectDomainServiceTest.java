package com.genealogy.culture.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.dto.CultureSiteSearchCriteria;
import com.genealogy.culture.dto.MigrationEventSearchCriteria;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNull;

class CultureSearchMultiSelectDomainServiceTest {

    @Test
    void normalizesMigrationBranchAndStatusLists() {
        MigrationEventSearchCriteria normalized = new MigrationEventDomainService().normalize(
                MigrationEventSearchCriteria.multi(
                        " 南迁 ",
                        List.of(8L, 8L, 9L),
                        " 江西 ",
                        " 广东 ",
                        " 明代 ",
                        null,
                        List.of("official", "draft", "official"),
                        null,
                        null
                )
        );

        assertEquals("南迁", normalized.keyword());
        assertEquals(List.of(8L, 9L), normalized.branchIds());
        assertEquals(List.of("official", "draft"), normalized.dataStatuses());
        assertNull(normalized.sort());
    }

    @Test
    void rejectsInvalidMigrationListValues() {
        BusinessException branch = assertThrows(BusinessException.class, () -> new MigrationEventDomainService().normalize(
                MigrationEventSearchCriteria.multi(null, List.of(0L), null, null, null, null, List.of(), null, null)
        ));
        assertEquals("MIGRATION_EVENT_BRANCH_INVALID", branch.getCode());

        BusinessException status = assertThrows(BusinessException.class, () -> new MigrationEventDomainService().normalize(
                MigrationEventSearchCriteria.multi(null, List.of(), null, null, null, null, List.of("bad"), null, null)
        ));
        assertEquals("MIGRATION_EVENT_STATUS_INVALID", status.getCode());
    }

    @Test
    void normalizesCultureSiteTypeBranchAndStatusLists() {
        CultureSiteSearchCriteria normalized = new CultureSiteDomainService().normalize(
                CultureSiteSearchCriteria.multi(
                        " 祠堂 ",
                        List.of("ancestral_hall", "ancestral_home", "ancestral_hall"),
                        List.of(8L, 9L, 8L),
                        " 杭州 ",
                        null,
                        " 存续 ",
                        null,
                        List.of("official", "draft", "official"),
                        null,
                        null,
                        null
                )
        );

        assertEquals("祠堂", normalized.keyword());
        assertEquals(List.of("ancestral_hall", "ancestral_home"), normalized.siteTypes());
        assertEquals(List.of(8L, 9L), normalized.branchIds());
        assertEquals(List.of("official", "draft"), normalized.dataStatuses());
        assertNull(normalized.sort());
    }

    @Test
    void rejectsInvalidCultureSiteListValues() {
        BusinessException type = assertThrows(BusinessException.class, () -> new CultureSiteDomainService().normalize(
                CultureSiteSearchCriteria.multi(null, List.of("bad"), List.of(), null, null, null, null, List.of(), null, null, null)
        ));
        assertEquals("CULTURE_SITE_TYPE_INVALID", type.getCode());

        BusinessException branch = assertThrows(BusinessException.class, () -> new CultureSiteDomainService().normalize(
                CultureSiteSearchCriteria.multi(null, List.of(), List.of(-1L), null, null, null, null, List.of(), null, null, null)
        ));
        assertEquals("CULTURE_SITE_BRANCH_INVALID", branch.getCode());
    }
}
