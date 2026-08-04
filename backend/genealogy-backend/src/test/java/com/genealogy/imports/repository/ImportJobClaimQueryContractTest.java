package com.genealogy.imports.repository;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

class ImportJobClaimQueryContractTest {

    @Test
    void claimQueryMustUsePostgresSkipLockedAndStableOrdering() throws Exception {
        String sql = compactSql(Files.readString(
                Path.of("src/main/resources/mapper/imports/ImportJobPersistenceMapper.xml")));

        assertThat(sql).contains("for update skip locked")
                .contains("order by created_at asc,id asc")
                .contains("lease_expires_at is null or lease_expires_at &lt; #{now}")
                .contains("execution_status in ('queued','running','retry_wait')");
    }

    private String compactSql(String sql) {
        return sql.replaceAll("\\s+", " ")
                .replaceAll("\\s*,\\s*", ",")
                .trim()
                .toLowerCase(Locale.ROOT);
    }
}
