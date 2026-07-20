package com.genealogy.review.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.generation.repository.GenWordRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.dto.ReviewDecisionRequest;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApprovalSelfReviewTest {

    @Mock private PersonRepository personRepository;
    @Mock private RelationshipRepository relationshipRepository;
    @Mock private SourceRepository sourceRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private GenSchemeRepository genSchemeRepository;
    @Mock private GenWordRepository genWordRepository;
    @Mock private AuditRecordRepository auditRecordRepository;
    @Mock private CheckTaskRepository checkTaskRepository;
    @Mock private OperationLogApplicationService operationLogApplicationService;
    @Mock private AuthorizationApplicationService authorizationApplicationService;
    @Mock private RevisionApplyService revisionApplyService;

    private ApprovalApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ApprovalApplicationService(
                personRepository,
                relationshipRepository,
                sourceRepository,
                branchRepository,
                genSchemeRepository,
                genWordRepository,
                auditRecordRepository,
                checkTaskRepository,
                operationLogApplicationService,
                authorizationApplicationService,
                revisionApplyService,
                new ObjectMapper()
        );
        when(auditRecordRepository.save(any(AuditRecordEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(checkTaskRepository.save(any(CheckTaskEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void submitterCanApproveReviewTask() {
        CheckTaskEntity task = pendingTask();
        AuditRecordEntity record = pendingRecord();
        when(checkTaskRepository.findById(401L)).thenReturn(Optional.of(task));
        when(auditRecordRepository.findById(301L)).thenReturn(Optional.of(record));

        CheckTaskResponse response = service.approve(401L, new ReviewDecisionRequest(9L, "同意"));

        assertThat(response.status()).isEqualTo("approved");
        assertThat(response.reviewerId()).isEqualTo(9L);
        verify(authorizationApplicationService).requirePermission(1L, 9L, "review_task:approve");
        verify(revisionApplyService).apply(eq(record), any(LocalDateTime.class));
    }

    @Test
    void submitterCanRejectReviewTask() {
        CheckTaskEntity task = pendingTask();
        AuditRecordEntity record = pendingRecord();
        when(checkTaskRepository.findById(401L)).thenReturn(Optional.of(task));
        when(auditRecordRepository.findById(301L)).thenReturn(Optional.of(record));

        CheckTaskResponse response = service.reject(401L, new ReviewDecisionRequest(9L, "资料需要补充"));

        assertThat(response.status()).isEqualTo("rejected");
        assertThat(response.reviewerId()).isEqualTo(9L);
        assertThat(record.getRejectedReason()).isEqualTo("资料需要补充");
        verify(authorizationApplicationService).requirePermission(1L, 9L, "review_task:reject");
        verify(revisionApplyService).reject(eq(record), any(LocalDateTime.class));
    }

    private CheckTaskEntity pendingTask() {
        CheckTaskEntity task = new CheckTaskEntity();
        task.setId(401L);
        task.setClanId(1L);
        task.setRevisionId(301L);
        task.setStatus("pending");
        return task;
    }

    private AuditRecordEntity pendingRecord() {
        AuditRecordEntity record = new AuditRecordEntity();
        record.setId(301L);
        record.setClanId(1L);
        record.setTargetType("import_job");
        record.setTargetId(101L);
        record.setSubmitterId(9L);
        record.setStatus("pending");
        return record;
    }
}
