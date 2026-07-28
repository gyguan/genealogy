package com.genealogy.workbench.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

class WorkbenchApplicationServiceScopeTest {

    @Mock
    private AuthorizationApplicationService authorizationApplicationService;
    @Mock
    private RbacAuthorizationApplicationService rbacAuthorizationApplicationService;
    @Mock
    private ClanRepository clanRepository;
    @Mock
    private PersonRepository personRepository;
    @Mock
    private BranchRepository branchRepository;
    @Mock
    private SourceRepository sourceRepository;
    @Mock
    private CheckTaskRepository checkTaskRepository;

    private WorkbenchApplicationService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new WorkbenchApplicationService(
                authorizationApplicationService,
                rbacAuthorizationApplicationService,
                clanRepository,
                personRepository,
                branchRepository,
                sourceRepository,
                checkTaskRepository
        );
        when(authorizationApplicationService.isCrossClanAdmin(99L)).thenReturn(false);
        when(branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(1L)).thenReturn(List.of(
                branch(10L, "授权支派"),
                branch(11L, "下级支派"),
                branch(20L, "兄弟支派")
        ));
        when(checkTaskRepository.findByClanIdAndStatus(1L, "pending")).thenReturn(List.of());
        when(sourceRepository.findByClanId(1L, org.springframework.data.domain.PageRequest.of(0, 1)))
                .thenReturn(org.springframework.data.domain.Page.empty());
    }

    @Test
    void restrictsTaskRecordsAndTotalToVisibleBranchSubtree() {
        when(rbacAuthorizationApplicationService.permissionDataScope(99L, 1L, "person:view"))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.branches(Set.of(10L, 11L)));
        when(personRepository.findByClanIdAndDeletedAtIsNull(1L)).thenReturn(List.of(
                person(101L, 10L, "授权支派人物"),
                person(102L, 11L, "下级支派人物"),
                person(201L, 20L, "兄弟支派人物")
        ));

        var response = service.tasks(
                1L, null, null, null, List.of("generation_mismatch"), null, null, null,
                null, null, 1, 20, 99L
        );

        assertThat(response.total()).isEqualTo(2);
        assertThat(response.records()).extracting("objectName")
                .containsExactly("授权支派人物", "下级支派人物")
                .doesNotContain("兄弟支派人物");
    }

    @Test
    void rejectsExplicitSiblingBranchQuery() {
        when(branchRepository.findByIdAndClanId(20L, 1L)).thenReturn(Optional.of(branch(20L, "兄弟支派")));
        when(rbacAuthorizationApplicationService.permissionDataScope(99L, 1L, "person:view"))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.branches(Set.of(10L, 11L)));

        assertThatThrownBy(() -> service.tasks(
                1L, 20L, null, null, null, null, null, null,
                null, null, 1, 20, 99L
        )).isInstanceOf(BusinessException.class)
                .hasMessageContaining("暂无权限查看该支派");
    }

    @Test
    void rejectsActiveMemberWithoutEffectiveRole() {
        when(rbacAuthorizationApplicationService.permissionDataScope(99L, 1L, "person:view"))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.none());

        assertThatThrownBy(() -> service.summary(1L, null, 99L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("暂无权限查看修谱任务");
    }

    private BranchEntity branch(Long id, String name) {
        BranchEntity branch = new BranchEntity();
        branch.setId(id);
        branch.setClanId(1L);
        branch.setBranchName(name);
        return branch;
    }

    private PersonEntity person(Long id, Long branchId, String name) {
        PersonEntity person = new PersonEntity();
        person.setId(id);
        person.setClanId(1L);
        person.setBranchId(branchId);
        person.setName(name);
        person.setGenerationNo(null);
        person.setGenerationWord(null);
        person.setCreatedAt(LocalDateTime.now());
        person.setUpdatedAt(LocalDateTime.now());
        return person;
    }
}
