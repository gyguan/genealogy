package com.genealogy.workbench.application;

import com.genealogy.review.application.ReviewTaskQueryApplicationService;
import com.genealogy.review.dto.ReviewTaskListItemResponse;
import com.genealogy.review.dto.ReviewTaskViewDetailResponse;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.workbench.dto.WorkbenchHistoryItemResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkbenchTaskHistoryApplicationServiceTest {

    @Mock private CheckTaskRepository checkTaskRepository;
    @Mock private ReviewTaskQueryApplicationService reviewTaskQueryApplicationService;

    private WorkbenchTaskHistoryApplicationService service;

    @BeforeEach
    void setUp() {
        service = new WorkbenchTaskHistoryApplicationService(
                checkTaskRepository,
                reviewTaskQueryApplicationService
        );
    }

    @Test
    void reviewTaskKeyShouldReuseCurrentReviewHistoryApi() {
        CheckTaskEntity task = new CheckTaskEntity();
        task.setId(30L);
        task.setClanId(7L);

        LocalDateTime submittedAt = LocalDateTime.of(2026, 7, 20, 9, 0);
        LocalDateTime processedAt = LocalDateTime.of(2026, 7, 20, 10, 0);
        ReviewTaskListItemResponse pending = reviewItem(
                30L, "pending", "提交人甲", null, null, "等待审核", submittedAt, null
        );
        ReviewTaskListItemResponse approved = reviewItem(
                29L, "approved", "提交人甲", "审核人乙", "资料核验通过", "第一轮审核", submittedAt.minusDays(1), processedAt.minusDays(1)
        );

        when(checkTaskRepository.findById(30L)).thenReturn(Optional.of(task));
        when(reviewTaskQueryApplicationService.detail(7L, 30L, 9L))
                .thenReturn(new ReviewTaskViewDetailResponse(pending, List.of(pending, approved)));

        List<WorkbenchHistoryItemResponse> history = service.history("review-30", 9L);

        assertThat(history).hasSize(2);
        assertThat(history.get(0).operatorName()).isEqualTo("提交人甲");
        assertThat(history.get(0).actionText()).isEqualTo("提交审核");
        assertThat(history.get(0).resultText()).isEqualTo("待审核");
        assertThat(history.get(0).createdAt()).isEqualTo(submittedAt);
        assertThat(history.get(1).operatorName()).isEqualTo("审核人乙");
        assertThat(history.get(1).actionText()).isEqualTo("审核通过");
        assertThat(history.get(1).comment()).isEqualTo("资料核验通过");
        assertThat(history.get(1).resultText()).isEqualTo("已通过");
        verify(checkTaskRepository).findById(30L);
        verify(reviewTaskQueryApplicationService).detail(7L, 30L, 9L);
    }

    @Test
    void ruleDerivedTaskShouldReturnEmptyHistoryWithoutCallingReviewApi() {
        assertThat(service.history("generation-12", 9L)).isEmpty();
        assertThat(service.history("missing-source-all", 9L)).isEmpty();
        assertThat(service.history("relationship-check-candidate", 9L)).isEmpty();
        assertThat(service.history("review-invalid", 9L)).isEmpty();

        verifyNoInteractions(checkTaskRepository, reviewTaskQueryApplicationService);
    }

    private ReviewTaskListItemResponse reviewItem(
            Long id,
            String status,
            String submitterName,
            String reviewerName,
            String reviewComment,
            String diffSummary,
            LocalDateTime submitTime,
            LocalDateTime processedAt
    ) {
        return new ReviewTaskListItemResponse(
                id,
                7L,
                100L + id,
                null,
                null,
                status,
                "person",
                88L,
                "人物资料审核",
                diffSummary,
                1L,
                submitterName,
                reviewerName == null ? null : 2L,
                reviewerName,
                reviewComment,
                submitTime,
                processedAt,
                null
        );
    }
}
