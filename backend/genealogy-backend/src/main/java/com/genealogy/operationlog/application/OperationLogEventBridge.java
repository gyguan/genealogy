package com.genealogy.operationlog.application;

import com.genealogy.operationlog.entity.OperationLogEntity;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

/** Spring bridge used by the JPA entity listener after an audit row is persisted. */
@Component
public class OperationLogEventBridge {

    private static volatile ApplicationEventPublisher publisher;

    public OperationLogEventBridge(ApplicationEventPublisher publisher) {
        install(publisher);
    }

    private static void install(ApplicationEventPublisher eventPublisher) {
        publisher = eventPublisher;
    }

    public static void publish(OperationLogEntity entity) {
        ApplicationEventPublisher current = publisher;
        if (current == null || entity == null) return;
        try {
            current.publishEvent(new OperationRecordedEvent(
                    entity.getClanId(), entity.getActorId(), entity.getActionType(), entity.getTargetType(), entity.getTargetId(),
                    entity.getTraceId(), entity.getRevisionId(), entity.getReviewTaskId(), entity.getBusinessTargetType(),
                    entity.getBusinessTargetId(), entity.getEventResult()
            ));
        } catch (RuntimeException ignored) {
            // Runtime diagnostics remain best effort and never affect persistent audit or business execution.
        }
    }
}
