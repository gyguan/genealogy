package com.genealogy.tree.observability;

import com.genealogy.tree.application.GraphSnapshot;
import com.genealogy.tree.dto.TreeGraphMeta;
import com.genealogy.tree.dto.TreeGraphWarning;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TreeQueryMetricsTest {

    @Test
    void recordsSizeTruncationAndPermissionFilteringWithoutPersonTags() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        TreeQueryMetrics metrics = new TreeQueryMetrics(registry, 60_000);
        GraphSnapshot snapshot = new GraphSnapshot(
                null,
                null,
                "descendants",
                "public",
                List.of(),
                List.of(),
                new TreeGraphMeta(5, 5, 0, 0, true, List.of("max_nodes"), false, 0, OffsetDateTime.now()),
                List.of(new TreeGraphWarning("partial_visibility", "filtered", 3))
        );

        assertThat(metrics.observe("person_descendants", () -> snapshot)).isSameAs(snapshot);
        assertThat(registry.get("genealogy.tree.query.truncated").counter().count()).isEqualTo(1.0);
        assertThat(registry.get("genealogy.tree.query.permission_filtered").counter().count()).isEqualTo(3.0);
        assertThat(registry.getMeters()).allSatisfy(meter ->
                assertThat(meter.getId().getTags()).allSatisfy(tag ->
                        assertThat(tag.getKey()).isNotIn("personId", "rootPersonId", "clanId", "branchId")
                )
        );
    }

    @Test
    void recordsFailuresAndRethrowsOriginalException() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        TreeQueryMetrics metrics = new TreeQueryMetrics(registry, 60_000);

        assertThatThrownBy(() -> metrics.observe("branch_descendants", () -> {
            throw new IllegalStateException("boom");
        })).isInstanceOf(IllegalStateException.class);

        assertThat(registry.get("genealogy.tree.query.errors").counter().count()).isEqualTo(1.0);
    }
}
