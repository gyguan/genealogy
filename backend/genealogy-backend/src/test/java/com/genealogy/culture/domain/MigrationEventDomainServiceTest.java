package com.genealogy.culture.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.dto.MigrationEventCreateRequest;
import com.genealogy.culture.dto.MigrationEventSearchCriteria;
import com.genealogy.culture.entity.MigrationEventEntity;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MigrationEventDomainServiceTest {

    private final MigrationEventDomainService service = new MigrationEventDomainService();

    @Test
    void normalizesStructuredMigrationInput() {
        MigrationEventCreateRequest request = new MigrationEventCreateRequest(
                9L, 2, "  江西吉安  ", "  湖南长沙  ", "  明代中期  ", 18L,
                "  避乱迁居  ", "  族谱卷三记载  ", " HIGH ", " CLAN_ONLY ", " NORMAL "
        );

        MigrationEventDomainService.NormalizedMigrationEventInput input = service.normalize(request);

        assertEquals(9L, input.branchId());
        assertEquals(2, input.sequenceNo());
        assertEquals("江西吉安", input.fromLocation());
        assertEquals("湖南长沙", input.toLocation());
        assertEquals("明代中期", input.migrationTimeText());
        assertEquals("high", input.confidenceLevel());
        assertEquals("clan_only", input.privacyLevel());
    }

    @Test
    void rejectsMissingAndSelfRoutes() {
        BusinessException missingFrom = assertThrows(BusinessException.class, () -> service.normalize(
                new MigrationEventCreateRequest(
                        9L, 1, " ", "湖南长沙", null, null, null, null,
                        "unknown", "clan_only", "normal"
                )
        ));
        assertEquals("MIGRATION_EVENT_FROM_REQUIRED", missingFrom.getCode());

        BusinessException selfRoute = assertThrows(BusinessException.class, () -> service.normalize(
                new MigrationEventCreateRequest(
                        9L, 1, "湖南  长沙", " 湖南 长沙 ", null, null, null, null,
                        "unknown", "clan_only", "normal"
                )
        ));
        assertEquals("MIGRATION_EVENT_SELF_ROUTE", selfRoute.getCode());
    }

    @Test
    void validatesBranchSequenceAndFounderIdentifiers() {
        assertEquals("MIGRATION_EVENT_BRANCH_REQUIRED", assertThrows(BusinessException.class, () -> service.normalize(
                new MigrationEventCreateRequest(
                        null, 1, "江西吉安", "湖南长沙", null, null, null, null,
                        "unknown", "clan_only", "normal"
                )
        )).getCode());

        assertEquals("MIGRATION_EVENT_SEQUENCE_INVALID", assertThrows(BusinessException.class, () -> service.normalize(
                new MigrationEventCreateRequest(
                        9L, 0, "江西吉安", "湖南长沙", null, null, null, null,
                        "unknown", "clan_only", "normal"
                )
        )).getCode());

        assertEquals("MIGRATION_EVENT_FOUNDER_INVALID", assertThrows(BusinessException.class, () -> service.normalize(
                new MigrationEventCreateRequest(
                        9L, 1, "江西吉安", "湖南长沙", null, 0L, null, null,
                        "unknown", "clan_only", "normal"
                )
        )).getCode());
    }

    @Test
    void onlyDraftAndRejectedAreDirectlyMutable() {
        MigrationEventEntity event = new MigrationEventEntity();
        event.setDataStatus("draft");
        assertTrue(service.isDirectlyMutable(event));

        event.setDataStatus("rejected");
        assertTrue(service.isDirectlyMutable(event));

        event.setDataStatus("pending_review");
        assertFalse(service.isDirectlyMutable(event));
        assertEquals("MIGRATION_EVENT_PENDING_REVIEW",
                assertThrows(BusinessException.class, () -> service.requireDirectlyMutable(event)).getCode());

        event.setDataStatus("official");
        assertEquals("MIGRATION_EVENT_REVIEW_REQUIRED",
                assertThrows(BusinessException.class, () -> service.requireDirectlyMutable(event)).getCode());
    }

    @Test
    void validatesVersionAndSortWhitelist() {
        MigrationEventEntity event = new MigrationEventEntity();
        event.setVersion(3L);
        service.requireExpectedVersion(event, 3L);
        assertEquals("MIGRATION_EVENT_VERSION_CONFLICT",
                assertThrows(BusinessException.class, () -> service.requireExpectedVersion(event, 2L)).getCode());

        MigrationEventSearchCriteria fallback = service.normalize(new MigrationEventSearchCriteria(
                null, null, null, null, null, null, null, null, null, "description,desc"
        ));
        assertEquals("sequenceNo", service.sortField(fallback.sort()));
        assertFalse(service.sortAscending(fallback.sort()));
    }
}
