package com.genealogy.workbench.application;

import com.genealogy.common.api.PageResponse;
import com.genealogy.workbench.dto.WorkbenchTaskResponse;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Aspect
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 100)
public class WorkbenchTaskVersionNormalizationAspect {

    @Around("execution(* com.genealogy.workbench.application.WorkbenchApplicationService.tasks(..))")
    public Object normalizeSyntheticTaskVersions(ProceedingJoinPoint joinPoint) throws Throwable {
        Object result = joinPoint.proceed();
        if (!(result instanceof PageResponse<?> page)) {
            return result;
        }
        List<WorkbenchTaskResponse> normalized = page.records().stream()
                .filter(WorkbenchTaskResponse.class::isInstance)
                .map(WorkbenchTaskResponse.class::cast)
                .map(this::normalize)
                .toList();
        return PageResponse.of(normalized, page.total(), page.pageNo(), page.pageSize());
    }

    private WorkbenchTaskResponse normalize(WorkbenchTaskResponse task) {
        LocalDateTime stableUpdatedAt = task.updatedAt();
        if ("missing_source".equals(task.type()) || "relationship_check".equals(task.type())) {
            stableUpdatedAt = task.createdAt() == null ? task.updatedAt() : task.createdAt();
        }
        if (stableUpdatedAt == task.updatedAt()) {
            return task;
        }
        return new WorkbenchTaskResponse(
                task.key(),
                task.taskName(),
                task.bookName(),
                task.creatorName(),
                task.createdAt(),
                task.type(),
                task.typeText(),
                task.objectName(),
                task.branchName(),
                task.risk(),
                task.status(),
                task.statusText(),
                task.suggestion(),
                task.problemDescription(),
                task.involvedObject(),
                task.riskReason(),
                task.reviewBlocked(),
                task.relatedEntryType(),
                task.relatedEntryId(),
                task.relatedEntryText(),
                task.statusDescription(),
                stableUpdatedAt
        );
    }
}
