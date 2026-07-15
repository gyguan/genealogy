package com.genealogy.culture.repository;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Repository
public class CultureQualityQueryRepository {

    private static final String ACTIVE_SOURCE = """
            exists (
                select 1
                from source_binding sb
                join source s on s.id = sb.source_id and s.clan_id = sb.clan_id
                where sb.clan_id = t.clan_id
                  and sb.target_type = :targetType
                  and sb.target_id = t.id
                  and lower(coalesce(sb.binding_status, '')) <> 'archived'
                  and lower(coalesce(s.verification_status, '')) = 'official'
            )
            """;

    private static final String STRONG_SOURCE = """
            exists (
                select 1
                from source_binding sb
                join source s on s.id = sb.source_id and s.clan_id = sb.clan_id
                where sb.clan_id = t.clan_id
                  and sb.target_type = :targetType
                  and sb.target_id = t.id
                  and lower(coalesce(sb.binding_status, '')) <> 'archived'
                  and lower(coalesce(s.verification_status, '')) = 'official'
                  and lower(coalesce(sb.confidence_level, s.confidence_level, 'unknown')) = 'high'
            )
            """;

    private static final String PENDING_REVIEW = """
            exists (
                select 1
                from revision r
                where r.clan_id = t.clan_id
                  and lower(r.target_type) = :targetType
                  and r.target_id = t.id
                  and lower(coalesce(r.status, '')) = 'pending'
            )
            """;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public CultureQualityQueryRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public QualityMetrics metrics(TargetConfig config, QualityScope scope) {
        String complete = config.completenessExpression().replace("${ACTIVE_SOURCE}", ACTIVE_SOURCE);
        String sql = """
                select
                    count(*) filter (where lower(t.data_status) = 'official') as official_count,
                    count(*) filter (where %s) as pending_review_count,
                    count(*) filter (where lower(t.data_status) = 'official' and %s) as source_covered_count,
                    count(*) filter (where lower(t.data_status) = 'official' and %s) as strong_source_count,
                    count(*) filter (where lower(t.data_status) = 'official' and (%s)) as complete_count,
                    count(*) filter (where lower(t.data_status) = 'official'
                        and lower(coalesce(t.confidence_level, 'unknown')) in ('low', 'unknown')) as low_confidence_count,
                    count(*) filter (where lower(t.data_status) = 'official'
                        and coalesce(t.updated_at, t.created_at) < :staleBefore) as stale_count
                from %s t
                where %s
                """.formatted(PENDING_REVIEW, ACTIVE_SOURCE, STRONG_SOURCE, complete, config.tableName(), visibleWhere());
        return jdbcTemplate.queryForObject(sql, parameters(config, scope), (resultSet, rowNumber) -> new QualityMetrics(
                resultSet.getLong("official_count"),
                resultSet.getLong("pending_review_count"),
                resultSet.getLong("source_covered_count"),
                resultSet.getLong("strong_source_count"),
                resultSet.getLong("complete_count"),
                resultSet.getLong("low_confidence_count"),
                resultSet.getLong("stale_count")
        ));
    }

    public List<QualityIssue> issues(TargetConfig config, QualityScope scope, int limit) {
        String complete = config.completenessExpression().replace("${ACTIVE_SOURCE}", ACTIVE_SOURCE);
        String sql = """
                select t.id as target_id,
                       %s as display_name,
                       t.branch_id,
                       b.branch_name,
                       coalesce(t.updated_at, t.created_at) as updated_at,
                       (%s) as pending_review,
                       not (%s) as no_source,
                       not (%s) as incomplete,
                       lower(coalesce(t.confidence_level, 'unknown')) in ('low', 'unknown') as low_confidence,
                       coalesce(t.updated_at, t.created_at) < :staleBefore as stale
                from %s t
                left join branch b on b.id = t.branch_id and b.clan_id = t.clan_id
                where %s
                  and lower(coalesce(t.data_status, '')) <> 'archived'
                  and (
                        %s
                        or (lower(t.data_status) = 'official' and (
                            not (%s)
                            or not (%s)
                            or lower(coalesce(t.confidence_level, 'unknown')) in ('low', 'unknown')
                            or coalesce(t.updated_at, t.created_at) < :staleBefore
                        ))
                  )
                order by pending_review desc, stale desc, updated_at asc nulls first, t.id
                limit :limit
                """.formatted(
                config.displayExpression(), PENDING_REVIEW, ACTIVE_SOURCE, complete,
                config.tableName(), visibleWhere(), PENDING_REVIEW, ACTIVE_SOURCE, complete
        );
        MapSqlParameterSource parameters = parameters(config, scope).addValue("limit", Math.max(1, Math.min(limit, 30)), Types.INTEGER);
        return jdbcTemplate.query(sql, parameters, (resultSet, rowNumber) -> {
            List<String> codes = new ArrayList<>();
            if (resultSet.getBoolean("pending_review")) codes.add("PENDING_REVIEW");
            if (resultSet.getBoolean("no_source")) codes.add("NO_SOURCE");
            if (resultSet.getBoolean("incomplete")) codes.add("INCOMPLETE");
            if (resultSet.getBoolean("low_confidence")) codes.add("LOW_CONFIDENCE");
            if (resultSet.getBoolean("stale")) codes.add("STALE");
            Timestamp updatedAt = resultSet.getTimestamp("updated_at");
            return new QualityIssue(
                    config.targetType(),
                    resultSet.getLong("target_id"),
                    resultSet.getString("display_name"),
                    resultSet.getObject("branch_id", Long.class),
                    resultSet.getString("branch_name"),
                    List.copyOf(codes),
                    updatedAt == null ? null : updatedAt.toLocalDateTime()
            );
        });
    }

    private String visibleWhere() {
        return """
                t.clan_id = :clanId
                  and t.deleted_at is null
                  and (:fullClanAccess = true or t.branch_id is null or t.branch_id in (:visibleBranchIds))
                  and (
                        :sensitiveAccess = true
                        or (
                            lower(coalesce(t.privacy_level, 'clan_only')) in ('public', 'clan_only', 'branch_only')
                            and lower(coalesce(t.sensitive_level, 'normal')) = 'normal'
                        )
                        or t.created_by = :actorId
                  )
                """;
    }

    private MapSqlParameterSource parameters(TargetConfig config, QualityScope scope) {
        return new MapSqlParameterSource()
                .addValue("clanId", scope.clanId(), Types.BIGINT)
                .addValue("actorId", scope.actorId(), Types.BIGINT)
                .addValue("targetType", config.targetType(), Types.VARCHAR)
                .addValue("fullClanAccess", scope.fullClanAccess(), Types.BOOLEAN)
                .addValue("visibleBranchIds", scope.visibleBranchIds() == null || scope.visibleBranchIds().isEmpty()
                        ? List.of(-1L) : scope.visibleBranchIds())
                .addValue("sensitiveAccess", scope.sensitiveAccess(), Types.BOOLEAN)
                .addValue("staleBefore", scope.staleBefore(), Types.TIMESTAMP);
    }

    public enum TargetConfig {
        CULTURE_ITEM(
                "culture_item",
                "文化资料",
                "culture_item",
                "coalesce(nullif(btrim(t.title), ''), '未命名文化资料')",
                """
                length(btrim(coalesce(t.title, ''))) > 0
                and length(btrim(coalesce(t.category, ''))) > 0
                and (length(btrim(coalesce(t.summary, ''))) > 0 or length(btrim(coalesce(t.content, ''))) > 0)
                and ${ACTIVE_SOURCE}
                """
        ),
        MIGRATION_EVENT(
                "migration_event",
                "迁徙事件",
                "migration_event",
                "concat(coalesce(nullif(btrim(t.from_location), ''), '待维护迁出地'), ' → ', coalesce(nullif(btrim(t.to_location), ''), '待维护迁入地'))",
                """
                t.branch_id is not null
                and t.sequence_no > 0
                and length(btrim(coalesce(t.from_location, ''))) > 0
                and length(btrim(coalesce(t.to_location, ''))) > 0
                and length(btrim(coalesce(t.migration_time_text, ''))) > 0
                and ${ACTIVE_SOURCE}
                """
        ),
        CULTURE_SITE(
                "culture_site",
                "文化场所",
                "culture_site",
                "coalesce(nullif(btrim(t.site_name), ''), '未命名文化场所')",
                """
                length(btrim(coalesce(t.site_name, ''))) > 0
                and length(btrim(coalesce(t.site_type, ''))) > 0
                and (length(btrim(coalesce(t.summary, ''))) > 0 or length(btrim(coalesce(t.description, ''))) > 0)
                and length(btrim(coalesce(t.privacy_level, ''))) > 0
                and ${ACTIVE_SOURCE}
                """
        );

        private final String targetType;
        private final String displayName;
        private final String tableName;
        private final String displayExpression;
        private final String completenessExpression;

        TargetConfig(String targetType, String displayName, String tableName, String displayExpression, String completenessExpression) {
            this.targetType = targetType;
            this.displayName = displayName;
            this.tableName = tableName;
            this.displayExpression = displayExpression;
            this.completenessExpression = completenessExpression;
        }

        public String targetType() { return targetType; }
        public String displayName() { return displayName; }
        public String tableName() { return tableName; }
        public String displayExpression() { return displayExpression; }
        public String completenessExpression() { return completenessExpression; }

        public static TargetConfig require(String targetType) {
            for (TargetConfig value : values()) {
                if (value.targetType.equals(targetType)) return value;
            }
            throw new IllegalArgumentException("unsupported culture target type: " + targetType);
        }
    }

    public record QualityScope(
            Long clanId,
            Long actorId,
            boolean fullClanAccess,
            List<Long> visibleBranchIds,
            boolean sensitiveAccess,
            LocalDateTime staleBefore
    ) {
    }

    public record QualityMetrics(
            long officialCount,
            long pendingReviewCount,
            long sourceCoveredCount,
            long strongSourceCount,
            long completeCount,
            long lowConfidenceCount,
            long staleCount
    ) {
    }

    public record QualityIssue(
            String targetType,
            Long targetId,
            String displayName,
            Long branchId,
            String branchName,
            List<String> issueCodes,
            LocalDateTime updatedAt
    ) {
    }
}
