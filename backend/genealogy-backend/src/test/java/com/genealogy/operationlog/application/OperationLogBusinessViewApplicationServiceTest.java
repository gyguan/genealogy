package com.genealogy.operationlog.application;

import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OperationLogBusinessViewApplicationServiceTest {

    private final RbacAuthorizationApplicationService authorization = mock(RbacAuthorizationApplicationService.class);
    private final AppUserRepository appUserRepository = mock(AppUserRepository.class);
    private final PersonRepository personRepository = mock(PersonRepository.class);
    private final RelationshipRepository relationshipRepository = mock(RelationshipRepository.class);
    private final SourceRepository sourceRepository = mock(SourceRepository.class);
    private final SourceBindingRepository sourceBindingRepository = mock(SourceBindingRepository.class);
    private final BranchRepository branchRepository = mock(BranchRepository.class);
    private final ClanRepository clanRepository = mock(ClanRepository.class);
    private final ReviewTaskRepository reviewTaskRepository = mock(ReviewTaskRepository.class);
    private final RevisionRepository revisionRepository = mock(RevisionRepository.class);

    private final OperationLogBusinessViewApplicationService service = new OperationLogBusinessViewApplicationService(
            authorization,
            appUserRepository,
            personRepository,
            relationshipRepository,
            sourceRepository,
            sourceBindingRepository,
            branchRepository,
            clanRepository,
            reviewTaskRepository,
            revisionRepository
    );

    @Test
    void enrichesCurrentPageWithOneBatchPerEntityTypeAndUnknownActorFallback() {
        when(authorization.permissionDataScope(9L, 1L, "operation_log.view"))
                .thenReturn(PermissionDataScope.full());
        AppUserEntity knownActor = new AppUserEntity();
        knownActor.setId(20L);
        knownActor.setDisplayName("张审核员");
        when(appUserRepository.findAllById(Set.of(20L, 21L))).thenReturn(List.of(knownActor));

        PersonEntity first = person(30L, "张三", "海靖公", 5L, "clan_only");
        PersonEntity second = person(31L, "张四", null, 5L, "clan_only");
        when(personRepository.findAllById(Set.of(30L, 31L))).thenReturn(List.of(first, second));
        BranchEntity branch = new BranchEntity();
        branch.setId(5L);
        branch.setClanId(1L);
        branch.setBranchName("长房");
        when(branchRepository.findAllById(Set.of(5L))).thenReturn(List.of(branch));
        stubEmptyRelatedQueries();

        PageResponse<OperationLogResponse> result = service.enrich(
                PageResponse.of(List.of(
                        rawLog(1L, 20L, 30L),
                        rawLog(2L, 21L, 31L)
                ), 2L, 1, 20),
                1L,
                9L
        );

        assertThat(result.records()).extracting(OperationLogResponse::actorDisplayName)
                .containsExactly("张审核员", "未知操作者");
        assertThat(result.records()).extracting(OperationLogResponse::targetDisplayName)
                .containsExactly("海靖公", "张四");
        assertThat(result.records()).extracting(OperationLogResponse::targetBranchName)
                .containsExactly("长房", "长房");
        verify(appUserRepository, times(1)).findAllById(Set.of(20L, 21L));
        verify(personRepository, times(1)).findAllById(Set.of(30L, 31L));
        verify(branchRepository, times(1)).findAllById(Set.of(5L));
    }

    @Test
    void hidesSealedAndOutOfScopePeopleFromBusinessDisplayFields() {
        when(authorization.permissionDataScope(9L, 1L, "operation_log.view"))
                .thenReturn(PermissionDataScope.branches(Set.of(5L)));
        when(appUserRepository.findAllById(Set.of(20L))).thenReturn(List.of());
        PersonEntity sealed = person(30L, "隐私人物", null, 5L, "sealed");
        PersonEntity otherBranch = person(31L, "其他支派人物", null, 6L, "clan_only");
        when(personRepository.findAllById(Set.of(30L, 31L))).thenReturn(List.of(sealed, otherBranch));
        when(branchRepository.findAllById(Set.of(5L, 6L))).thenReturn(List.of());
        stubEmptyRelatedQueries();

        PageResponse<OperationLogResponse> result = service.enrich(
                PageResponse.of(List.of(rawLog(1L, 20L, 30L), rawLog(2L, 20L, 31L)), 2L, 1, 20),
                1L,
                9L
        );

        assertThat(result.records()).allSatisfy(log -> {
            assertThat(log.targetDisplayName()).isNull();
            assertThat(log.targetBranchName()).isNull();
            assertThat(log.targetSummary()).isNull();
            assertThat(log.resultStatus()).isNull();
        });
    }

    private void stubEmptyRelatedQueries() {
        when(reviewTaskRepository.findAllById(List.of())).thenReturn(List.of());
        when(revisionRepository.findAllById(List.of())).thenReturn(List.of());
        when(relationshipRepository.findAllById(Set.of())).thenReturn(List.of());
        when(sourceRepository.findAllById(Set.of())).thenReturn(List.of());
        when(clanRepository.findAllById(Set.of())).thenReturn(List.of());
    }

    private PersonEntity person(Long id, String name, String genealogyName, Long branchId, String privacyLevel) {
        PersonEntity person = new PersonEntity();
        person.setId(id);
        person.setClanId(1L);
        person.setName(name);
        person.setGenealogyName(genealogyName);
        person.setBranchId(branchId);
        person.setPrivacyLevel(privacyLevel);
        person.setDataStatus("official");
        person.setCreatedAt(LocalDateTime.of(2026, 7, 1, 8, 0));
        return person;
    }

    private OperationLogResponse rawLog(Long id, Long actorId, Long targetId) {
        return new OperationLogResponse(
                id,
                1L,
                actorId,
                null,
                "person_update",
                "person",
                targetId,
                null,
                null,
                null,
                null,
                "更新人物",
                null,
                null,
                null,
                LocalDateTime.of(2026, 7, 1, 9, 0)
        );
    }
}
