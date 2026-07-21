package com.genealogy.person.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.review.application.RevisionWorkflowApplicationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PersonRevisionDraftDeleteTest {

    @Mock private PersonApplicationService personApplicationService;
    @Mock private PersonRepository personRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private AuthorizationApplicationService authorizationApplicationService;
    @Mock private RevisionWorkflowApplicationService revisionWorkflowApplicationService;

    private PersonRevisionApplicationService service;

    @BeforeEach
    void setUp() {
        service = new PersonRevisionApplicationService(
                personApplicationService,
                personRepository,
                branchRepository,
                authorizationApplicationService,
                revisionWorkflowApplicationService
        );
    }

    @Test
    void draftPersonUsesDirectDeleteInsteadOfRevisionWorkflow() {
        PersonEntity draft = person("draft");
        when(personRepository.findByIdAndDeletedAtIsNull(101L)).thenReturn(Optional.of(draft));

        service.delete(101L, 9L);

        verify(personApplicationService).delete(101L, 9L);
        verifyNoInteractions(authorizationApplicationService, revisionWorkflowApplicationService);
        verify(personRepository, never()).save(any(PersonEntity.class));
    }

    @Test
    void officialPersonStillUsesDeleteRevisionWorkflow() {
        PersonEntity official = person("official");
        when(personRepository.findByIdAndDeletedAtIsNull(101L)).thenReturn(Optional.of(official));
        when(personRepository.save(any(PersonEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.delete(101L, 9L);

        verify(personApplicationService, never()).delete(anyLong(), anyLong());
        verify(authorizationApplicationService).requireBranchPermission(1L, 9L, 2L, "person:delete");
        verify(revisionWorkflowApplicationService).submitRevision(
                anyLong(),
                anyString(),
                anyLong(),
                anyLong(),
                anyLong(),
                anyString(),
                any(),
                any(),
                anyString(),
                anyString()
        );
        verify(personRepository).save(official);
    }

    private PersonEntity person(String status) {
        PersonEntity entity = new PersonEntity();
        entity.setId(101L);
        entity.setClanId(1L);
        entity.setBranchId(2L);
        entity.setName("测试人物");
        entity.setDataStatus(status);
        return entity;
    }
}
