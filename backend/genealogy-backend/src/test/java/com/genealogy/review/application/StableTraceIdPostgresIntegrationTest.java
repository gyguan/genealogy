package com.genealogy.review.application;

import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "RUN_POSTGRES_INTEGRATION_TESTS", matches = "true")
class StableTraceIdPostgresIntegrationTest {

    @Autowired private ClanRepository clanRepository;
    @Autowired private RevisionRepository revisionRepository;
    @Autowired private ReviewTaskRepository reviewTaskRepository;
    @Autowired private OperationLogRepository operationLogRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    void appliesTraceColumnsAndIndexesAndPersistsOneLifecycle() {
        assertColumn("revision", "trace_id", "uuid", "YES");
        assertColumn("review_task", "trace_id", "uuid", "YES");
        assertColumn("operation_log", "trace_id", "uuid", "YES");
        assertColumn("operation_log", "revision_id", "bigint", "YES");
        assertColumn("operation_log", "review_task_id", "bigint", "YES");
        assertColumn("operation_log", "business_target_type", "character varying", "YES");
        assertColumn("operation_log", "business_target_id", "bigint", "YES");
        assertColumn("operation_log", "event_result", "character varying", "YES");

        Set<String> indexes = Set.copyOf(jdbcTemplate.queryForList(
                "select indexname from pg_indexes where schemaname = current_schema() " +
                        "and tablename in ('revision', 'review_task', 'operation_log')",
                String.class
        ));
        assertThat(indexes).contains(
                "uq_revision_trace_id",
                "idx_review_task_trace_created",
                "idx_operation_log_trace_created",
                "idx_operation_log_revision_created",
                "idx_operation_log_review_task_created",
                "idx_operation_log_business_target_created"
        );

        ClanEntity clan = new ClanEntity();
        clan.setClanCode("trace-it-" + System.nanoTime());
        clan.setClanName("稳定追踪集成测试宗族");
        clan.setSurname("张");
        clan.setStatus("active");
        clan.setCreatedAt(LocalDateTime.now());
        clan.setUpdatedAt(LocalDateTime.now());
        clan = clanRepository.saveAndFlush(clan);

        RevisionEntity revision = new RevisionEntity();
        revision.setClanId(clan.getId());
        revision.setTargetType("person");
        revision.setTargetId(9001L);
        revision.setChangeType("update");
        revision.setSubmitTime(LocalDateTime.now());
        revision.setStatus("pending");
        revision = revisionRepository.saveAndFlush(revision);
        UUID traceId = revision.getTraceId();
        assertThat(traceId).isNotNull();

        ReviewTaskEntity task = new ReviewTaskEntity();
        task.setClanId(clan.getId());
        task.setRevisionId(revision.getId());
        task.setTraceId(traceId);
        task.setReviewLevel(1);
        task.setReviewerRole("reviewer");
        task.setStatus("pending");
        task.setCreatedAt(LocalDateTime.now());
        task = reviewTaskRepository.saveAndFlush(task);

        OperationLogEntity log = new OperationLogEntity();
        log.setClanId(clan.getId());
        log.setActionType("review_submit");
        log.setTargetType("person");
        log.setTargetId(9001L);
        log.setTraceId(traceId);
        log.setRevisionId(revision.getId());
        log.setReviewTaskId(task.getId());
        log.setBusinessTargetType("person");
        log.setBusinessTargetId(9001L);
        log.setEventResult("submitted");
        log.setCreatedAt(LocalDateTime.now());
        log = operationLogRepository.saveAndFlush(log);

        assertThat(reviewTaskRepository.findByTraceIdOrderByCreatedAtAscIdAsc(traceId))
                .extracting(ReviewTaskEntity::getId)
                .containsExactly(task.getId());
        assertThat(revisionRepository.findByTraceId(traceId)).contains(revision);
        assertThat(log.getTraceId()).isEqualTo(traceId);
        assertThat(log.getRevisionId()).isEqualTo(revision.getId());
        assertThat(log.getReviewTaskId()).isEqualTo(task.getId());
    }

    private void assertColumn(String tableName, String columnName, String dataType, String nullable) {
        var row = jdbcTemplate.queryForMap(
                "select data_type, is_nullable, column_default from information_schema.columns " +
                        "where table_schema = current_schema() and table_name = ? and column_name = ?",
                tableName,
                columnName
        );
        assertThat(row.get("data_type")).isEqualTo(dataType);
        assertThat(row.get("is_nullable")).isEqualTo(nullable);
        if ("trace_id".equals(columnName) && "revision".equals(tableName)) {
            assertThat(row.get("column_default")).isNull();
        }
    }
}
