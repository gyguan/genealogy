package com.genealogy.imports.application;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ImportRuntimeLoggingArchitectureTest {

    private static final Path APPLICATION = Path.of("src/main/java/com/genealogy/imports/application");

    @Test
    void submissionLogsMustCoverEnqueueAndDeduplicationWithoutFullKeys() throws IOException {
        String source = Files.readString(APPLICATION.resolve("ImportAsyncApplicationService.java"));

        assertThat(source)
                .contains("event=import_job_enqueued")
                .contains("event=import_job_deduplicated")
                .contains("submissionKeyPrefix={}")
                .doesNotContain("idempotencyKey={}")
                .doesNotContain("fileContent={}");
    }

    @Test
    void coordinatorLogsMustCoverClaimChunkRetryTerminalAndSafePointTransitions() throws IOException {
        String source = Files.readString(APPLICATION.resolve("ImportJobExecutionCoordinatorService.java"));

        assertThat(source)
                .contains("event=import_job_claimed")
                .contains("event=import_chunk_started")
                .contains("event=import_chunk_completed")
                .contains("event=import_job_retry_scheduled")
                .contains("event=import_job_terminal_failure")
                .contains("import_job_partial_cancelled")
                .contains("import_job_cancelled")
                .contains("event=import_job_paused")
                .contains("ownerPrefix={}")
                .doesNotContain("leaseOwner={}")
                .doesNotContain("originalRow={}");
    }

    @Test
    void userTransitionsMustLogPauseResumeCancelAndRecovery() throws IOException {
        String source = Files.readString(APPLICATION.resolve("ImportJobExecutionApplicationService.java"));

        assertThat(source)
                .contains("event=import_job_pause_requested")
                .contains("event=import_job_resumed")
                .contains("event=import_job_cancel_requested")
                .contains("event=import_job_recovered")
                .contains("fromStatus={}")
                .contains("toStatus={}")
                .contains("cursorRowNo={}")
                .contains("processedCount={}")
                .contains("publishedCount={}");
    }
}
