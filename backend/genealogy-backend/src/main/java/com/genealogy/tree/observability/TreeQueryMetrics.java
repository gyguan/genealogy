package com.genealogy.tree.observability;

import com.genealogy.tree.application.GraphSnapshot;
import com.genealogy.tree.dto.TreeGraphWarning;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.function.Supplier;

@Component
public class TreeQueryMetrics {

    private static final Logger log = LoggerFactory.getLogger(TreeQueryMetrics.class);

    private final MeterRegistry registry;
    private final long slowQueryMillis;

    public TreeQueryMetrics(
            MeterRegistry registry,
            @Value("${genealogy.tree.observability.slow-query-ms:1000}") long slowQueryMillis
    ) {
        this.registry = registry;
        this.slowQueryMillis = Math.max(1L, slowQueryMillis);
    }

    public GraphSnapshot observe(String scenario, Supplier<GraphSnapshot> query) {
        Timer.Sample sample = Timer.start(registry);
        long startedNanos = System.nanoTime();
        try {
            GraphSnapshot snapshot = query.get();
            recordSuccess(scenario, snapshot, Duration.ofNanos(System.nanoTime() - startedNanos));
            return snapshot;
        } catch (RuntimeException exception) {
            Counter.builder("genealogy.tree.query.errors")
                    .description("Tree query failures")
                    .tag("scenario", scenario)
                    .tag("exception", exception.getClass().getSimpleName())
                    .register(registry)
                    .increment();
            throw exception;
        } finally {
            sample.stop(Timer.builder("genealogy.tree.query.duration")
                    .description("Tree query execution time")
                    .tag("scenario", scenario)
                    .publishPercentileHistogram()
                    .register(registry));
        }
    }

    private void recordSuccess(String scenario, GraphSnapshot snapshot, Duration duration) {
        int nodeCount = snapshot.nodes().size();
        int edgeCount = snapshot.edges().size();

        DistributionSummary.builder("genealogy.tree.query.nodes")
                .description("Nodes returned by tree queries")
                .tag("scenario", scenario)
                .register(registry)
                .record(nodeCount);
        DistributionSummary.builder("genealogy.tree.query.edges")
                .description("Edges returned by tree queries")
                .tag("scenario", scenario)
                .register(registry)
                .record(edgeCount);

        if (snapshot.meta() != null && snapshot.meta().truncated()) {
            Counter.builder("genealogy.tree.query.truncated")
                    .description("Tree queries truncated by configured limits")
                    .tag("scenario", scenario)
                    .register(registry)
                    .increment();
        }

        int filtered = snapshot.warnings().stream()
                .filter(warning -> "partial_visibility".equals(warning.code())
                        || "root_filtered".equals(warning.code()))
                .mapToInt(TreeGraphWarning::count)
                .sum();
        if (filtered > 0) {
            Counter.builder("genealogy.tree.query.permission_filtered")
                    .description("People or relations removed by authorization, privacy or status rules")
                    .tag("scenario", scenario)
                    .register(registry)
                    .increment(filtered);
        }

        if (duration.toMillis() >= slowQueryMillis) {
            log.warn(
                    "Slow tree query scenario={} durationMs={} nodes={} edges={} truncated={}",
                    scenario,
                    duration.toMillis(),
                    nodeCount,
                    edgeCount,
                    snapshot.meta() != null && snapshot.meta().truncated()
            );
        }
    }
}
