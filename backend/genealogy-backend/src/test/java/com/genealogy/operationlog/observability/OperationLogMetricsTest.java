package com.genealogy.operationlog.observability;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Status;

import static org.assertj.core.api.Assertions.assertThat;

class OperationLogMetricsTest {

    @Test
    void exposesSuccessFailureRatioAndConsecutiveFailures() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        OperationLogMetrics metrics = new OperationLogMetrics(registry);

        metrics.recordSuccess();
        metrics.recordFailure();
        metrics.recordFailure();

        assertThat(metrics.successCount()).isEqualTo(1);
        assertThat(metrics.failureCount()).isEqualTo(2);
        assertThat(metrics.failureRatio()).isEqualTo(2.0d / 3.0d);
        assertThat(metrics.consecutiveFailureCount()).isEqualTo(2);
        assertThat(registry.get(OperationLogMetrics.WRITE_TOTAL).tag("result", "success").counter().count())
                .isEqualTo(1.0d);
        assertThat(registry.get(OperationLogMetrics.WRITE_TOTAL).tag("result", "failure").counter().count())
                .isEqualTo(2.0d);
        assertThat(registry.get(OperationLogMetrics.FAILURE_RATIO).gauge().value())
                .isEqualTo(2.0d / 3.0d);

        metrics.recordSuccess();
        assertThat(metrics.consecutiveFailureCount()).isZero();
    }

    @Test
    void healthBecomesDegradedAfterConfiguredConsecutiveFailures() {
        OperationLogMetrics metrics = new OperationLogMetrics(new SimpleMeterRegistry());
        OperationLogHealthIndicator indicator = new OperationLogHealthIndicator(metrics, 2);

        assertThat(indicator.health().getStatus()).isEqualTo(Status.UP);
        metrics.recordFailure();
        assertThat(indicator.health().getStatus()).isEqualTo(Status.UP);
        metrics.recordFailure();
        assertThat(indicator.health().getStatus().getCode()).isEqualTo("DEGRADED");
        assertThat(indicator.health().getDetails()).containsEntry("consecutiveFailures", 2L);
    }
}
