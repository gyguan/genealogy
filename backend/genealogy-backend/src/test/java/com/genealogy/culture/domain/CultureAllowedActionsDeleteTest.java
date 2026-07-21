package com.genealogy.culture.domain;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.culture.entity.CultureSiteEntity;
import com.genealogy.culture.entity.MigrationEventEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CultureAllowedActionsDeleteTest {

    @Mock
    private AuthorizationApplicationService authorizationApplicationService;
    @Mock
    private RbacAuthorizationApplicationService rbacAuthorizationApplicationService;

    private MigrationEventPermissionPolicyService migrationPolicy;
    private CultureSitePermissionPolicyService sitePolicy;

    @BeforeEach
    void setUp() {
        migrationPolicy = new MigrationEventPermissionPolicyService(
                authorizationApplicationService,
                rbacAuthorizationApplicationService
        );
        sitePolicy = new CultureSitePermissionPolicyService(
                authorizationApplicationService,
                rbacAuthorizationApplicationService
        );
        when(authorizationApplicationService.isCrossClanAdmin(9L)).thenReturn(true);
    }

    @Test
    void draftExposesDirectDelete() {
        assertThat(migrationPolicy.allowedActions(migration("draft"), 9L, false))
                .contains("update", "delete", "submit_review");
        assertThat(sitePolicy.allowedActions(site("draft"), 9L, false))
                .contains("update", "delete", "submit_review");
    }

    @Test
    void rejectedRemainsEditableWithoutDirectDelete() {
        List<String> migrationActions = migrationPolicy.allowedActions(migration("rejected"), 9L, false);
        List<String> siteActions = sitePolicy.allowedActions(site("rejected"), 9L, false);

        assertThat(migrationActions).contains("update", "submit_review").doesNotContain("delete", "request_delete");
        assertThat(siteActions).contains("update", "submit_review").doesNotContain("delete", "request_delete");
    }

    @Test
    void officialExposesReviewDeleteInsteadOfDirectDelete() {
        assertThat(migrationPolicy.allowedActions(migration("official"), 9L, false))
                .contains("request_delete")
                .doesNotContain("delete");
        assertThat(sitePolicy.allowedActions(site("official"), 9L, false))
                .contains("request_delete")
                .doesNotContain("delete");
    }

    private MigrationEventEntity migration(String status) {
        MigrationEventEntity event = new MigrationEventEntity();
        event.setClanId(1L);
        event.setBranchId(7L);
        event.setCreatedBy(9L);
        event.setDataStatus(status);
        event.setPrivacyLevel("clan_only");
        event.setSensitiveLevel("normal");
        return event;
    }

    private CultureSiteEntity site(String status) {
        CultureSiteEntity site = new CultureSiteEntity();
        site.setClanId(1L);
        site.setBranchId(7L);
        site.setCreatedBy(9L);
        site.setDataStatus(status);
        site.setPrivacyLevel("clan_only");
        site.setSensitiveLevel("normal");
        return site;
    }
}
