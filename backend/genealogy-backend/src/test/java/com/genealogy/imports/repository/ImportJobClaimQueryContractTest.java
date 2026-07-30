package com.genealogy.imports.repository;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class ImportJobClaimQueryContractTest {

    @Test
    void claimQueryMustUsePostgresSkipLockedAndStableOrdering() throws Exception {
        Method method = ImportJobRepository.class.getMethod("findNextExecutableForUpdate", java.time.LocalDateTime.class);
        Query query = method.getAnnotation(Query.class);

        assertThat(query).isNotNull();
        String sql = query.value().replaceAll("\\s+", " ").trim().toLowerCase();
        assertThat(query.nativeQuery()).isTrue();
        assertThat(sql)
                .contains("for update skip locked")
                .contains("order by created_at asc, id asc")
                .contains("lease_expires_at is null or lease_expires_at < :now")
                .contains("execution_status in ('queued', 'running', 'retry_wait')");
    }
}
