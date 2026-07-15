package com.genealogy.review.application;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class StableTraceIdMigrationTest {

    @Test
    void migrationAddsNullableLifecycleColumnsAndMatchingIndexesWithoutFabricatingHistory() throws Exception {
        String sql = Files.readString(Path.of(
                "src/main/resources/db/migration/V20260714233000__add_stable_revision_trace_lifecycle.sql"
        )).toLowerCase();

        assertThat(sql).contains("alter table revision", "add column if not exists trace_id uuid");
        assertThat(sql).contains("alter table review_task", "add column if not exists trace_id uuid");
        assertThat(sql).contains("alter table operation_log", "revision_id bigint", "review_task_id bigint");
        assertThat(sql).contains("business_target_type", "business_target_id", "event_result");
        assertThat(sql).contains("uq_revision_trace_id", "idx_review_task_trace_created");
        assertThat(sql).contains("idx_operation_log_trace_created", "idx_operation_log_business_target_created");
        assertThat(sql).doesNotContain("update revision set trace_id");
        assertThat(sql).doesNotContain("gen_random_uuid()", "uuid_generate");
        assertThat(sql).contains("where task.revision_id = revision.id", "revision.trace_id is not null");
    }
}
