package com.genealogy.imports.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobReviewSubmitRequest;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImportJobReviewApplicationServiceTest {

    @Mock private ImportJobRepository importJobRepository;
    @Mock private ImportJobRowRepository importJobRowRepository;
    @Mock private PersonRepository personRepository;
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
                branchRepository,
                auditRecordRepository,
                checkTaskRepository,
                authorizationApplicationService,
                operationLogApplicationService,
                new ObjectMapper()
        );
    }

    @Test
    void readyBatchShouldCreateReviewTaskAndLockDraftPersons() {
        ImportJobEntity job = readyJob(ImportJobEntity.REVIEW_NOT_SUBMITTED, 0);
        ImportJobRowEntity row = draftRow(201L, 1001L);
        PersonEntity person = draftPerson(1001L);
        BranchEntity branch = new BranchEntity();
        branch.setId(5L);
        branch.setBranchName("长沙支");
        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.countByJobId(101L)).thenReturn(1L);
        when(importJobRowRepository.countByJobIdAndRowStatus(101L, ImportJobRowEntity.STATUS_DRAFT_CREATED)).thenReturn(1L);
        when(importJobRowRepository.countByJobIdAndRowStatus(101L, ImportJobRowEntity.STATUS_EXCLUDED)).thenReturn(0L);
        when(importJobRowRepository.findByJobIdAndRowStatusOrderByRowNoAsc(101L, ImportJobRowEntity.STATUS_DRAFT_CREATED)).thenReturn(List.of(row));
        when(personRepository.findByIdAndDeletedAtIsNull(1001L)).thenReturn(Optional.of(person));
        when(branchRepository.findById(5L)).thenReturn(Optional.of(branch));
        when(auditRecordRepository.existsByTargetTypeAndTargetIdAndStatus("import_job", 101L, "pending")).thenReturn(false);
        when(auditRecordRepository.save(any(AuditRecordEntity.class))).thenAnswer(invocation -> {
            AuditRecordEntity record = invocation.getArgument(0);
            record.setId(301L);
            return record;
        });
        when(checkTaskRepository.save(any(CheckTaskEntity.class))).thenAnswer(invocation -> {
            CheckTaskEntity task = invocation.getArgument(0);
            task.setId(401L);
            return task;
        });
        when(importJobRepository.save(any(ImportJobEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CheckTaskResponse response = service.submit(1L, 101L, new ImportJobReviewSubmitRequest("请审核"), 9L);

        assertThat(response.id()).isEqualTo(401L);
        assertThat(response.targetType()).isEqualTo("import_job");
        assertThat(response.diffSummary()).contains("persons.xlsx", "长沙支", "第 1 轮审核");
        assertThat(person.getDataStatus()).isEqualTo("pending_review");
        assertThat(job.getReviewStatus()).isEqualTo(ImportJobEntity.REVIEW_PENDING);
        assertThat(job.getReviewRound()).isEqualTo(1);
        assertThat(job.getLatestReviewTaskId()).isEqualTo(401L);
        verify(authorizationApplicationService).requireBranchPermission(1L, 9L, 5L, "person:submit_review");
        verify(personRepository).saveAll(List.of(person));

        ArgumentCaptor<AuditRecordEntity> recordCaptor = ArgumentCaptor.forClass(AuditRecordEntity.class);
        verify(auditRecordRepository).save(recordCaptor.capture());
        assertThat(recordCaptor.getValue().getNewPayload())
                .contains("persons.xlsx", "长沙支", "pending")
                .doesNotContain("张三", "rawData");
    }

    @Test
    void batchWithFailedRowsShouldNotSubmit() {
        ImportJobEntity job = readyJob(ImportJobEntity.REVIEW_NOT_SUBMITTED, 0);
        job.setProcessingStatus(ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        job.setFailureCount(1);
        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> service.submit(1L, 101L, new ImportJobReviewSubmitRequest(null), 9L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("导入批次仍有待修正数据，不能提交审核");

        verify(auditRecordRepository, never()).save(any(AuditRecordEntity.class));
        verify(personRepository, never()).saveAll(any());
    }

    @Test
    void rejectedBatchShouldCreateNextReviewRound() {
        ImportJobEntity job = readyJob(ImportJobEntity.REVIEW_REJECTED, 1);
        ImportJobRowEntity row = draftRow(201L, 1001L);
        PersonEntity person = draftPerson(1001L);
        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.countByJobId(101L)).thenReturn(1L);
        when(importJobRowRepository.countByJobIdAndRowStatus(101L, ImportJobRowEntity.STATUS_DRAFT_CREATED)).thenReturn(1L);
        when(importJobRowRepository.countByJobIdAndRowStatus(101L, ImportJobRowEntity.STATUS_EXCLUDED)).thenReturn(0L);
        when(importJobRowRepository.findByJobIdAndRowStatusOrderByRowNoAsc(101L, ImportJobRowEntity.STATUS_DRAFT_CREATED)).thenReturn(List.of(row));
        when(personRepository.findByIdAndDeletedAtIsNull(1001L)).thenReturn(Optional.of(person));
        when(branchRepository.findById(5L)).thenReturn(Optional.empty());
        when(auditRecordRepository.save(any(AuditRecordEntity.class))).thenAnswer(invocation -> {
            AuditRecordEntity record = invocation.getArgument(0);
            record.setId(302L);
            return record;
        });
        when(checkTaskRepository.save(any(CheckTaskEntity.class))).thenAnswer(invocation -> {
            CheckTaskEntity task = invocation.getArgument(0);
            task.setId(402L);
            return task;
        });
        when(importJobRepository.save(any(ImportJobEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CheckTaskResponse response = service.submit(1L, 101L, new ImportJobReviewSubmitRequest("已按意见调整"), 9L);

        assertThat(job.getReviewRound()).isEqualTo(2);
        assertThat(response.diffSummary()).contains("第 2 轮审核");
    }

    private ImportJobEntity readyJob(String reviewStatus, int reviewRound) {
        ImportJobEntity job = new ImportJobEntity();
        job.setId(101L);
        job.setClanId(1L);
        job.setBranchId(5L);
        job.setOriginalFilename("persons.xlsx");
        job.setTotalCount(1);
        job.setSuccessCount(1);
        job.setFailureCount(0);
        job.setStatus("completed");
        job.setProcessingStatus(ImportJobEntity.PROCESSING_READY_FOR_REVIEW);
        job.setReviewStatus(reviewStatus);
        job.setReviewRound(reviewRound);
        job.setCreatedAt(LocalDateTime.now().minusMinutes(5));
        job.setUpdatedAt(LocalDateTime.now());
        return job;
    }

    private ImportJobRowEntity draftRow(Long id, Long personId) {
        ImportJobRowEntity row = new ImportJobRowEntity();
        row.setId(id);
        row.setJobId(101L);
        row.setRowNo(2);
        row.setRowStatus(ImportJobRowEntity.STATUS_DRAFT_CREATED);
        row.setDraftPersonId(personId);
        return row;
    }

    private PersonEntity draftPerson(Long id) {
        PersonEntity person = new PersonEntity();
        person.setId(id);
        person.setClanId(1L);
        person.setBranchId(5L);
        person.setName("张三");
        person.setDataStatus("draft");
        return person;
    }
}
