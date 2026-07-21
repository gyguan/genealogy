package com.genealogy.workbench.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.review.application.ReviewTaskQueryApplicationService;
import com.genealogy.review.dto.ReviewTaskListItemResponse;
import com.genealogy.review.dto.ReviewTaskViewDetailResponse;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.workbench.dto.WorkbenchHistoryItemResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class WorkbenchTaskHistoryApplicationService {

    private static final Pattern REVIEW_TASK_KEY = Pattern.compile("^review-(\\d+)$");

    private final CheckTaskRepository checkTaskRepository;
    private final ReviewTaskQueryApplicationService reviewTaskQueryApplicationService;

    public WorkbenchTaskHistoryApplicationService(
            CheckTaskRepository checkTaskRepository,
            ReviewTaskQueryApplicationService reviewTaskQueryApplicationService
    ) {
        this.checkTaskRepository = checkTaskRepository;
        this.reviewTaskQueryApplicationService = reviewTaskQueryApplicationService;
    }

    @Transactional(readOnly = true)
    public List<WorkbenchHistoryItemResponse> history(String taskKey, Long actorId) {
        Matcher matcher = REVIEW_TASK_KEY.matcher(taskKey == null ? "" : taskKey.trim());
        if (!matcher.matches()) {
            // Rule-derived workbench tasks are calculated from current business data and have no persisted history.
            return List.of();
        }

        Long reviewTaskId;
        try {
            reviewTaskId = Long.valueOf(matcher.group(1));
        } catch (NumberFormatException exception) {
            throw new BusinessException("WORKBENCH_TASK_KEY_INVALID", "修谱任务标识无效");
        }

        CheckTaskEntity reviewTask = checkTaskRepository.findById(reviewTaskId)
                .orElseThrow(() -> new BusinessException("REVIEW_TASK_NOT_FOUND", "审核任务不存在"));
        ReviewTaskViewDetailResponse detail = reviewTaskQueryApplicationService.detail(
                reviewTask.getClanId(),
                reviewTaskId,
                actorId
        );
        return detail.history().stream().map(this::toHistoryItem).toList();
    }

    private WorkbenchHistoryItemResponse toHistoryItem(ReviewTaskListItemResponse item) {
        String status = normalize(item.status());
        boolean processed = item.processedAt() != null || !"pending".equals(status);
        return new WorkbenchHistoryItemResponse(
                item.id(),
                processed
                        ? firstNonBlank(item.reviewerName(), item.submitterName(), "审核流程")
                        : firstNonBlank(item.submitterName(), item.reviewerName(), "审核流程"),
                actionText(status),
                firstNonBlank(item.reviewComment(), item.diffSummary()),
                resultText(status),
                item.processedAt() == null ? item.submitTime() : item.processedAt()
        );
    }

    private String actionText(String status) {
        return switch (status) {
            case "approved", "passed", "completed" -> "审核通过";
            case "rejected" -> "审核驳回";
            case "cancelled", "canceled" -> "审核取消";
            case "pending" -> "提交审核";
            default -> "审核状态更新";
        };
    }

    private String resultText(String status) {
        return switch (status) {
            case "approved", "passed", "completed" -> "已通过";
            case "rejected" -> "已驳回";
            case "cancelled", "canceled" -> "已取消";
            case "pending" -> "待审核";
            case "reviewing" -> "审核中";
            default -> "状态未知";
        };
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
