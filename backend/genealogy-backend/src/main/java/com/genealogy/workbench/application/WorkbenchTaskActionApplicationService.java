package com.genealogy.workbench.application;

import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.workbench.dto.WorkbenchTaskActionRequest;
import com.genealogy.workbench.dto.WorkbenchTaskActionResponse;
import com.genealogy.workbench.dto.WorkbenchTaskResponse;
import com.genealogy.workbench.entity.WorkbenchTaskActionEntity;
import com.genealogy.workbench.repository.WorkbenchTaskActionRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class WorkbenchTaskActionApplicationService {

    private static final String ACTION_MARK_CHECKED = "mark_checked";
    private static final int MAX_TASKS = 200;

    private final WorkbenchApplicationService workbenchApplicationService;
    private final WorkbenchTaskCompletionFilterAspect completionFilterAspect;
    private final WorkbenchTaskActionRepository actionRepository;
    private final WorkbenchTaskActionWriteService actionWriteService;
    private final OperationLogApplicationService operationLogApplicationService;
    private final ConcurrentHashMap<String, ReentrantLock> locks = new ConcurrentHashMap<>();

    public WorkbenchTaskActionApplicationService(
            WorkbenchApplicationService workbenchApplicationService,
            WorkbenchTaskCompletionFilterAspect completionFilterAspect,
            WorkbenchTaskActionRepository actionRepository,
            WorkbenchTaskActionWriteService actionWriteService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.workbenchApplicationService = workbenchApplicationService;
        this.completionFilterAspect = completionFilterAspect;
        this.actionRepository = actionRepository;
        this.actionWriteService = actionWriteService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    public WorkbenchTaskActionResponse execute(
            String taskKey,
            WorkbenchTaskActionRequest request,
            Long actorId
    ) {
        String normalizedTaskKey = normalizeTaskKey(taskKey);
        String normalizedAction = normalizeAction(request.action());
        String normalizedComment = normalizeComment(request.comment());
        WorkbenchTaskResponse task = requireVisibleRawTask(
                request.clanId(),
                normalizedTaskKey,
                actorId
        );
        validateVersion(task, request.expectedUpdatedAt());

        String lockKey = request.clanId() + ":" + normalizedTaskKey + ":" + normalizedAction;
        ReentrantLock lock = locks.computeIfAbsent(lockKey, ignored -> new ReentrantLock());
        lock.lock();
        try {
            WorkbenchTaskActionEntity existing = actionRepository
                    .findByClanIdAndTaskKeyAndActionType(
                            request.clanId(),
                            normalizedTaskKey,
                            normalizedAction
                    )
                    .orElse(null);
            if (existing != null) {
                return toResponse(existing, true);
            }

            WorkbenchTaskActionEntity entity = new WorkbenchTaskActionEntity();
            entity.setClanId(request.clanId());
            entity.setTaskKey(normalizedTaskKey);
            entity.setActionType(normalizedAction);
            entity.setComment(normalizedComment);
            entity.setActorId(actorId);
            entity.setExpectedUpdatedAt(request.expectedUpdatedAt());
            entity.setCreatedAt(LocalDateTime.now());

            WorkbenchTaskActionEntity saved;
            try {
                saved = actionWriteService.insert(entity);
            } catch (DataIntegrityViolationException conflict) {
                WorkbenchTaskActionEntity raced = actionRepository
                        .findByClanIdAndTaskKeyAndActionType(
                                request.clanId(),
                                normalizedTaskKey,
                                normalizedAction
                        )
                        .orElseThrow(() -> conflict);
                return toResponse(raced, true);
            }

            operationLogApplicationService.record(
                    request.clanId(),
                    actorId,
                    "workbench_task_mark_checked",
                    "workbench_task_action",
                    saved.getId(),
                    "修谱任务已标记核查完成",
                    "taskKey=" + normalizedTaskKey
                            + "; taskName=" + task.taskName()
                            + "; comment=" + normalizedComment
            );
            return toResponse(saved, false);
        } finally {
            lock.unlock();
            if (!lock.hasQueuedThreads()) {
                locks.remove(lockKey, lock);
            }
        }
    }

    private WorkbenchTaskResponse requireVisibleRawTask(Long clanId, String taskKey, Long actorId) {
        PageResponse<WorkbenchTaskResponse> page = completionFilterAspect.withoutCompletionFilter(() ->
                workbenchApplicationService.tasks(
                        clanId,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        1,
                        MAX_TASKS,
                        actorId
                )
        );
        return page.records().stream()
                .filter(task -> taskKey.equals(task.key()))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        "WORKBENCH_TASK_NOT_FOUND",
                        "修谱任务不存在或不在当前权限范围"
                ));
    }

    private void validateVersion(WorkbenchTaskResponse task, LocalDateTime expectedUpdatedAt) {
        if (expectedUpdatedAt == null || task.updatedAt() == null) {
            return;
        }
        if (!Objects.equals(task.updatedAt(), expectedUpdatedAt)) {
            throw new BusinessException(
                    "WORKBENCH_TASK_VERSION_CONFLICT",
                    "修谱任务已发生变化，请刷新后重试"
            );
        }
    }

    private String normalizeTaskKey(String taskKey) {
        String normalized = taskKey == null ? "" : taskKey.trim();
        if (normalized.isEmpty() || normalized.length() > 255) {
            throw new BusinessException("WORKBENCH_TASK_KEY_INVALID", "修谱任务标识无效");
        }
        return normalized;
    }

    private String normalizeAction(String action) {
        String normalized = action == null ? "" : action.trim().toLowerCase();
        if (!ACTION_MARK_CHECKED.equals(normalized)) {
            throw new BusinessException("WORKBENCH_TASK_ACTION_UNSUPPORTED", "不支持的修谱任务动作");
        }
        return normalized;
    }

    private String normalizeComment(String comment) {
        String normalized = comment == null ? "" : comment.trim();
        if (normalized.isEmpty()) {
            throw new BusinessException("WORKBENCH_TASK_COMMENT_REQUIRED", "核查完成必须填写备注");
        }
        return normalized;
    }

    private WorkbenchTaskActionResponse toResponse(WorkbenchTaskActionEntity entity, boolean idempotent) {
        return new WorkbenchTaskActionResponse(
                entity.getId(),
                entity.getClanId(),
                entity.getTaskKey(),
                entity.getActionType(),
                entity.getComment(),
                entity.getActorId(),
                entity.getExpectedUpdatedAt(),
                entity.getCreatedAt(),
                idempotent
        );
    }
}
