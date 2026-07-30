package com.genealogy.review.application;

import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationTraceContext;
import com.genealogy.operationlog.repository.OperationLogRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Publishes explicit review lifecycle events from the stable operation actions emitted by review use cases.
 * Persistent operation audit remains delegated to {@link OperationLogApplicationService}.
 */
@Service
@Primary
public class ReviewLifecycleOperationLogService extends OperationLogApplicationService {

    private final ApplicationEventPublisher eventPublisher;

    public ReviewLifecycleOperationLogService(
            OperationLogRepository operationLogRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        super(operationLogRepository);
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void record(
            Long clanId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            String summary,
            String detail,
            OperationTraceContext traceContext
    ) {
        super.record(clanId, actorId, actionType, targetType, targetId, summary, detail, traceContext);
        ReviewLifecycleEvent.fromOperation(clanId, actorId, actionType, targetType, targetId, traceContext)
                .forEach(this::publishSafely);
    }

    private void publishSafely(ReviewLifecycleEvent event) {
        try {
            eventPublisher.publishEvent(event);
        } catch (RuntimeException ignored) {
            // Runtime diagnostics are best effort and must never break the reviewed business transaction.
        }
    }
}
