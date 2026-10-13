package com.genealogy.review.application;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class StableTraceIdMigrationTest {

    private static final Path BASELINE = Path.of(
            "src/main/resources/db/migration/V1__create_current_schema.sql"
    );

    @Test
    void baselineKeepsStableTraceLifecycleColumnsNullableAndIndexed() throws Exception {
        String sql = Files.readString(BASELINE).toLowerCase();

        assertThat(sql).contains(
                "create table public.revision",
                "create table public.review_task",
                "create table public.operation_log",
                "trace_id uuid",
                "revision_id bigint",
                "review_task_id bigint",
                "business_target_type character varying(50)",
                "business_target_id bigint",
                "event_result character varying(32)"
        );
        assertThat(sql).contains(
                "create unique index uq_revision_trace_id",
                "create index idx_review_task_trace_created",
                "create index idx_operation_log_trace_created",
                "create index idx_operation_log_business_target_created"
        );
        assertThat(sql)
                .doesNotContain("trace_id uuid not null")
                .doesNotContain("trace_id uuid default")
                .doesNotContain("gen_random_uuid()", "uuid_generate");
    }
}
