package com.genealogy.imports.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.imports.dto.ImportJobReviewSubmitRequest;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RelationshipImportJobReviewApplicationServiceTest {

    @Mock private ImportJobRepository importJobRepository;
    @Mock private ImportJobRowRepository importJobRowRepository;
    @Mock private PersonRepository personRepository;
    @Mock private RelationshipRepository relationshipRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private AuditRecordRepository auditRecordRepository;
    @Mock private CheckTaskRepository checkTaskRepository;
    @Mock private AuthorizationApplicationService authorizationApplicationService;
    @Mock private OperationLogApplicationService operationLogApplicationService;

    private ImportJobReviewApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ImportJobReviewApplicationService(
                importJobRepository,
                importJobRowRepository,
                personRepository,
                relationshipRepository,
                branchRepository,
                auditRecordRepository,
                checkTaskRepository,
                authorizationApplicationService,
                operationLogApplicationService,
                new ObjectMapper()
        );
    }

    @Test
    void readyRelationshipBatchShouldLockDraftAndCreateGenericReviewTask() {
        ImportJobEntity job = new ImportJobEntity();
        job.setId(101L);
        job.setClanId(1L);
        job.setBranchId(5L);
        job.setImportType(ImportJobEntity.TYPE_RELATIONSHIP);
        job.setOriginalFilename("relationships.xlsx");
        job.setTotalCount(1);
        job.setSuccessCount(1);
        job.setFailureCount(0);
        job.setProcessingStatus(ImportJobEntity.PROCESSING_READY_FOR_REVIEW);
        job.setReviewStatus(ImportJobEntity.REVIEW_NOT_SUBMITTED);
        job.setReviewRound(0);

        ImportJobRowEntity row = new ImportJobRowEntity();
        row.setJobId(101L);
        row.setRowNo(2);
        row.setRowStatus(ImportJobRowEntity.STATUS_DRAFT_CREATED);
        row.setDraftTargetType(ImportJobEntity.TYPE_RELATIONSHIP);
        row.setDraftTargetId(501L);

        RelationshipEntity relationship = new RelationshipEntity();
        relationship.setId(501L);
        relationship.setClanId(1L);
        relationship.setFromPersonId(11L);
        relationship.setToPersonId(12L);
        relationship.setRelationType("parent_child");
        relationship.setDataStatus("draft");

        PersonEntity from = person(11L, 7L);
        PersonEntity to = person(12L, 8L);

        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.countByJobId(101L)).thenReturn(1L);
        when(importJobRowRepository.countByJobIdAndRowStatus(101L, ImportJobRowEntity.STATUS_DRAFT_CREATED)).thenReturn(1L);
        when(importJobRowRepository.countByJobIdAndRowStatus(101L, ImportJobRowEntity.STATUS_EXCLUDED)).thenReturn(0L);
        when(importJobRowRepository.findByJobIdAndRowStatusOrderByRowNoAsc(101L, ImportJobRowEntity.STATUS_DRAFT_CREATED))
                .thenReturn(List.of(row));
        when(relationshipRepository.findByIdAndClanIdAndDeletedAtIsNull(501L, 1L)).thenReturn(Optional.of(relationship));
        when(personRepository.findByIdAndDeletedAtIsNull(11L)).thenReturn(Optional.of(from));
        when(personRepository.findByIdAndDeletedAtIsNull(12L)).thenReturn(Optional.of(to));
        when(auditRecordRepository.save(any(AuditRecordEntity.class))).thenAnswer(invocation -> {
            AuditRecordEntity record = invocation.getArgument(0);
            record.setId(301L);
            return record;
        });
        when(checkTaskRepository.save(any(CheckTaskEntity.class))).thenAnswer(invocation -> {
            CheckTaskEntity task = invocation.getArgument(0);
            task.setId(401L);
            task.setCreatedAt(LocalDateTime.now());
            return task;
        });
        when(importJobRepository.save(any(ImportJobEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CheckTaskResponse result = service.submit(1L, 101L, new ImportJobReviewSubmitRequest("请审核关系"), 9L);

        assertThat(result.title()).isEqualTo("人物关系导入批次审核");
        assertThat(relationship.getDataStatus()).isEqualTo("pending_review");
        assertThat(job.getReviewStatus()).isEqualTo(ImportJobEntity.REVIEW_PENDING);
        verify(authorizationApplicationService).requireBranchPermission(1L, 9L, 5L, "relationship:submit_review");
        verify(authorizationApplicationService).requireBranchPermission(1L, 9L, 7L, "relationship:submit_review");
        verify(authorizationApplicationService).requireBranchPermission(1L, 9L, 8L, "relationship:submit_review");
        verify(relationshipRepository).saveAll(List.of(relationship));
    }

    private PersonEntity person(Long id, Long branchId) {
        PersonEntity person = new PersonEntity();
        person.setId(id);
        person.setClanId(1L);
        person.setBranchId(branchId);
        return person;
    }
}
