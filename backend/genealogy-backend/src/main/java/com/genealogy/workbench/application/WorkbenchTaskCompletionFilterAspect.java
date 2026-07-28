package com.genealogy.workbench.application;

import com.genealogy.common.api.PageResponse;
import com.genealogy.workbench.dto.WorkbenchSummaryResponse;
import com.genealogy.workbench.dto.WorkbenchTaskResponse;
import com.genealogy.workbench.repository.WorkbenchTaskActionRepository;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;

@Aspect
@Component
@Order(Ordered.LOWEST_PRECEDENCE - 20)
public class WorkbenchTaskCompletionFilterAspect {

    private static final String ACTION_MARK_CHECKED = "mark_checked";
    private static final int MAX_TASKS = 200;

    private final WorkbenchTaskActionRepository actionRepository;
    private final ObjectProvider<WorkbenchApplicationService> workbenchServiceProvider;
    private final ThreadLocal<Boolean> completionFilterBypass = ThreadLocal.withInitial(() -> false);

    public WorkbenchTaskCompletionFilterAspect(
            WorkbenchTaskActionRepository actionRepository,
            ObjectProvider<WorkbenchApplicationService> workbenchServiceProvider
    ) {
        this.actionRepository = actionRepository;
        this.workbenchServiceProvider = workbenchServiceProvider;
    }

    @Around("execution(* com.genealogy.workbench.application.WorkbenchApplicationService.tasks(..))")
    public Object filterCompletedTasks(ProceedingJoinPoint joinPoint) throws Throwable {
        if (Boolean.TRUE.equals(completionFilterBypass.get())) {
            return joinPoint.proceed();
        }
        Object[] originalArgs = joinPoint.getArgs();
        if (originalArgs.length < 13 || !(originalArgs[0] instanceof Long clanId)) {
            return joinPoint.proceed();
        }

        int requestedPageNo = originalArgs[10] instanceof Integer value ? Math.max(1, value) : 1;
        int requestedPageSize = originalArgs[11] instanceof Integer value ? Math.max(1, Math.min(value, MAX_TASKS)) : 20;
        Object[] allArgs = originalArgs.clone();
        allArgs[10] = 1;
        allArgs[11] = MAX_TASKS;

        Object result = joinPoint.proceed(allArgs);
        if (!(result instanceof PageResponse<?> page)) {
            return result;
        }
        Set<String> completedTaskKeys = actionRepository
                .findByClanIdAndActionType(clanId, ACTION_MARK_CHECKED)
                .stream()
                .map(action -> action.getTaskKey())
                .collect(Collectors.toSet());
        List<WorkbenchTaskResponse> visible = page.records().stream()
                .filter(WorkbenchTaskResponse.class::isInstance)
                .map(WorkbenchTaskResponse.class::cast)
                .filter(task -> !completedTaskKeys.contains(task.key()))
                .toList();
        int fromIndex = Math.min((requestedPageNo - 1) * requestedPageSize, visible.size());
        int toIndex = Math.min(fromIndex + requestedPageSize, visible.size());
        return PageResponse.of(visible.subList(fromIndex, toIndex), visible.size(), requestedPageNo, requestedPageSize);
    }

    @Around("execution(* com.genealogy.workbench.application.WorkbenchApplicationService.summary(..))")
    public Object summarizeIncompleteTasks(ProceedingJoinPoint joinPoint) throws Throwable {
        if (Boolean.TRUE.equals(completionFilterBypass.get())) {
            return joinPoint.proceed();
        }
        Object[] args = joinPoint.getArgs();
        if (args.length < 3
                || !(args[0] instanceof Long clanId)
                || !(args[2] instanceof Long actorId)) {
            return joinPoint.proceed();
        }
        Long branchId = args[1] instanceof Long value ? value : null;
        PageResponse<WorkbenchTaskResponse> page = workbenchServiceProvider.getObject().tasks(
                clanId,
                branchId,
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
        );
        List<WorkbenchTaskResponse> tasks = page.records();
        return new WorkbenchSummaryResponse(
                tasks.size(),
                tasks.stream().filter(task -> "high".equals(task.risk())).count(),
                tasks.stream().filter(task -> "missing_source".equals(task.type())).count(),
                tasks.stream().filter(task -> "generation_mismatch".equals(task.type())).count()
        );
    }

    public <T> T withoutCompletionFilter(Supplier<T> supplier) {
        boolean previous = completionFilterBypass.get();
        completionFilterBypass.set(true);
        try {
            return supplier.get();
        } finally {
            if (previous) {
                completionFilterBypass.set(true);
            } else {
                completionFilterBypass.remove();
            }
        }
    }
}
