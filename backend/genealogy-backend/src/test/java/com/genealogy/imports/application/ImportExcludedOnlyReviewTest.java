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
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.source.repository.SourceRepository;
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
class ImportExcludedOnlyReviewTest {

    @Mock
    private ImportJobRepository jobRepository;
    @Mock
    private ImportJobRowRepository rowRepository;
    @Mock
    private PersonRepository personRepository;
    @Mock
    private RelationshipRepository relationshipRepository;
    @Mock
    private SourceRepository sourceRepository;
    @Mock
    private BranchRepository branchRepository;
    @Mock
    private AuditRecordRepository auditRecordRepository;
    @Mock
    private CheckTaskRepository checkTaskRepository;
    @Mock
    private AuthorizationApplicationService authorizationApplicationService;
    @Mock
    private OperationLogApplicationService operationLogApplicationService;

    private ImportJobReviewApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ImportJobReviewApplicationService(
                jobRepository,
                rowRepository,
                personRepository,
                relationshipRepository,
                sourceRepository,
                branchRepository,
                auditRecordRepository,
                checkTaskRepository,
                authorizationApplicationService,
                operationLogApplicationService,
                new ObjectMapper()
        );
    }

    @Test
    void excludedOnlyBatchShouldCreateReviewTaskAndExposeExcludedCount() {
        ImportJobEntity job = new ImportJobEntity();
        job.setId(10L);
        job.setClanId(1L);
        job.setBranchId(2L);
        job.setImportType("person_csv");
        job.setOriginalFilename("persons.csv");
        job.setTotalCount(2);
        job.setSuccessCount(0);
        job.setFailureCount(0);
        job.setProcessingStatus(ImportJobEntity.PROCESSING_READY_FOR_REVIEW);
        job.setReviewStatus(ImportJobEntity.REVIEW_NOT_SUBMITTED);
        job.setReviewRound(0);
        job.setCreatedAt(LocalDateTime.now().minusMinutes(5));
        job.setUpdatedAt(LocalDateTime.now());

        when(jobRepository.findByIdAndClanId(10L, 1L)).thenReturn(Optional.of(job));
        when(rowRepository.countByJobId(10L)).thenReturn(2L);
        when(rowRepository.countByJobIdAndRowStatus(10L, ImportJobRowEntity.STATUS_DRAFT_CREATED)).thenReturn(0L);
        when(rowRepository.countByJobIdAndRowStatus(10L, ImportJobRowEntity.STATUS_EXCLUDED)).thenReturn(2L);
        when(rowRepository.findByJobIdAndRowStatusOrderByRowNoAsc(10L, ImportJobRowEntity.STATUS_DRAFT_CREATED))
                .thenReturn(List.of());
        when(branchRepository.findById(2L)).thenReturn(Optional.empty());
        when(auditRecordRepository.save(any(AuditRecordEntity.class))).thenAnswer(invocation -> {
            AuditRecordEntity record = invocation.getArgument(0);
            record.setId(100L);
            return record;
        });
        when(checkTaskRepository.save(any(CheckTaskEntity.class))).thenAnswer(invocation -> {
            CheckTaskEntity task = invocation.getArgument(0);
            task.setId(200L);
            return task;
        });

        CheckTaskResponse result = service.submit(
                1L,
                10L,
                new ImportJobReviewSubmitRequest("全部原始行均无法核实"),
                9L
        );

        assertThat(result.id()).isEqualTo(200L);
        assertThat(result.diffSummary()).contains("草稿：0 条").contains("排除：2 条");
        assertThat(job.getReviewStatus()).isEqualTo(ImportJobEntity.REVIEW_PENDING);
        assertThat(job.getReviewRound()).isEqualTo(1);
        verify(personRepository).saveAll(List.of());
        verify(jobRepository).save(job);
    }
}
