package com.genealogy.culture.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.dto.CultureItemSearchCriteria;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CultureItemDomainServiceMultiSelectTest {

    private final CultureItemDomainService service = new CultureItemDomainService();

    @Test
    void normalizesAndDeduplicatesEveryMultiSelectDimension() {
        CultureItemSearchCriteria normalized = service.normalize(CultureItemSearchCriteria.multi(
                "  家训  ",
                List.of("family_instruction", "clan_rule", "family_instruction"),
                List.of(7L, 8L, 7L),
                List.of("official", "draft", "official"),
                List.of("clan_only", "branch_only", "clan_only"),
                List.of(true, false, true),
                List.of(true, true),
                "title,asc"
        ));

        assertEquals("家训", normalized.keyword());
        assertEquals(List.of("family_instruction", "clan_rule"), normalized.categories());
        assertEquals(List.of(7L, 8L), normalized.branchIds());
        assertEquals(List.of("official", "draft"), normalized.dataStatuses());
        assertEquals(List.of("clan_only", "branch_only"), normalized.privacyLevels());
        assertEquals(List.of(true, false), normalized.hasSourceValues());
        assertEquals(List.of(true), normalized.featuredOnHomeValues());
        assertEquals("title,asc", normalized.sort());
    }

    @Test
    void rejectsInvalidValuesInsideMultiSelectFilters() {
        BusinessException category = assertThrows(BusinessException.class, () -> service.normalize(
                CultureItemSearchCriteria.multi(null, List.of("invalid"), List.of(), List.of(), List.of(), List.of(), List.of(), null)));
        assertEquals("CULTURE_ITEM_CATEGORY_INVALID", category.getCode());

        BusinessException branch = assertThrows(BusinessException.class, () -> service.normalize(
                CultureItemSearchCriteria.multi(null, List.of(), List.of(0L), List.of(), List.of(), List.of(), List.of(), null)));
        assertEquals("CULTURE_ITEM_BRANCH_INVALID", branch.getCode());
    }

    @Test
    void keepsLegacySingleValueConstructionCompatible() {
        CultureItemSearchCriteria normalized = service.normalize(new CultureItemSearchCriteria(
                null, "hall_name", 5L, "official", "clan_only", true, false, null));
        assertEquals(List.of("hall_name"), normalized.categories());
        assertEquals(List.of(5L), normalized.branchIds());
        assertEquals(List.of("official"), normalized.dataStatuses());
        assertEquals(List.of("clan_only"), normalized.privacyLevels());
        assertEquals(List.of(true), normalized.hasSourceValues());
        assertEquals(List.of(false), normalized.featuredOnHomeValues());
    }
}
