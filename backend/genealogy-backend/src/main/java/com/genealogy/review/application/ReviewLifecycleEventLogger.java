package com.genealogy.review.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/** Logs explicit review lifecycle events without coupling to application-service method signatures. */
@Component
public class ReviewLifecycleEventLogger {

    private static final Logger log = LoggerFactory.getLogger(ReviewLifecycleEventLogger.class);

    @EventListener
    public void on(ReviewLifecycleEvent event) {
        if ("review_task_created".equals(event.event())) {
            log.info(
                    "event={} traceId={} revisionId={} reviewTaskId={} targetType={} targetId={} actorId={} clanId={} toStatus={} result={} costMs={}",
                    event.event(), event.traceId(), event.revisionId(), event.reviewTaskId(), event.targetType(),
                    event.targetId(), event.actorId(), event.clanId(), event.toStatus(), event.result(), event.costMs()
            );
            return;
        }
        log.info(
                "event={} traceId={} revisionId={} reviewTaskId={} targetType={} targetId={} actorId={} clanId={} fromStatus={} toStatus={} action={} result={} errorCode={} costMs={}",
                event.event(), event.traceId(), event.revisionId(), event.reviewTaskId(), event.targetType(),
                event.targetId(), event.actorId(), event.clanId(), event.fromStatus(), event.toStatus(), event.action(),
                event.result(), event.errorCode(), event.costMs()
        );
    }
}
