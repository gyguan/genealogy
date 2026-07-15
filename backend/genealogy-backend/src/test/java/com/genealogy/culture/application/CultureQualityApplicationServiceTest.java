package com.genealogy.culture.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.dto.CultureQualityResponse;
import com.genealogy.culture.governance.CultureTargetAction;
import com.genealogy.culture.governance.CultureTargetContext;
import com.genealogy.culture.governance.CultureTargetGovernanceAdapter;
import com.genealogy.culture.governance.CultureTargetGovernanceRegistry;
import com.genealogy.culture.repository.CultureQualityQueryRepository;
import com.genealogy.culture.repository.CultureQualityQueryRepository.QualityIssue;
import com.genealogy.culture.repository.CultureQualityQueryRepository.QualityMetrics;
import com.genealogy.culture.repository.CultureQualityQueryRepository.QualityScope;
import com.genealogy.culture.repository.CultureQualityQueryRepository.TargetConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CultureQualityApplicationServiceTest {

    @Mock private AuthorizationApplicationService authorizationApplicationService;
    @Mock private RbacAuthorizationApplicationService rbacAuthorizationApplicationService;
    @Mock private CultureQualityQueryRepository qualityQueryRepository;

    private CultureQualityApplicationService service;

    @BeforeEach
    void setUp() {
        CultureTargetGovernanceRegistry registry = new CultureTargetGovernanceRegistry(List.of(
                adapter("culture_item"), adapter("migration_event"), adapter("culture_site")
        ));
        service = new CultureQualityApplicationService(
                authorizationApplicationService, rbacAuthorizationApplicationService, registry, qualityQueryRepository);
    }

    @Test
    void aggregatesOnlyTargetTypesWithVisibleScopeAndPreservesSensitiveBranchScope() {
        when(authorizationApplicationService.isCrossClanAdmin(7L)).thenReturn(false);
        when(rbacAuthorizationApplicationService.permissionDataScope(7L, 1L, "culture_item.view"))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.full());
        when(rbacAuthorizationApplicationService.permissionDataScope(7L, 1L, "migration_event.view"))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.branches(Set.of(20L, 21L)));
        when(rbacAuthorizationApplicationService.permissionDataScope(7L, 1L, "culture_site.view"))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.none());
        when(rbacAuthorizationApplicationService.permissionDataScope(7L, 1L, "culture_item.view_sensitive"))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.branches(Set.of(10L)));
        when(rbacAuthorizationApplicationService.permissionDataScope(7L, 1L, "migration_event.view_sensitive"))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.none());

        when(qualityQueryRepository.metrics(eq(TargetConfig.CULTURE_ITEM), any(QualityScope.class)))
                .thenReturn(new QualityMetrics(10, 2, 8, 5, 7, 2, 1));
        when(qualityQueryRepository.metrics(eq(TargetConfig.MIGRATION_EVENT), any(QualityScope.class)))
                .thenReturn(new QualityMetrics(5, 1, 4, 2, 3, 1, 2));
        when(qualityQueryRepository.issues(eq(TargetConfig.CULTURE_ITEM), any(QualityScope.class), eq(10)))
                .thenReturn(List.of(new QualityIssue(
                        "culture_item", 100L, "家训", null, null,
                        List.of("NO_SOURCE"), LocalDateTime.of(2025, 1, 1, 0, 0))));
        when(qualityQueryRepository.issues(eq(TargetConfig.MIGRATION_EVENT), any(QualityScope.class), eq(10)))
                .thenReturn(List.of(new QualityIssue(
                        "migration_event", 200L, "甲地 → 乙地", 20L, "二房",
                        List.of("PENDING_REVIEW"), LocalDateTime.of(2026, 1, 1, 0, 0))));

        CultureQualityResponse response = service.getQuality(1L, 7L);

        assertThat(response.overall().officialCount()).isEqualTo(15);
        assertThat(response.overall().pendingReviewCount()).isEqualTo(3);
        assertThat(response.overall().sourceCoverageRate()).isEqualTo(0.8D);
        assertThat(response.byTargetType()).extracting(metric -> metric.targetType())
                .containsExactly("culture_item", "migration_event");
        assertThat(response.issues()).extracting(issue -> issue.targetType())
                .containsExactly("migration_event", "culture_item");
        verify(qualityQueryRepository, never()).metrics(eq(TargetConfig.CULTURE_SITE), any(QualityScope.class));

        ArgumentCaptor<QualityScope> itemScope = ArgumentCaptor.forClass(QualityScope.class);
        verify(qualityQueryRepository).metrics(eq(TargetConfig.CULTURE_ITEM), itemScope.capture());
        assertThat(itemScope.getValue().fullClanAccess()).isTrue();
        assertThat(itemScope.getValue().sensitiveFullClanAccess()).isFalse();
        assertThat(itemScope.getValue().sensitiveBranchIds()).containsExactly(10L);
    }

    @Test
    void rejectsWhenNoCultureTargetTypeIsVisible() {
        when(authorizationApplicationService.isCrossClanAdmin(7L)).thenReturn(false);
        when(rbacAuthorizationApplicationService.permissionDataScope(eq(7L), eq(1L), any()))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.none());

        assertThatThrownBy(() -> service.getQuality(1L, 7L))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getCode()).isEqualTo("AUTH_FORBIDDEN"));
    }

    private CultureTargetGovernanceAdapter adapter(String type) {
        return new CultureTargetGovernanceAdapter() {
            @Override public String targetType() { return type; }
            @Override public String viewPermission() { return type + ".view"; }
            @Override public String sensitiveViewPermission() { return type + ".view_sensitive"; }
            @Override public String restrictedLogSummary() { return "restricted"; }
            @Override public CultureTargetContext requireExisting(Long targetId) { return null; }
            @Override public CultureTargetContext require(Long targetId, Long actorId, CultureTargetAction action) { return null; }
        };
    }
}
