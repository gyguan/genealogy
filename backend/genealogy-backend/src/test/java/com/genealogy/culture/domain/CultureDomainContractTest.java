package com.genealogy.culture.domain;

import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.entity.CultureSiteEntity;
import com.genealogy.culture.entity.MigrationEventEntity;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CultureDomainContractTest {

    @Test
    void cultureCategoriesMatchDatabaseAndOpenApiContract() {
        assertEquals(Set.of(
                        "surname_origin",
                        "hall_name",
                        "commandery",
                        "family_instruction",
                        "ancestor_instruction",
                        "clan_rule",
                        "genealogy_preface",
                        "genealogy_rule",
                        "person_story",
                        "custom_tradition",
                        "other"),
                valuesOf(CultureCategory.values()));
        assertEquals(CultureCategory.HALL_NAME, CultureCategory.fromValue("hall_name"));
    }

    @Test
    void sharedCultureEnumsMatchStableExternalValues() {
        assertEquals(Set.of("draft", "pending_review", "official", "rejected", "archived"),
                valuesOf(CultureDataStatus.values()));
        assertEquals(Set.of("high", "medium", "low", "unknown"),
                valuesOf(CultureConfidenceLevel.values()));
        assertEquals(Set.of("public", "clan_only", "branch_only", "relatives_only", "private", "sealed"),
                valuesOf(CulturePrivacyLevel.values()));
        assertEquals(Set.of("normal", "sensitive", "highly_sensitive"),
                valuesOf(CultureSensitiveLevel.values()));
        assertEquals(Set.of("culture_item", "migration_event", "culture_site"),
                valuesOf(CultureTargetType.values()));
        assertEquals(Set.of("ancestral_hall", "ancestral_home", "cemetery", "memorial", "other"),
                valuesOf(CultureSiteType.values()));
    }

    @Test
    void invalidExternalValueIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> CultureDataStatus.fromValue("approved"));
        assertThrows(IllegalArgumentException.class, () -> CultureCategory.fromValue(" "));
    }

    @Test
    void newEntitiesUseSafeDraftDefaults() {
        CultureItemEntity cultureItem = new CultureItemEntity();
        CultureSiteEntity cultureSite = new CultureSiteEntity();
        MigrationEventEntity migrationEvent = new MigrationEventEntity();

        assertEquals("draft", cultureItem.getDataStatus());
        assertEquals("clan_only", cultureItem.getPrivacyLevel());
        assertEquals("normal", cultureItem.getSensitiveLevel());
        assertEquals("unknown", cultureItem.getConfidenceLevel());
        assertFalse(cultureItem.isFeaturedOnHome());
        assertEquals(0, cultureItem.getSortOrder());

        assertEquals("draft", cultureSite.getDataStatus());
        assertFalse(cultureSite.isFeaturedOnHome());
        assertEquals(0, cultureSite.getSortOrder());

        assertEquals("draft", migrationEvent.getDataStatus());
        assertEquals("clan_only", migrationEvent.getPrivacyLevel());
    }

    private static Set<String> valuesOf(CultureValue[] values) {
        return Arrays.stream(values)
                .map(CultureValue::value)
                .collect(Collectors.toUnmodifiableSet());
    }
}
