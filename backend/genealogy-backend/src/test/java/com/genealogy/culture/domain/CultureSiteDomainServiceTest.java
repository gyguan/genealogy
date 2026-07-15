package com.genealogy.culture.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.dto.CultureSiteCreateRequest;
import com.genealogy.culture.entity.CultureSiteEntity;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CultureSiteDomainServiceTest {

    private final CultureSiteDomainService service = new CultureSiteDomainService();

    @Test
    void rejectsUnknownSiteType() {
        BusinessException error = assertThrows(BusinessException.class, () -> service.normalize(request(
                "museum", null, null
        )));
        assertEquals("CULTURE_SITE_TYPE_INVALID", error.getCode());
    }

    @Test
    void requiresCoordinatesAsPair() {
        BusinessException error = assertThrows(BusinessException.class, () -> service.normalize(request(
                "ancestral_hall", new BigDecimal("28.2282"), null
        )));
        assertEquals("CULTURE_SITE_COORDINATES_INCOMPLETE", error.getCode());
    }

    @Test
    void acceptsPublicSiteWithoutCoordinatesAndDefaultsFeatureFlag() {
        CultureSiteDomainService.NormalizedSiteInput input = service.normalize(request(
                "ancestral_home", null, null
        ));
        assertEquals("ancestral_home", input.siteType());
        assertFalse(input.featuredOnHome());
        assertEquals(0, input.sortOrder());
    }

    @Test
    void rejectsDirectMutationOfOfficialSite() {
        CultureSiteEntity site = new CultureSiteEntity();
        site.setDataStatus("official");
        BusinessException error = assertThrows(BusinessException.class, () -> service.requireDirectlyMutable(site));
        assertEquals("CULTURE_SITE_REVIEW_REQUIRED", error.getCode());
    }

    @Test
    void rejectsStaleVersion() {
        CultureSiteEntity site = new CultureSiteEntity();
        site.setVersion(4L);
        BusinessException error = assertThrows(BusinessException.class, () -> service.requireExpectedVersion(site, 3L));
        assertEquals("CULTURE_SITE_VERSION_CONFLICT", error.getCode());
    }

    private CultureSiteCreateRequest request(String siteType, BigDecimal latitude, BigDecimal longitude) {
        return new CultureSiteCreateRequest(
                2L,
                null,
                siteType,
                "敦本堂宗祠",
                "湖南长沙",
                "清代",
                "存续",
                "场所摘要",
                "场所说明",
                latitude,
                longitude,
                "high",
                "public",
                "normal",
                null,
                null
        );
    }
}
