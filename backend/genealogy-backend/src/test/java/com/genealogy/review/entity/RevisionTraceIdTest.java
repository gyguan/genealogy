package com.genealogy.review.entity;

import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class RevisionTraceIdTest {

    @Test
    void generatesOneStableTraceIdPerNewRevision() {
        RevisionEntity revision = new RevisionEntity();
        revision.ensureTraceId();
        UUID traceId = revision.getTraceId();

        revision.ensureTraceId();

        assertThat(traceId).isNotNull();
        assertThat(revision.getTraceId()).isEqualTo(traceId);
    }

    @Test
    void auditAndRevisionMappingsBothGenerateTraceIds() {
        RevisionEntity revision = new RevisionEntity();
        AuditRecordEntity auditRecord = new AuditRecordEntity();

        revision.ensureTraceId();
        auditRecord.ensureTraceId();

        assertThat(revision.getTraceId()).isNotNull();
        assertThat(auditRecord.getTraceId()).isNotNull();
        assertThat(revision.getTraceId()).isNotEqualTo(auditRecord.getTraceId());
    }

    @Test
    void concurrentSubmissionsGenerateDistinctTraceIds() {
        Set<UUID> traces = ConcurrentHashMap.newKeySet();

        IntStream.range(0, 2_000).parallel().forEach(index -> {
            RevisionEntity revision = new RevisionEntity();
            revision.ensureTraceId();
            traces.add(revision.getTraceId());
        });

        assertThat(traces).hasSize(2_000);
    }
}
