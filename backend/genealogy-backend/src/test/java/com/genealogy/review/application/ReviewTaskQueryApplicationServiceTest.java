package com.genealogy.review.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.dto.ReviewTaskListItemResponse;
import com.genealogy.review.dto.ReviewTaskViewDetailResponse;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.ReviewTaskQueryCriteria;
import com.genealogy.review.repository.ReviewTaskQueryRepository;
import com.genealogy.review.repository.ReviewTaskQueryRepository.QueryPage;
import com.genealogy.review.repository.ReviewTaskQueryRepository.ReviewTaskPair;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewTaskQueryApplicationServiceTest {

    @Mock private ReviewTaskQueryRepository queryRepository;
    @Mock private AuthorizationApplicationService authorizationService;
    @Mock private RbacAuthorizationApplicationService rbacService;
    @Mock private AppUserRepository userRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private ImportJobRepository importJobRepository;
    @Mock private ImportJobRowRepository importJobRowRepository;
    @Mock private PersonRepository personRepository;
    @Mock private RelationshipRepository relationshipRepository;
    @Mock private SourceRepository sourceRepository;
    @Mock private GenSchemeRepository genSchemeRepository;

    private ReviewTaskQueryApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ReviewTaskQueryApplicationService(
                queryRepository, authorizationService, rbacService, userRepository, branchRepository,
                importJobRepository, importJobRowRepository, personRepository, relationshipRepository,
                sourceRepository, genSchemeRepository
        );
    }

    @Test
    void submittedMineShouldForceCurrentSubmitterWithoutReviewPermission() {
        when(queryRepository.search(any(), eq(1), eq(20))).thenReturn(new QueryPage(List.of(), 0));

        service.search(
                1L, "submitted", "mine", null, null, null, null,
                null, null, null, null, 1, 20, 9L
        );

        ArgumentCaptor<ReviewTaskQueryCriteria> criteria = ArgumentCaptor.forClass(ReviewTaskQueryCriteria.class);
        verify(queryRepository).search(criteria.capture(), eq(1), eq(20));
        assertThat(criteria.getValue().view()).isEqualTo("submitted");
        assertThat(criteria.getValue().scope()).isEqualTo("mine");
        assertThat(criteria.getValue().actorId()).isEqualTo(9L);
        assertThat(criteria.getValue().enforceBranchScope()).isFalse();
        verify(authorizationService, never()).requirePermission(anyLong(), anyLong(), eq("review_task:view"));
    }

    @Test
    void processedMineShouldApplyReviewerBranchScope() {
        BranchEntity branch = branch(8L, "一房");
        when(branchRepository.findByIdAndClanId(8L, 1L)).thenReturn(Optional.of(branch));
        when(authorizationService.isCrossClanAdmin(9L)).thenReturn(false);
        when(rbacService.permissionDataScope(9L, 1L, "review_task:view"))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.branches(Set.of(8L, 9L)));
        when(queryRepository.search(any(), eq(2), eq(50))).thenReturn(new QueryPage(List.of(), 0));

        service.search(
                1L, "processed", "mine", null, null, "approved", 8L,
                null, null, null, null, 2, 50, 9L
        );

        ArgumentCaptor<ReviewTaskQueryCriteria> criteria = ArgumentCaptor.forClass(ReviewTaskQueryCriteria.class);
        verify(queryRepository).search(criteria.capture(), eq(2), eq(50));
        assertThat(criteria.getValue().enforceBranchScope()).isTrue();
        assertThat(criteria.getValue().fullClanAccess()).isFalse();
        assertThat(criteria.getValue().visibleBranchIds()).containsExactlyInAnyOrder(8L, 9L);
        assertThat(criteria.getValue().branchId()).isEqualTo(8L);
        verify(authorizationService).requirePermission(1L, 9L, "review_task:view");
    }

    @Test
    void importTaskShouldExposeSafeBusinessSummaryAndActorNames() {
        ReviewTaskPair pair = pair(101L, 201L, "approved", 9L, 10L,
                LocalDateTime.of(2026, 7, 14, 10, 0), LocalDateTime.of(2026, 7, 14, 11, 0),
                "人物导入批次：persons.xlsx，管理支派：一房，草稿：12 条，排除：2 条，第 3 轮审核");
        when(queryRepository.search(any(), eq(1), eq(20))).thenReturn(new QueryPage(List.of(pair), 1));
        when(userRepository.findAllById(any())).thenReturn(List.of(user(9L, "提交人甲"), user(10L, "审核人乙")));
        when(branchRepository.findAllById(any())).thenReturn(List.of(branch(8L, "一房")));

        ImportJobEntity job = new ImportJobEntity();
        job.setId(301L);
        job.setOriginalFilename("persons.xlsx");
        job.setSuccessCount(12);
        job.setReviewRound(3);
        when(importJobRepository.findAllById(any())).thenReturn(List.of(job));
        when(importJobRowRepository.countByJobIdsAndRowStatus(any(), eq(ImportJobRowEntity.STATUS_EXCLUDED)))
                .thenReturn(List.<Object[]>of(new Object[]{301L, 2L}));
        stubEmptyTargets();

        PageResponse<ReviewTaskListItemResponse> page = service.search(
                1L, "submitted", "mine", "import_job", null, null, null,
                null, null, null, null, 1, 20, 9L
        );

        ReviewTaskListItemResponse result = page.records().get(0);
        assertThat(result.title()).isEqualTo("导入批次 · persons.xlsx");
        assertThat(result.submitterName()).isEqualTo("提交人甲");
        assertThat(result.reviewerName()).isEqualTo("审核人乙");
        assertThat(result.targetSummary().fileName()).isEqualTo("persons.xlsx");
        assertThat(result.targetSummary().branchName()).isEqualTo("一房");
        assertThat(result.targetSummary().draftCount()).isEqualTo(12);
        assertThat(result.targetSummary().excludedCount()).isEqualTo(2);
        assertThat(result.targetSummary().reviewRound()).isEqualTo(3);
    }

    @Test
    void submitterShouldOpenAllHistoricalRoundsWithoutRawSnapshots() {
        ReviewTaskPair latest = pair(102L, 202L, "pending", 9L, null,
                LocalDateTime.of(2026, 7, 14, 12, 0), null, "第 2 轮审核");
        ReviewTaskPair first = pair(101L, 201L, "rejected", 9L, 10L,
                LocalDateTime.of(2026, 7, 13, 12, 0), LocalDateTime.of(2026, 7, 13, 13, 0), "第 1 轮审核");
        latest.record().setOldPayload("sensitive-before");
        latest.record().setNewPayload("sensitive-after");
        when(queryRepository.findByTaskId(102L)).thenReturn(Optional.of(latest));
        when(queryRepository.findHistory(1L, "import_job", 301L, 100)).thenReturn(List.of(latest, first));
        when(userRepository.findAllById(any())).thenReturn(List.of(user(9L, "提交人"), user(10L, "审核人")));
        when(branchRepository.findAllById(any())).thenReturn(List.of(branch(8L, "一房")));
        ImportJobEntity job = new ImportJobEntity();
        job.setId(301L);
        job.setOriginalFilename("persons.xlsx");
        job.setSuccessCount(5);
        when(importJobRepository.findAllById(any())).thenReturn(List.of(job));
        when(importJobRowRepository.countByJobIdsAndRowStatus(any(), eq(ImportJobRowEntity.STATUS_EXCLUDED)))
                .thenReturn(List.of());
        stubEmptyTargets();

        ReviewTaskViewDetailResponse detail = service.detail(1L, 102L, 9L);

        assertThat(detail.task().id()).isEqualTo(102L);
        assertThat(detail.history()).extracting(ReviewTaskListItemResponse::id).containsExactly(102L, 101L);
        assertThat(detail.task().diffSummary()).isEqualTo("第 2 轮审核");
        verify(authorizationService, never()).requirePermission(anyLong(), anyLong(), eq("review_task:view"));
    }

    private void stubEmptyTargets() {
        when(personRepository.findAllById(any())).thenReturn(List.of());
        when(relationshipRepository.findAllById(any())).thenReturn(List.of());
        when(sourceRepository.findAllById(any())).thenReturn(List.of());
        when(genSchemeRepository.findAllById(any())).thenReturn(List.of());
    }

    private ReviewTaskPair pair(
            Long taskId,
            Long revisionId,
            String status,
            Long submitterId,
            Long reviewerId,
            LocalDateTime submitTime,
            LocalDateTime reviewedAt,
            String summary
    ) {
        CheckTaskEntity task = new CheckTaskEntity();
        task.setId(taskId);
        task.setClanId(1L);
        task.setRevisionId(revisionId);
        task.setBranchId(8L);
        task.setStatus(status);
        task.setReviewerId(reviewerId);
        task.setReviewComment("review comment");
        task.setReviewedAt(reviewedAt);
        task.setCreatedAt(submitTime);

        AuditRecordEntity record = new AuditRecordEntity();
        record.setId(revisionId);
        record.setClanId(1L);
        record.setTargetType("import_job");
        record.setTargetId(301L);
        record.setSubmitterId(submitterId);
        record.setSubmitTime(submitTime);
        record.setStatus(status);
        record.setDiffSummary(summary);
        return new ReviewTaskPair(task, record);
    }

    private BranchEntity branch(Long id, String name) {
        BranchEntity branch = new BranchEntity();
        branch.setId(id);
        branch.setBranchName(name);
        return branch;
    }

    private AppUserEntity user(Long id, String displayName) {
        AppUserEntity user = new AppUserEntity();
        user.setId(id);
        user.setDisplayName(displayName);
        return user;
    }
}
