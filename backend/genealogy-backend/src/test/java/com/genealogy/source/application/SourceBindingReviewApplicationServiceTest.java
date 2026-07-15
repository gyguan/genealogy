package com.genealogy.source.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationTraceContext;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingRevisionDeleteRequest;
import com.genealogy.source.dto.SourceBindingRevisionResponse;
import com.genealogy.source.dto.SourceBindingRevisionSubmitRequest;
import com.genealogy.source.dto.SourceBindingReviewDecisionRequest;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SourceBindingReviewApplicationServiceTest {

    @Mock
    private SourceRepository sourceRepository;

    @Mock
    private SourceBindingRepository sourceBindingRepository;

    @Mock
    private RevisionRepository revisionRepository;

    @Mock
    private ReviewTaskRepository reviewTaskRepository;

    @Mock
    private ClanRepository clanRepository;

    @Mock
    private OperationLogApplicationService operationLogApplicationService;

    @Mock
    private AuthorizationApplicationService authorizationApplicationService;

    private SourceBindingReviewApplicationService service;

    @BeforeEach
    void setUp() {
        service = new SourceBindingReviewApplicationService(
                sourceRepository,
                sourceBindingRepository,
                revisionRepository,
                reviewTaskRepository,
                clanRepository,
                operationLogApplicationService,
                authorizationApplicationService,
                new ObjectMapper()
        );
    }

    @Test
    void submitCreateShouldCreatePendingRevisionAndReviewTask() {
        SourceEntity source = officialSource();
        AtomicReference<RevisionEntity> savedRevisionRef = new AtomicReference<>();
        when(clanRepository.existsById(1L)).thenReturn(true);
        when(sourceRepository.findById(10L)).thenReturn(Optional.of(source));
        when(sourceBindingRepository.existsBySourceIdAndTargetTypeAndTargetIdAndBindingStatusNot(10L, "person", 100L, "archived")).thenReturn(false);
        when(revisionRepository.existsByTargetTypeAndTargetIdAndStatus("source_binding", 10L, "pending")).thenReturn(false);
        when(revisionRepository.save(any(RevisionEntity.class))).thenAnswer(invocation -> {
            RevisionEntity entity = invocation.getArgument(0);
            entity.setId(500L);
            if (entity.getTraceId() == null) entity.setTraceId(UUID.randomUUID());
            savedRevisionRef.set(entity);
            return entity;
        });
        when(reviewTaskRepository.save(any(ReviewTaskEntity.class))).thenAnswer(invocation -> {
            ReviewTaskEntity entity = invocation.getArgument(0);
            entity.setId(600L);
            return entity;
        });

        SourceBindingRevisionResponse response = service.submitCreate(1L, submitRequest(), 2L, "req-1", "127.0.0.1");

        assertThat(response.revisionId()).isEqualTo(500L);
        assertThat(response.reviewTaskId()).isEqualTo(600L);
        assertThat(response.status()).isEqualTo("pending");
        assertThat(response.changeType()).isEqualTo("create");
        assertThat(response.traceId()).isEqualTo(savedRevisionRef.get().getTraceId());
        assertThat(savedRevisionRef.get().getAfterData()).contains("\"targetType\":\"person\"");
        ArgumentCaptor<OperationTraceContext> trace = ArgumentCaptor.forClass(OperationTraceContext.class);
        verify(operationLogApplicationService).record(
                org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(2L),
                org.mockito.ArgumentMatchers.eq("source_binding_revision_submit"), org.mockito.ArgumentMatchers.eq("revision"),
                org.mockito.ArgumentMatchers.eq(500L), org.mockito.ArgumentMatchers.eq("submit source binding create revision"),
                org.mockito.ArgumentMatchers.eq(savedRevisionRef.get().getDiffSummary()), org.mockito.ArgumentMatchers.eq("req-1"),
                org.mockito.ArgumentMatchers.eq("127.0.0.1"), trace.capture()
        );
        assertThat(trace.getValue().traceId()).isEqualTo(response.traceId());
        assertThat(trace.getValue().revisionId()).isEqualTo(500L);
        assertThat(trace.getValue().reviewTaskId()).isEqualTo(600L);
        assertThat(trace.getValue().businessTargetType()).isEqualTo("person");
        assertThat(trace.getValue().businessTargetId()).isEqualTo(100L);
        assertThat(trace.getValue().eventResult()).isEqualTo("submitted");
    }

    @Test
    void approveCreateShouldApplyBindingAfterReview() {
        RevisionEntity revision = pendingCreateRevision();
        ReviewTaskEntity task = pendingTask();
        AtomicReference<SourceBindingEntity> savedBindingRef = new AtomicReference<>();
        when(revisionRepository.findByIdAndTargetType(500L, "source_binding")).thenReturn(Optional.of(revision));
        when(reviewTaskRepository.findFirstByRevisionIdOrderByReviewLevelAsc(500L)).thenReturn(Optional.of(task));
        when(sourceBindingRepository.existsBySourceIdAndTargetTypeAndTargetIdAndBindingStatusNot(10L, "person", 100L, "archived")).thenReturn(false);
        when(sourceBindingRepository.save(any(SourceBindingEntity.class))).thenAnswer(invocation -> {
            SourceBindingEntity entity = invocation.getArgument(0);
            entity.setId(700L);
            savedBindingRef.set(entity);
            return entity;
        });
        when(revisionRepository.save(any(RevisionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reviewTaskRepository.save(any(ReviewTaskEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SourceBindingRevisionResponse response = service.approve(500L, new SourceBindingReviewDecisionRequest("审核通过"), 3L, "req-2", "127.0.0.1");

        assertThat(response.status()).isEqualTo("approved");
        assertThat(savedBindingRef.get().getSourceId()).isEqualTo(10L);
        assertThat(savedBindingRef.get().getTargetType()).isEqualTo("person");
        assertThat(savedBindingRef.get().getTargetId()).isEqualTo(100L);
        assertThat(savedBindingRef.get().getBindingStatus()).isEqualTo("official");
        assertThat(task.getReviewerId()).isEqualTo(3L);
        assertThat(task.getStatus()).isEqualTo("approved");
        ArgumentCaptor<OperationTraceContext> applyTrace = ArgumentCaptor.forClass(OperationTraceContext.class);
        verify(operationLogApplicationService).record(
                org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(3L),
                org.mockito.ArgumentMatchers.eq("source_binding_revision_apply"), org.mockito.ArgumentMatchers.eq("revision"),
                org.mockito.ArgumentMatchers.eq(500L), org.mockito.ArgumentMatchers.eq("apply source binding revision"),
                org.mockito.ArgumentMatchers.eq(revision.getDiffSummary()), org.mockito.ArgumentMatchers.eq("req-2"),
                org.mockito.ArgumentMatchers.eq("127.0.0.1"), applyTrace.capture()
        );
        ArgumentCaptor<OperationTraceContext> approveTrace = ArgumentCaptor.forClass(OperationTraceContext.class);
        verify(operationLogApplicationService).record(
                org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(3L),
                org.mockito.ArgumentMatchers.eq("source_binding_revision_approve"), org.mockito.ArgumentMatchers.eq("revision"),
                org.mockito.ArgumentMatchers.eq(500L), org.mockito.ArgumentMatchers.eq("approve source binding revision"),
                org.mockito.ArgumentMatchers.eq(revision.getDiffSummary()), org.mockito.ArgumentMatchers.eq("req-2"),
                org.mockito.ArgumentMatchers.eq("127.0.0.1"), approveTrace.capture()
        );
        assertThat(applyTrace.getValue().businessTargetType()).isEqualTo("person");
        assertThat(applyTrace.getValue().businessTargetId()).isEqualTo(100L);
        assertThat(approveTrace.getValue().businessTargetType()).isEqualTo("person");
        assertThat(approveTrace.getValue().businessTargetId()).isEqualTo(100L);
    }

    @Test
    void approveShouldRejectSelfReview() {
        RevisionEntity revision = pendingCreateRevision();
        when(revisionRepository.findByIdAndTargetType(500L, "source_binding")).thenReturn(Optional.of(revision));

        assertThatThrownBy(() -> service.approve(500L, new SourceBindingReviewDecisionRequest("自审"), 2L, "req-3", "127.0.0.1"))
                .hasMessageContaining("审核员不能审核自己提交的来源绑定变更");
    }

    @Test
    void submitDeleteShouldCreatePendingRevisionForActiveBinding() {
        SourceBindingEntity binding = activeBinding();
        when(sourceBindingRepository.findById(700L)).thenReturn(Optional.of(binding));
        when(revisionRepository.existsByTargetTypeAndTargetIdAndStatus("source_binding", 700L, "pending")).thenReturn(false);
        when(revisionRepository.save(any(RevisionEntity.class))).thenAnswer(invocation -> {
            RevisionEntity entity = invocation.getArgument(0);
            entity.setId(501L);
            if (entity.getTraceId() == null) entity.setTraceId(UUID.randomUUID());
            return entity;
        });
        when(reviewTaskRepository.save(any(ReviewTaskEntity.class))).thenAnswer(invocation -> {
            ReviewTaskEntity entity = invocation.getArgument(0);
            entity.setId(601L);
            return entity;
        });

        SourceBindingRevisionResponse response = service.submitDelete(700L, new SourceBindingRevisionDeleteRequest("错误绑定"), 2L, "req-4", "127.0.0.1");

        assertThat(response.revisionId()).isEqualTo(501L);
        assertThat(response.bindingId()).isEqualTo(700L);
        assertThat(response.changeType()).isEqualTo("delete");
        assertThat(response.status()).isEqualTo("pending");
    }

    private SourceBindingRevisionSubmitRequest submitRequest() {
        SourceBindingCreateRequest binding = new SourceBindingCreateRequest(
                10L,
                "person",
                100L,
                "族谱原文记录人物基础信息",
                "谱文摘录",
                "high",
                true,
                null
        );
        return new SourceBindingRevisionSubmitRequest(binding, "补充证据");
    }

    private SourceEntity officialSource() {
        SourceEntity source = new SourceEntity();
        source.setId(10L);
        source.setClanId(1L);
        source.setVerificationStatus("official");
        source.setConfidenceLevel("high");
        return source;
    }

    private RevisionEntity pendingCreateRevision() {
        RevisionEntity revision = new RevisionEntity();
        revision.setId(500L);
        revision.setClanId(1L);
        revision.setTargetType("source_binding");
        revision.setTargetId(10L);
        revision.setChangeType("create");
        revision.setAfterData("{\"sourceId\":10,\"targetType\":\"person\",\"targetId\":100,\"bindingReason\":\"族谱原文记录人物基础信息\",\"excerpt\":\"谱文摘录\",\"confidenceLevel\":\"high\",\"bindingStatus\":\"official\"}");
        revision.setDiffSummary("新增来源绑定：source=10 -> person:100");
        revision.setSubmitterId(2L);
        revision.setSubmitTime(LocalDateTime.now());
        revision.setStatus("pending");
        revision.setTraceId(UUID.fromString("11111111-1111-1111-1111-111111111111"));
        return revision;
    }

    private ReviewTaskEntity pendingTask() {
        ReviewTaskEntity task = new ReviewTaskEntity();
        task.setId(600L);
        task.setClanId(1L);
        task.setRevisionId(500L);
        task.setTraceId(UUID.fromString("11111111-1111-1111-1111-111111111111"));
        task.setReviewLevel(1);
        task.setStatus("pending");
        task.setCreatedAt(LocalDateTime.now());
        return task;
    }

    private SourceBindingEntity activeBinding() {
        SourceBindingEntity binding = new SourceBindingEntity();
        binding.setId(700L);
        binding.setClanId(1L);
        binding.setSourceId(10L);
        binding.setTargetType("person");
        binding.setTargetId(100L);
        binding.setBindingReason("族谱原文记录人物基础信息");
        binding.setConfidenceLevel("high");
        binding.setBindingStatus("official");
        binding.setCreatedBy(2L);
        binding.setCreatedAt(LocalDateTime.now());
        return binding;
    }
}
