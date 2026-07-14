package com.genealogy.culture.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.dto.CultureItemCreateRequest;
import com.genealogy.culture.dto.CultureItemSearchCriteria;
import com.genealogy.culture.entity.CultureItemEntity;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CultureItemDomainServiceTest {

    private final CultureItemDomainService service = new CultureItemDomainService();

    @Test
    void normalizesControlledValuesAndText() {
        CultureItemCreateRequest request = new CultureItemCreateRequest(
                9L,
                " HALL_NAME ",
                "  敦本堂  ",
                "  堂号摘要  ",
                "  正文  ",
                "  清代  ",
                "  长沙  ",
                " HIGH ",
                " CLAN_ONLY ",
                " NORMAL ",
                false,
                2
        );

        CultureItemDomainService.NormalizedCultureItemInput input = service.normalize(request);

        assertEquals("hall_name", input.category());
        assertEquals("敦本堂", input.title());
        assertEquals("堂号摘要", input.summary());
        assertEquals("high", input.confidenceLevel());
        assertEquals("clan_only", input.privacyLevel());
        assertEquals(2, input.sortOrder());
    }

    @Test
    void rejectsUnsupportedCategoryAndOversizedKeyword() {
        CultureItemCreateRequest invalidCategory = new CultureItemCreateRequest(
                null, "unknown_category", "标题", null, null, null, null,
                "unknown", "clan_only", "normal", false, 0
        );
        BusinessException categoryException = assertThrows(
                BusinessException.class,
                () -> service.normalize(invalidCategory)
        );
        assertEquals("CULTURE_ITEM_CATEGORY_INVALID", categoryException.getCode());

        BusinessException keywordException = assertThrows(
                BusinessException.class,
                () -> service.normalize(new CultureItemSearchCriteria(
                        "文".repeat(101), null, null, null, null, null, null, null))
        );
        assertEquals("CULTURE_ITEM_KEYWORD_TOO_LONG", keywordException.getCode());
    }

    @Test
    void onlyDraftAndRejectedAreDirectlyMutable() {
        CultureItemEntity entity = new CultureItemEntity();
        entity.setDataStatus("draft");
        assertTrue(service.isDirectlyMutable(entity));

        entity.setDataStatus("rejected");
        assertTrue(service.isDirectlyMutable(entity));

        entity.setDataStatus("pending_review");
        assertFalse(service.isDirectlyMutable(entity));
        assertEquals("CULTURE_ITEM_PENDING_REVIEW",
                assertThrows(BusinessException.class, () -> service.requireDirectlyMutable(entity)).getCode());

        entity.setDataStatus("official");
        assertEquals("CULTURE_ITEM_REVIEW_REQUIRED",
                assertThrows(BusinessException.class, () -> service.requireDirectlyMutable(entity)).getCode());
    }

    @Test
    void validatesOptimisticLockAndSortWhitelist() {
        CultureItemEntity entity = new CultureItemEntity();
        entity.setVersion(3L);
        service.requireExpectedVersion(entity, 3L);
        assertEquals("CULTURE_ITEM_VERSION_CONFLICT",
                assertThrows(BusinessException.class, () -> service.requireExpectedVersion(entity, 2L)).getCode());

        CultureItemSearchCriteria fallback = service.normalize(new CultureItemSearchCriteria(
                null, null, null, null, null, null, null, "content,asc"));
        assertEquals("updatedAt", service.sortField(fallback.sort()));
        assertTrue(service.sortAscending(fallback.sort()));
    }
}
