package com.genealogy.imports.repository;

import org.junit.jupiter.api.Test;
import java.nio.file.Files;
import java.nio.file.Path;
import static org.assertj.core.api.Assertions.assertThat;

class ImportJobClaimQueryContractTest {
    @Test
    void claimQueryMustUsePostgresSkipLockedAndStableOrdering() throws Exception {
        String sql = Files.readString(Path.of("src/main/resources/mapper/imports/ImportJobPersistenceMapper.xml"))
                .replaceAll("\\s+", " ").trim().toLowerCase();
        assertThat(sql).contains("for update skip locked")
                .contains("order by created_at asc,id asc")
                .contains("lease_expires_at is null or lease_expires_at &lt; #{now}")
                .contains("execution_status in ('queued','running','retry_wait')");
    }
}
