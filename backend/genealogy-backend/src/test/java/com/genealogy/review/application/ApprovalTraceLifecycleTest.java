package com.genealogy.review.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.generation.repository.GenWordRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationTraceContext;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.dto.ReviewDecisionRequest;
import com.genealogy.review.dto.TargetSubmitRequest;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApprovalTraceLifecycleTest {

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
    private SourceEntity source;
    private final AtomicLong revisionIds = new AtomicLong(300L);
    private final AtomicLong taskIds = new AtomicLong(400L);

    @BeforeEach
    void setUp() {
        service = new ApprovalApplicationService(
                personRepository, relationshipRepository, sourceRepository, branchRepository,
                genSchemeRepository, genWordRepository, auditRecordRepository, checkTaskRepository,
                operationLogApplicationService, authorizationApplicationService, revisionApplyService,
                new ObjectMapper()
        );
        source = new SourceEntity();
        source.setId(10L);
        source.setClanId(1L);
        source.setSourceName("族谱");
        source.setSourceType("book");
        source.setVerificationStatus("draft");
        source.setConfidenceLevel("high");
        source.setPrivacyLevel("public");
        source.setSensitiveLevel("normal");
        when(sourceRepository.findById(10L)).thenReturn(Optional.of(source));
        when(auditRecordRepository.existsByTargetTypeAndTargetIdAndStatus("source", 10L, "pending"))
                .thenReturn(false);
        when(auditRecordRepository.save(any(AuditRecordEntity.class))).thenAnswer(invocation -> {
            AuditRecordEntity entity = invocation.getArgument(0);
            if (entity.getId() == null) entity.setId(revisionIds.incrementAndGet());
            if (entity.getTraceId() == null) entity.setTraceId(UUID.randomUUID());
            return entity;
        });
        when(checkTaskRepository.save(any(CheckTaskEntity.class))).thenAnswer(invocation -> {
            CheckTaskEntity entity = invocation.getArgument(0);
            if (entity.getId() == null) entity.setId(taskIds.incrementAndGet());
            return entity;
        });
    }

    @Test
    void submitApproveAndApplyReuseTheSameTraceId() {
        CheckTaskResponse submitted = service.submitSource(10L, new TargetSubmitRequest(2L, "补充来源"));
        AuditRecordEntity revision = capturedRevision(submitted.revisionId(), submitted.traceId(), 2L);
        CheckTaskEntity task = capturedTask(submitted.id(), submitted.revisionId(), submitted.traceId());
        when(checkTaskRepository.findById(submitted.id())).thenReturn(Optional.of(task));
        when(auditRecordRepository.findById(submitted.revisionId())).thenReturn(Optional.of(revision));

        service.approve(submitted.id(), new ReviewDecisionRequest(3L, "同意"));

        ArgumentCaptor<OperationTraceContext> contexts = ArgumentCaptor.forClass(OperationTraceContext.class);
        verify(operationLogApplicationService, times(3)).record(
                anyLong(), anyLong(), anyString(), anyString(), anyLong(), anyString(),
                nullable(String.class), contexts.capture()
        );
        List<OperationTraceContext> values = contexts.getAllValues();
        assertThat(values).extracting(OperationTraceContext::eventResult)
                .containsExactlyInAnyOrder("submitted", "applied", "approved");
        assertThat(values).allMatch(context -> submitted.traceId().equals(context.traceId()));
        assertThat(values).allMatch(context -> submitted.revisionId().equals(context.revisionId()));
        assertThat(values).allMatch(context -> submitted.id().equals(context.reviewTaskId()));
        verify(revisionApplyService).apply(any(AuditRecordEntity.class), any());
    }

    @Test
    void rejectedResubmissionCreatesANewTraceId() {
        CheckTaskResponse first = service.submitSource(10L, new TargetSubmitRequest(2L, "第一次"));
        AuditRecordEntity firstRevision = capturedRevision(first.revisionId(), first.traceId(), 2L);
        CheckTaskEntity firstTask = capturedTask(first.id(), first.revisionId(), first.traceId());
        when(checkTaskRepository.findById(first.id())).thenReturn(Optional.of(firstTask));
        when(auditRecordRepository.findById(first.revisionId())).thenReturn(Optional.of(firstRevision));

        service.reject(first.id(), new ReviewDecisionRequest(3L, "信息不足"));
        source.setVerificationStatus("rejected");
        CheckTaskResponse second = service.submitSource(10L, new TargetSubmitRequest(2L, "补充后重提"));

        assertThat(second.revisionId()).isNotEqualTo(first.revisionId());
        assertThat(second.traceId()).isNotNull().isNotEqualTo(first.traceId());
    }

    private AuditRecordEntity capturedRevision(Long id, UUID traceId, Long submitterId) {
        AuditRecordEntity revision = new AuditRecordEntity();
        revision.setId(id);
        revision.setClanId(1L);
        revision.setTargetType("source");
        revision.setTargetId(10L);
        revision.setSubmitterId(submitterId);
        revision.setStatus("pending");
        revision.setTraceId(traceId);
        return revision;
    }

    private CheckTaskEntity capturedTask(Long id, Long revisionId, UUID traceId) {
        CheckTaskEntity task = new CheckTaskEntity();
        task.setId(id);
        task.setClanId(1L);
        task.setRevisionId(revisionId);
        task.setTraceId(traceId);
        task.setStatus("pending");
        return task;
    }
}
