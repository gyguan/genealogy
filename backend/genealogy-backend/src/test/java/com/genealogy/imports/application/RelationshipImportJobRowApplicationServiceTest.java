package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobRowResponse;
import com.genealogy.imports.dto.RelationshipImportRowRetryRequest;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.relationship.application.RelationshipApplicationService;
import com.genealogy.relationship.dto.RelationshipCreateRequest;
import com.genealogy.relationship.dto.RelationshipResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RelationshipImportJobRowApplicationServiceTest {

    @Mock private ImportJobRepository importJobRepository;
    @Mock private ImportJobRowRepository importJobRowRepository;
    @Mock private ImportJobErrorRepository importJobErrorRepository;
    @Mock private RelationshipImportApplicationService relationshipImportApplicationService;
    @Mock private RelationshipApplicationService relationshipApplicationService;
    @Mock private AuthorizationApplicationService authorizationApplicationService;
    @Mock private OperationLogApplicationService operationLogApplicationService;

    private RelationshipImportJobRowApplicationService service;

    @BeforeEach
    void setUp() {
        service = new RelationshipImportJobRowApplicationService(
                importJobRepository,
                importJobRowRepository,
                importJobErrorRepository,
                relationshipImportApplicationService,
                relationshipApplicationService,
                authorizationApplicationService,
                operationLogApplicationService
        );
    }

    @Test
    void successfulRetryShouldCreateRelationshipDraftAndCompleteBatch() {
        ImportJobEntity job = correctableJob();
        ImportJobRowEntity row = failedRow();
        PersonEntity from = person(11L, "P1", "父亲", "male");
        PersonEntity to = person(12L, "P2", "儿子", "male");
        var kind = RelationshipImportTemplateDefinition.RELATIONSHIP_KINDS.get("父子");
        var parsed = new RelationshipImportApplicationService.ParsedRelationship(
                from, to, "P1", "P2", "父子", kind, "修正后说明"
        );
        RelationshipCreateRequest createRequest = new RelationshipCreateRequest(
                11L, 12L, "parent_child", "biological_father", "blood",
                null, null, null, true, true, true, "修正后说明", "medium"
        );

        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.findByIdAndJobId(201L, 101L)).thenReturn(Optional.of(row));
        when(relationshipImportApplicationService.parseAndResolve(eq(1L), any())).thenReturn(parsed);
        when(relationshipImportApplicationService.createRequest(parsed)).thenReturn(createRequest);
        when(relationshipApplicationService.create(1L, createRequest, 9L)).thenReturn(relationshipResponse(501L));
        when(importJobRowRepository.saveAndFlush(any(ImportJobRowEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(importJobRowRepository.countByJobId(101L)).thenReturn(1L);
        when(importJobRowRepository.countByJobIdAndRowStatus(101L, ImportJobRowEntity.STATUS_DRAFT_CREATED)).thenReturn(1L);
        when(importJobRowRepository.countByJobIdAndRowStatusIn(101L, Set.of(
                ImportJobRowEntity.STATUS_INVALID,
                ImportJobRowEntity.STATUS_RETRY_FAILED
        ))).thenReturn(0L);
        when(importJobRepository.save(any(ImportJobEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ImportJobRowResponse result = service.retry(
                1L,
                101L,
                201L,
                new RelationshipImportRowRetryRequest("P1", "P2", "父子", "修正后说明", 0L),
                9L
        );

        assertThat(result.rowStatus()).isEqualTo(ImportJobRowEntity.STATUS_DRAFT_CREATED);
        assertThat(result.draftCreated()).isTrue();
        assertThat(row.getDraftTargetType()).isEqualTo(ImportJobEntity.TYPE_RELATIONSHIP);
        assertThat(row.getDraftTargetId()).isEqualTo(501L);
        assertThat(job.getProcessingStatus()).isEqualTo(ImportJobEntity.PROCESSING_READY_FOR_REVIEW);
        assertThat(job.getFailureCount()).isZero();
        verify(importJobErrorRepository).deleteByJobIdAndRowNo(101L, 3);
    }

    @Test
    void versionConflictShouldNotCreateRelationship() {
        ImportJobEntity job = correctableJob();
        ImportJobRowEntity row = failedRow();
        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.findByIdAndJobId(201L, 101L)).thenReturn(Optional.of(row));

        assertThatThrownBy(() -> service.retry(
                1L,
                101L,
                201L,
                new RelationshipImportRowRetryRequest("P1", "P2", "父子", null, 1L),
                9L
        )).isInstanceOf(BusinessException.class)
                .hasMessage("该行已被其他用户修改，请刷新后重试");

        verify(relationshipApplicationService, never()).create(any(), any(), any());
    }

    private ImportJobEntity correctableJob() {
        ImportJobEntity job = new ImportJobEntity();
        job.setId(101L);
        job.setClanId(1L);
        job.setBranchId(5L);
        job.setImportType(ImportJobEntity.TYPE_RELATIONSHIP);
        job.setFileFormat(ImportJobEntity.FORMAT_CSV);
        job.setStatus("failed");
        job.setProcessingStatus(ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        job.setReviewStatus(ImportJobEntity.REVIEW_NOT_SUBMITTED);
        job.setReviewRound(0);
        job.setTotalCount(1);
        job.setSuccessCount(0);
        job.setFailureCount(1);
        return job;
    }

    private ImportJobRowEntity failedRow() {
        ImportJobRowEntity row = new ImportJobRowEntity();
        row.setId(201L);
        row.setJobId(101L);
        row.setRowNo(3);
        row.setRawData("P1,P2,父子,说明");
        row.setRowStatus(ImportJobRowEntity.STATUS_INVALID);
        row.setRetryCount(0);
        row.setVersion(0L);
        row.setCreatedAt(LocalDateTime.now().minusMinutes(5));
        row.setUpdatedAt(LocalDateTime.now().minusMinutes(5));
        return row;
    }

    private PersonEntity person(Long id, String code, String name, String gender) {
        PersonEntity person = new PersonEntity();
        person.setId(id);
        person.setClanId(1L);
        person.setBranchId(5L);
        person.setPersonCode(code);
        person.setName(name);
        person.setGender(gender);
        person.setDataStatus("official");
        return person;
    }

    private RelationshipResponse relationshipResponse(Long id) {
        return new RelationshipResponse(
                id, 1L, 11L, "父亲", 12L, "儿子", "parent_child", "biological_father",
                "blood", null, null, null, true, true, true, "修正后说明", "medium", "draft",
                LocalDateTime.now(), LocalDateTime.now()
        );
    }
}
