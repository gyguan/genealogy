package com.genealogy.culture.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.entity.CultureSiteEntity;
import com.genealogy.culture.entity.MigrationEventEntity;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CultureDraftDeletePolicyTest {

    private final CultureItemDomainService itemDomainService = new CultureItemDomainService();
    private final MigrationEventDomainService migrationDomainService = new MigrationEventDomainService();
    private final CultureSiteDomainService siteDomainService = new CultureSiteDomainService();

    @Test
    void draftCultureObjectsCanBeDeletedDirectly() {
        CultureItemEntity item = new CultureItemEntity();
        item.setDataStatus("draft");
        MigrationEventEntity migration = new MigrationEventEntity();
        migration.setDataStatus("draft");
        CultureSiteEntity site = new CultureSiteEntity();
        site.setDataStatus("draft");

        assertThatCode(() -> itemDomainService.requireDirectlyDeletable(item)).doesNotThrowAnyException();
        assertThatCode(() -> migrationDomainService.requireDirectlyDeletable(migration)).doesNotThrowAnyException();
        assertThatCode(() -> siteDomainService.requireDirectlyDeletable(site)).doesNotThrowAnyException();
        assertThat(itemDomainService.isDirectlyDeletable(item)).isTrue();
        assertThat(migrationDomainService.isDirectlyDeletable(migration)).isTrue();
        assertThat(siteDomainService.isDirectlyDeletable(site)).isTrue();
    }

    @Test
    void rejectedCultureObjectsRemainEditableButCannotBeDeletedDirectly() {
        CultureItemEntity item = new CultureItemEntity();
        item.setDataStatus("rejected");
        MigrationEventEntity migration = new MigrationEventEntity();
        migration.setDataStatus("rejected");
        CultureSiteEntity site = new CultureSiteEntity();
        site.setDataStatus("rejected");

        assertThatCode(() -> itemDomainService.requireDirectlyMutable(item)).doesNotThrowAnyException();
        assertThatCode(() -> migrationDomainService.requireDirectlyMutable(migration)).doesNotThrowAnyException();
        assertThatCode(() -> siteDomainService.requireDirectlyMutable(site)).doesNotThrowAnyException();

        assertDeleteRejected(() -> itemDomainService.requireDirectlyDeletable(item), "CULTURE_ITEM_DELETE_DRAFT_ONLY");
        assertDeleteRejected(() -> migrationDomainService.requireDirectlyDeletable(migration), "MIGRATION_EVENT_DELETE_DRAFT_ONLY");
        assertDeleteRejected(() -> siteDomainService.requireDirectlyDeletable(site), "CULTURE_SITE_DELETE_DRAFT_ONLY");
    }

    @Test
    void pendingAndArchivedCultureObjectsCannotBeDeletedDirectly() {
        for (String status : new String[]{"pending_review", "archived", "official"}) {
            CultureItemEntity item = new CultureItemEntity();
            item.setDataStatus(status);
            assertDeleteRejected(() -> itemDomainService.requireDirectlyDeletable(item), "CULTURE_ITEM_DELETE_DRAFT_ONLY");

            MigrationEventEntity migration = new MigrationEventEntity();
            migration.setDataStatus(status);
            assertDeleteRejected(() -> migrationDomainService.requireDirectlyDeletable(migration), "MIGRATION_EVENT_DELETE_DRAFT_ONLY");

            CultureSiteEntity site = new CultureSiteEntity();
            site.setDataStatus(status);
            assertDeleteRejected(() -> siteDomainService.requireDirectlyDeletable(site), "CULTURE_SITE_DELETE_DRAFT_ONLY");
        }
    }

    private void assertDeleteRejected(Runnable command, String errorCode) {
        assertThatThrownBy(command::run)
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo(errorCode));
    }
}
