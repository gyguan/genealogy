package com.genealogy.tracking.application;

import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationLogBusinessViewApplicationService;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.tracking.dto.TrackingObjectResponse;
import com.genealogy.tracking.dto.TrackingTraceDetailResponse;
import com.genealogy.tracking.repository.TrackingObjectQueryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TrackingTraceApplicationServiceTest {

    private TrackingObjectQueryRepository trackingObjectQueryRepository;
    private RbacAuthorizationApplicationService rbacAuthorizationApplicationService;
    private RevisionRepository revisionRepository;
    private ReviewTaskRepository reviewTaskRepository;
    private SourceBindingRepository sourceBindingRepository;
    private OperationLogApplicationService operationLogApplicationService;
    private OperationLogBusinessViewApplicationService operationLogBusinessViewApplicationService;
    private AppUserRepository appUserRepository;
    private BranchRepository branchRepository;
    private TrackingTraceApplicationService service;

    @BeforeEach
    void setUp() {
        trackingObjectQueryRepository = mock(TrackingObjectQueryRepository.class);
        rbacAuthorizationApplicationService = mock(RbacAuthorizationApplicationService.class);
        revisionRepository = mock(RevisionRepository.class);
        reviewTaskRepository = mock(ReviewTaskRepository.class);
        sourceBindingRepository = mock(SourceBindingRepository.class);
        operationLogApplicationService = mock(OperationLogApplicationService.class);
        operationLogBusinessViewApplicationService = mock(OperationLogBusinessViewApplicationService.class);
        appUserRepository = mock(AppUserRepository.class);
        branchRepository = mock(BranchRepository.class);
        service = new TrackingTraceApplicationService(
                trackingObjectQueryRepository,
                rbacAuthorizationApplicationService,
                revisionRepository,
                reviewTaskRepository,
                sourceBindingRepository,
                operationLogApplicationService,
                operationLogBusinessViewApplicationService,
                appUserRepository,
                branchRepository
        );
        when(rbacAuthorizationApplicationService.permissionDataScope(anyLong(), anyLong(), anyString()))
                .thenReturn(PermissionDataScope.full());
        when(appUserRepository.findAllById(any())).thenReturn(List.of());
        when(branchRepository.findAllById(any())).thenReturn(List.of());
        when(operationLogApplicationService.searchByTargets(anyLong(), anyMap(), anyInt(), anyBoolean()))
                .thenReturn(PageResponse.of(List.of(), 0L, 1, 101));
        when(operationLogBusinessViewApplicationService.enrich(any(), anyLong(), anyLong()))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @ParameterizedTest
    @ValueSource(strings = {"person", "relationship", "source", "branch"})
    void resolvesAllRegularObjectTypesThroughTheSameVisibilityBoundary(String objectType) {
        TrackingObjectResponse summary = summary(objectType, 100L);
        when(trackingObjectQueryRepository.findVisibleById(1L, objectType, 100L, true, List.of(-1L)))
                .thenReturn(Optional.of(summary));
        when(revisionRepository.findByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(
                eq(1L), eq(objectType), eq(100L), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of()));
        if ("source".equals(objectType)) {
            when(sourceBindingRepository.findByClanIdAndSourceIdOrderByCreatedAtDesc(
                    eq(1L), eq(100L), any(Pageable.class)
            )).thenReturn(new PageImpl<>(List.of()));
        } else {
            when(sourceBindingRepository.findByClanIdAndTargetTypeAndTargetIdOrderByCreatedAtDesc(
                    eq(1L), eq(objectType), eq(100L), any(Pageable.class)
            )).thenReturn(new PageImpl<>(List.of()));
        }

        TrackingTraceDetailResponse result = service.trace(1L, 9L, objectType, 100L, false);

        assertThat(result.objectSummary()).isEqualTo(summary);
        assertThat(result.currentStatus()).isEqualTo("official");
        assertThat(result.allowedActions()).containsExactly("view_trace");
        assertThat(result.traceCoverage().level()).isEqualTo("minimal");
    }

    @Test
    void rejectsInvisibleObjectsWithoutDisclosingWhy() {
        when(rbacAuthorizationApplicationService.permissionDataScope(9L, 1L, "operation_log.view"))
                .thenReturn(PermissionDataScope.branches(Set.of(10L)));
        when(trackingObjectQueryRepository.findVisibleById(1L, "person", 100L, false, List.of(10L)))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.trace(1L, 9L, "person", 100L, false))
                .isInstanceOf(BusinessException.class)
                .hasMessage("追踪对象不存在或当前不可见");
    }

    @Test
    @SuppressWarnings("unchecked")
    void aggregatesStructuredEventsAndDeduplicatesEquivalentReviewLogs() {
        TrackingObjectResponse summary = summary("person", 100L);
        when(trackingObjectQueryRepository.findVisibleById(1L, "person", 100L, true, List.of(-1L)))
                .thenReturn(Optional.of(summary));

        RevisionEntity revision = revision(11L, "person", 100L);
        ReviewTaskEntity task = reviewTask(21L, 11L, "approved");
        when(revisionRepository.findByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(
                eq(1L), eq("person"), eq(100L), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of(revision)));
        when(reviewTaskRepository.findByClanIdAndRevisionIdInOrderByCreatedAtDesc(
                eq(1L), eq(List.of(11L)), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of(task)));
        when(sourceBindingRepository.findByClanIdAndTargetTypeAndTargetIdOrderByCreatedAtDesc(
                eq(1L), eq("person"), eq(100L), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of()));

        OperationLogResponse duplicateReviewLog = new OperationLogResponse(
                31L, 1L, 9L, "审核员", "review_approve", "review_task", 21L,
                "人物审核", "长房", "审核通过", "approved", "审核通过",
                null, null, null, LocalDateTime.of(2026, 7, 1, 12, 0)
        );
        PageResponse<OperationLogResponse> logPage = PageResponse.of(List.of(duplicateReviewLog), 1L, 1, 101);
        when(operationLogApplicationService.searchByTargets(eq(1L), anyMap(), eq(101), eq(true)))
                .thenReturn(logPage);
        when(operationLogBusinessViewApplicationService.enrich(logPage, 1L, 9L)).thenReturn(logPage);

        TrackingTraceDetailResponse result = service.trace(1L, 9L, "person", 100L, true);

        assertThat(result.timeline()).extracting(TrackingTraceDetailResponse.TimelineEvent::eventKey)
                .containsExactly(
                        "revision:11:submitted",
                        "review:21:requested",
                        "review:21:result"
                );
        assertThat(result.traceCoverage().level()).isEqualTo("complete");
        assertThat(result.allowedActions()).containsExactly("view_trace", "export_operation_logs");

        ArgumentCaptor<Map<String, ? extends Collection<Long>>> targets = ArgumentCaptor.forClass(Map.class);
        verify(operationLogApplicationService).searchByTargets(eq(1L), targets.capture(), eq(101), eq(true));
        assertThat(targets.getValue().get("person")).containsExactly(100L);
        assertThat(targets.getValue().get("review_task")).containsExactly(21L);
    }

    @Test
    void resolvesReviewTaskToItsVisibleBusinessTarget() {
        TrackingObjectResponse taskSummary = summary("review_task", 21L);
        TrackingObjectResponse sourceSummary = summary("source", 300L);
        when(trackingObjectQueryRepository.findVisibleById(1L, "review_task", 21L, true, List.of(-1L)))
                .thenReturn(Optional.of(taskSummary));
        when(trackingObjectQueryRepository.findVisibleById(1L, "source", 300L, true, List.of(-1L)))
                .thenReturn(Optional.of(sourceSummary));

        RevisionEntity revision = revision(11L, "source", 300L);
        ReviewTaskEntity task = reviewTask(21L, 11L, "pending");
        when(reviewTaskRepository.findById(21L)).thenReturn(Optional.of(task));
        when(revisionRepository.findById(11L)).thenReturn(Optional.of(revision));
        when(sourceBindingRepository.findByClanIdAndSourceIdOrderByCreatedAtDesc(
                eq(1L), eq(300L), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of()));

        TrackingTraceDetailResponse result = service.trace(1L, 9L, "review_task", 21L, false);

        assertThat(result.objectSummary()).isEqualTo(taskSummary);
        assertThat(result.revisions()).extracting(TrackingTraceDetailResponse.RevisionItem::id)
                .containsExactly(11L);
        assertThat(result.reviewTasks()).extracting(TrackingTraceDetailResponse.ReviewTaskItem::id)
                .containsExactly(21L);
        verify(trackingObjectQueryRepository).findVisibleById(1L, "source", 300L, true, List.of(-1L));
    }

    @Test
    void marksCoveragePartialWhenAHistorySegmentIsTruncated() {
        TrackingObjectResponse summary = summary("person", 100L);
        when(trackingObjectQueryRepository.findVisibleById(1L, "person", 100L, true, List.of(-1L)))
                .thenReturn(Optional.of(summary));
        List<RevisionEntity> revisions = new ArrayList<>();
        for (long id = 1; id <= 101; id++) {
            revisions.add(revision(id, "person", 100L));
        }
        when(revisionRepository.findByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(
                eq(1L), eq("person"), eq(100L), any(Pageable.class)
        )).thenReturn(new PageImpl<>(revisions, org.springframework.data.domain.PageRequest.of(0, 101), 101));
        when(reviewTaskRepository.findByClanIdAndRevisionIdInOrderByCreatedAtDesc(
                eq(1L), any(), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of()));
        when(sourceBindingRepository.findByClanIdAndTargetTypeAndTargetIdOrderByCreatedAtDesc(
                eq(1L), eq("person"), eq(100L), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of()));

        TrackingTraceDetailResponse result = service.trace(1L, 9L, "person", 100L, false);

        assertThat(result.revisions()).hasSize(100);
        assertThat(result.traceCoverage().level()).isEqualTo("partial");
        assertThat(result.traceCoverage().truncatedSegments()).contains("revisions");
        assertThat(result.traceCoverage().missingSegments()).contains("reviewTasks");
    }

    @Test
    void separatesMultipleChangesForTheSameObjectByStableTraceId() {
        TrackingObjectResponse summary = summary("person", 100L);
        when(trackingObjectQueryRepository.findVisibleById(1L, "person", 100L, true, List.of(-1L)))
                .thenReturn(Optional.of(summary));
        RevisionEntity first = revision(11L, "person", 100L);
        RevisionEntity second = revision(12L, "person", 100L);
        ReviewTaskEntity firstTask = reviewTask(21L, 11L, "approved");
        ReviewTaskEntity secondTask = reviewTask(22L, 12L, "rejected");
        when(revisionRepository.findByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(
                eq(1L), eq("person"), eq(100L), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of(second, first)));
        when(reviewTaskRepository.findByClanIdAndRevisionIdInOrderByCreatedAtDesc(
                eq(1L), eq(List.of(12L, 11L)), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of(secondTask, firstTask)));
        when(sourceBindingRepository.findByClanIdAndTargetTypeAndTargetIdOrderByCreatedAtDesc(
                eq(1L), eq("person"), eq(100L), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of()));

        TrackingTraceDetailResponse result = service.trace(1L, 9L, "person", 100L, false);

        assertThat(result.changeChains()).hasSize(2);
        assertThat(result.changeChains()).extracting(TrackingTraceDetailResponse.ChangeChain::traceId)
                .containsExactlyInAnyOrder(first.getTraceId(), second.getTraceId());
        assertThat(result.changeChains()).allMatch(chain -> "complete".equals(chain.compatibilityStatus()));
        assertThat(result.changeChains()).extracting(TrackingTraceDetailResponse.ChangeChain::revisionId)
                .containsExactlyInAnyOrder(11L, 12L);
    }

    @Test
    void keepsHistoricalRevisionsSeparateWithoutFabricatingTraceIds() {
        TrackingObjectResponse summary = summary("person", 100L);
        when(trackingObjectQueryRepository.findVisibleById(1L, "person", 100L, true, List.of(-1L)))
                .thenReturn(Optional.of(summary));
        RevisionEntity first = revision(11L, "person", 100L);
        RevisionEntity second = revision(12L, "person", 100L);
        first.setTraceId(null);
        second.setTraceId(null);
        when(revisionRepository.findByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(
                eq(1L), eq("person"), eq(100L), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of(second, first)));
        when(reviewTaskRepository.findByClanIdAndRevisionIdInOrderByCreatedAtDesc(
                eq(1L), eq(List.of(12L, 11L)), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of()));
        when(sourceBindingRepository.findByClanIdAndTargetTypeAndTargetIdOrderByCreatedAtDesc(
                eq(1L), eq("person"), eq(100L), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of()));

        TrackingTraceDetailResponse result = service.trace(1L, 9L, "person", 100L, false);

        assertThat(result.changeChains()).extracting(TrackingTraceDetailResponse.ChangeChain::chainKey)
                .containsExactlyInAnyOrder("legacy-revision:11", "legacy-revision:12");
        assertThat(result.changeChains()).allMatch(chain -> chain.traceId() == null);
        assertThat(result.changeChains()).allMatch(chain -> "legacy_partial".equals(chain.compatibilityStatus()));
        assertThat(result.traceCoverage().missingSegments()).contains("traceIds");
        assertThat(result.traceCoverage().complete()).isFalse();
    }

    @Test
    void scopedTraceQueriesReviewTasksOnlyWithinVisibleBranches() {
        when(rbacAuthorizationApplicationService.permissionDataScope(9L, 1L, "operation_log.view"))
                .thenReturn(PermissionDataScope.branches(Set.of(10L)));
        TrackingObjectResponse summary = summary("person", 100L);
        when(trackingObjectQueryRepository.findVisibleById(1L, "person", 100L, false, List.of(10L)))
                .thenReturn(Optional.of(summary));
        RevisionEntity revision = revision(11L, "person", 100L);
        ReviewTaskEntity task = reviewTask(21L, 11L, "pending");
        when(revisionRepository.findByClanIdAndTargetTypeAndTargetIdOrderBySubmitTimeDesc(
                eq(1L), eq("person"), eq(100L), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of(revision)));
        when(reviewTaskRepository.findByClanIdAndRevisionIdInAndBranchIdInOrderByCreatedAtDesc(
                eq(1L), eq(List.of(11L)), eq(List.of(10L)), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of(task)));
        when(sourceBindingRepository.findByClanIdAndTargetTypeAndTargetIdOrderByCreatedAtDesc(
                eq(1L), eq("person"), eq(100L), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of()));

        TrackingTraceDetailResponse result = service.trace(1L, 9L, "person", 100L, false);

        assertThat(result.reviewTasks()).extracting(TrackingTraceDetailResponse.ReviewTaskItem::id)
                .containsExactly(21L);
        verify(reviewTaskRepository).findByClanIdAndRevisionIdInAndBranchIdInOrderByCreatedAtDesc(
                eq(1L), eq(List.of(11L)), eq(List.of(10L)), any(Pageable.class)
        );
        verify(reviewTaskRepository, never()).findByClanIdAndRevisionIdInOrderByCreatedAtDesc(
                anyLong(), any(), any(Pageable.class)
        );
    }

    private TrackingObjectResponse summary(String type, Long id) {
        return new TrackingObjectResponse(
                type, id, type + "-name", "辅助信息", "长房", "业务摘要", "official",
                LocalDateTime.of(2026, 7, 1, 10, 0)
        );
    }

    private RevisionEntity revision(Long id, String targetType, Long targetId) {
        RevisionEntity revision = new RevisionEntity();
        revision.setId(id);
        revision.setClanId(1L);
        revision.setTargetType(targetType);
        revision.setTargetId(targetId);
        revision.setChangeType("update");
        revision.setStatus("submitted");
        revision.setDiffSummary("字段发生变化");
        revision.setSubmitterId(8L);
        revision.setSubmitTime(LocalDateTime.of(2026, 7, 1, 10, 0).plusMinutes(id));
        revision.setTraceId(traceId(revision.getId()));
        return revision;
    }

    private UUID traceId(Long revisionId) {
        return UUID.nameUUIDFromBytes(("revision-" + revisionId).getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private ReviewTaskEntity reviewTask(Long id, Long revisionId, String status) {
        ReviewTaskEntity task = new ReviewTaskEntity();
        task.setId(id);
        task.setClanId(1L);
        task.setRevisionId(revisionId);
        task.setTraceId(traceId(revisionId));
        task.setReviewLevel(1);
        task.setReviewerId(9L);
        task.setBranchId(10L);
        task.setStatus(status);
        task.setCreatedAt(LocalDateTime.of(2026, 7, 1, 11, 0));
        task.setReviewedAt(LocalDateTime.of(2026, 7, 1, 12, 0));
        return task;
    }
}
