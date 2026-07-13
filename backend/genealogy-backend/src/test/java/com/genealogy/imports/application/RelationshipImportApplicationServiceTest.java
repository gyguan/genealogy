package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.dto.RelationshipImportPreviewResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.application.RelationshipApplicationService;
import com.genealogy.relationship.dto.RelationshipConflictCheckResponse;
import com.genealogy.relationship.dto.RelationshipResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RelationshipImportApplicationServiceTest {

    @Mock private ImportJobRepository importJobRepository;
    @Mock private ImportJobErrorRepository importJobErrorRepository;
    @Mock private ImportJobRowRepository importJobRowRepository;
    @Mock private PersonRepository personRepository;
    @Mock private RelationshipApplicationService relationshipApplicationService;
    @Mock private AuthorizationApplicationService authorizationApplicationService;
    @Mock private OperationLogApplicationService operationLogApplicationService;

    private RelationshipImportApplicationService service;

    @BeforeEach
    void setUp() {
        service = new RelationshipImportApplicationService(
                importJobRepository,
                importJobErrorRepository,
                importJobRowRepository,
                personRepository,
                relationshipApplicationService,
                authorizationApplicationService,
                new RelationshipImportFilePolicyService(),
                operationLogApplicationService
        );
        when(personRepository.findByClanIdAndPersonCodeAndDeletedAtIsNull(1L, "P1"))
                .thenReturn(List.of(person(11L, "P1", "父亲", "male", 1)));
        when(personRepository.findByClanIdAndPersonCodeAndDeletedAtIsNull(1L, "P2"))
                .thenReturn(List.of(person(12L, "P2", "儿子", "male", 2)));
    }

    @Test
    void previewAndImportShouldUseBusinessCodesAndCreateRelationshipDraft() {
        when(relationshipApplicationService.checkConflict(eq(1L), any(), eq(9L)))
                .thenReturn(RelationshipConflictCheckResponse.passed());
        RelationshipImportPreviewResponse preview = service.preview(1L, 5L, csv(), 9L);
        assertThat(preview.validCount()).isEqualTo(1);
        assertThat(preview.rows().get(0).fromPersonName()).isEqualTo("父亲");

        when(importJobRepository.save(any(ImportJobEntity.class))).thenAnswer(invocation -> {
            ImportJobEntity job = invocation.getArgument(0);
            if (job.getId() == null) job.setId(101L);
            return job;
        });
        when(relationshipApplicationService.create(eq(1L), any(), eq(9L)))
                .thenReturn(relationshipResponse(501L));

        ImportJobResponse result = service.importRelationships(1L, 5L, csv(), 9L);
        assertThat(result.importType()).isEqualTo(ImportJobEntity.TYPE_RELATIONSHIP);
        assertThat(result.successCount()).isEqualTo(1);

        @SuppressWarnings("rawtypes")
        ArgumentCaptor<Iterable> rows = ArgumentCaptor.forClass(Iterable.class);
        verify(importJobRowRepository).saveAll(rows.capture());
        ImportJobRowEntity savedRow = (ImportJobRowEntity) rows.getValue().iterator().next();
        assertThat(savedRow.getDraftTargetType()).isEqualTo(ImportJobEntity.TYPE_RELATIONSHIP);
        assertThat(savedRow.getDraftTargetId()).isEqualTo(501L);
        assertThat(savedRow.getRowStatus()).isEqualTo(ImportJobRowEntity.STATUS_DRAFT_CREATED);
    }

    private MockMultipartFile csv() {
        String content = "关系主体编码,关系对象编码,关系类型,说明\nP1,P2,父子,族谱记载\n";
        return new MockMultipartFile("file", "relationships.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8));
    }

    private PersonEntity person(Long id, String code, String name, String gender, int generation) {
        PersonEntity person = new PersonEntity();
        person.setId(id);
        person.setClanId(1L);
        person.setBranchId(5L);
        person.setPersonCode(code);
        person.setName(name);
        person.setGender(gender);
        person.setGenerationNo(generation);
        person.setDataStatus("official");
        return person;
    }

    private RelationshipResponse relationshipResponse(Long id) {
        return new RelationshipResponse(
                id, 1L, 11L, "父亲", 12L, "儿子", "parent_child", "biological_father",
                "blood", null, null, null, true, true, true, "族谱记载", "medium", "draft",
                LocalDateTime.now(), LocalDateTime.now()
        );
    }
}
