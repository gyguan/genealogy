package com.genealogy.imports.application;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ImportRecoveryArchitectureTest {

    private static final Path MAIN = Path.of("src/main/java/com/genealogy/imports");

    @Test
    void asyncSubmissionMustUsePersistentIdempotencyKey() throws IOException {
        String service = Files.readString(MAIN.resolve("application/ImportAsyncApplicationService.java"));
        String repository = Files.readString(MAIN.resolve("repository/ImportJobRepository.java"));
        assertThat(service)
                .contains("submissionKey(")
                .contains("findFirstByClanIdAndIdempotencyKeyOrderByCreatedAtDesc")
                .contains("MessageDigest.getInstance(\"SHA-256\")");
        assertThat(repository).contains("findFirstByClanIdAndIdempotencyKeyOrderByCreatedAtDesc");
    }

    @Test
    void xlsxRoutingMustNotMaterializeWorkbookInHttpRequest() throws IOException {
        String service = Files.readString(MAIN.resolve("application/ImportAsyncApplicationService.java"));
        assertThat(service)
                .doesNotContain("WorkbookFactory")
                .doesNotContain("Workbook workbook")
                .contains("file.getSize()");
    }

    @Test
    void workerMustUseDatabaseLeaseAndCheckpointIdempotency() throws IOException {
        String repository = Files.readString(MAIN.resolve("repository/ImportJobRepository.java"));
        String chunk = Files.readString(MAIN.resolve("application/PersonAsyncImportChunkService.java"));
        assertThat(repository).contains("for update skip locked");
        assertThat(chunk)
                .contains("findByJobIdAndStageAndChunkNo")
                .contains("STATUS_COMPLETED")
                .contains("findByJobIdAndRowNo");
    }
}
