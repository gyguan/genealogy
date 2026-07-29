package com.genealogy.operationlog.observability;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

/** Exposes sustained audit write failures without failing liveness. */
@Component("operationLogWrite")
public class OperationLogHealthIndicator implements HealthIndicator {

    private final OperationLogMetrics metrics;
    private final long consecutiveFailureThreshold;

    public OperationLogHealthIndicator(
            OperationLogMetrics metrics,
            @Value("${genealogy.operation-log.health.consecutive-failure-threshold:3}") long consecutiveFailureThreshold
    ) {
        this.metrics = metrics;
        this.consecutiveFailureThreshold = Math.max(1, consecutiveFailureThreshold);
    }

    @Override
    public Health health() {
        long consecutiveFailures = metrics.consecutiveFailureCount();
        Health.Builder builder = consecutiveFailures >= consecutiveFailureThreshold
                ? Health.status("DEGRADED")
                : Health.up();
        return builder
                .withDetail("successCount", metrics.successCount())
                .withDetail("failureCount", metrics.failureCount())
                .withDetail("failureRatio", metrics.failureRatio())
                .withDetail("consecutiveFailures", consecutiveFailures)
                .withDetail("consecutiveFailureThreshold", consecutiveFailureThreshold)
                .build();
    }
}
