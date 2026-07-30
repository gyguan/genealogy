package com.genealogy.review.application;

import com.genealogy.operationlog.application.OperationRecordedEvent;
import com.genealogy.operationlog.application.OperationTraceContext;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/** Maps successfully persisted review audit actions to explicit review lifecycle events. */
@Component
public class ReviewLifecycleOperationListener {

    private final ApplicationEventPublisher eventPublisher;

    public ReviewLifecycleOperationListener(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    @EventListener
    public void on(OperationRecordedEvent operation) {
        if (operation.traceId() == null) return;
        OperationTraceContext trace = OperationTraceContext.of(
                operation.traceId(),
                operation.revisionId(),
                operation.reviewTaskId(),
                operation.businessTargetType(),
                operation.businessTargetId(),
                operation.eventResult()
        );
        ReviewLifecycleEvent.fromOperation(
                operation.clanId(), operation.actorId(), operation.actionType(),
                operation.targetType(), operation.targetId(), trace
        ).forEach(eventPublisher::publishEvent);
    }
}
