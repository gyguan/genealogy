package com.genealogy.operationlog.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicLong;

/** Metrics for best-effort operation audit persistence. */
@Component
public class OperationLogMetrics {

    public static final String WRITE_TOTAL = "genealogy.operation.log.write.total";
    public static final String FAILURE_RATIO = "genealogy.operation.log.write.failure.ratio";
    public static final String CONSECUTIVE_FAILURES = "genealogy.operation.log.write.consecutive.failures";

    private final Counter successCounter;
    private final Counter failureCounter;
    private final AtomicLong successes = new AtomicLong();
    private final AtomicLong failures = new AtomicLong();
    private final AtomicLong consecutiveFailures = new AtomicLong();

    public OperationLogMetrics(MeterRegistry meterRegistry) {
        this.successCounter = Counter.builder(WRITE_TOTAL)
                .description("Operation audit writes grouped by result")
                .tag("result", "success")
                .register(meterRegistry);
        this.failureCounter = Counter.builder(WRITE_TOTAL)
                .description("Operation audit writes grouped by result")
                .tag("result", "failure")
                .register(meterRegistry);
        Gauge.builder(FAILURE_RATIO, this, OperationLogMetrics::failureRatio)
                .description("Operation audit write failure ratio since process start")
                .register(meterRegistry);
        Gauge.builder(CONSECUTIVE_FAILURES, consecutiveFailures, AtomicLong::get)
                .description("Consecutive operation audit write failures")
                .register(meterRegistry);
    }

    public void recordSuccess() {
        successes.incrementAndGet();
        successCounter.increment();
        consecutiveFailures.set(0);
    }

    public void recordFailure() {
        failures.incrementAndGet();
        failureCounter.increment();
        consecutiveFailures.incrementAndGet();
    }

    public long successCount() {
        return successes.get();
    }

    public long failureCount() {
        return failures.get();
    }

    public long consecutiveFailureCount() {
        return consecutiveFailures.get();
    }

    public double failureRatio() {
        long total = successes.get() + failures.get();
        return total == 0 ? 0.0d : (double) failures.get() / total;
    }
}
