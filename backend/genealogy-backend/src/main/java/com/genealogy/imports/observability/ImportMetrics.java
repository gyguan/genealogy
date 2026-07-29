package com.genealogy.imports.observability;

import com.genealogy.imports.application.ImportJobLifecycleService.ImportBatchSummary;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class ImportMetrics {

    private final MeterRegistry registry;

    public ImportMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    public void record(String importType, Duration duration, ImportBatchSummary summary) {
        Timer.builder("genealogy.import.duration")
                .description("Import execution duration")
                .tag("type", importType)
                .register(registry)
                .record(duration);
        increment("genealogy.import.rows.success", importType, summary.success());
        increment("genealogy.import.rows.failure", importType, summary.failure());
        increment("genealogy.import.rows.skipped", importType, summary.skipped());
    }

    private void increment(String name, String importType, int amount) {
        if (amount <= 0) return;
        Counter.builder(name)
                .description("Import row outcome count")
                .tag("type", importType)
                .register(registry)
                .increment(amount);
    }
}
