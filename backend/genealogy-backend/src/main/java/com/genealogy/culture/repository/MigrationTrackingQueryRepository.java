package com.genealogy.culture.repository;

import com.genealogy.common.api.PageResponse;
import com.genealogy.tracking.dto.TrackingObjectResponse;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class MigrationTrackingQueryRepository {

    private static final String SELECT = """
            select 'migration_event' as object_type,
                   me.id as object_id,
                   concat(me.from_location, ' → ', me.to_location) as display_name,
                   nullif(concat_ws(' · ', me.migration_time_text, p.name), '') as secondary_label,
                   b.branch_name as branch_name,
                   coalesce(nullif(me.reason, ''), concat('迁徙顺序 ', me.sequence_no)) as summary,
                   me.data_status as result_status,
                   coalesce(me.updated_at, me.created_at) as changed_at
            """;

    private static final String FROM_WHERE = """
            from migration_event me
            join branch b on b.id = me.branch_id and b.clan_id = me.clan_id
            left join person p on p.id = me.founder_person_id and p.clan_id = me.clan_id and p.deleted_at is null
            where me.clan_id = :clanId
              and me.deleted_at is null
              and (:fullClanAccess = true or me.branch_id in (:visibleBranchIds))
              and (:sensitiveAccess = true or (
                    coalesce(me.privacy_level, 'clan_only') in ('public', 'clan_only', 'branch_only')
                    and coalesce(me.sensitive_level, 'normal') = 'normal'
              ))
              and (:hasTargetId = false or me.id = :targetId)
              and (:hasBranchId = false or me.branch_id = :branchId)
              and (:status = '' or lower(coalesce(me.data_status, '')) = :status)
              and (:keyword = '' or lower(coalesce(me.from_location, '')) like :keywordPattern
                   or lower(coalesce(me.to_location, '')) like :keywordPattern
                   or lower(coalesce(me.migration_time_text, '')) like :keywordPattern
                   or lower(coalesce(me.reason, '')) like :keywordPattern
                   or lower(coalesce(p.name, '')) like :keywordPattern)
              and (:hasChangedFrom = false or coalesce(me.updated_at, me.created_at) >= :changedFrom)
              and (:hasChangedTo = false or coalesce(me.updated_at, me.created_at) <= :changedTo)
            """;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public MigrationTrackingQueryRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public PageResponse<TrackingObjectResponse> search(
            Long clanId,
            String keyword,
            Long branchId,
            String status,
            LocalDateTime changedFrom,
            LocalDateTime changedTo,
            boolean fullClanAccess,
            List<Long> visibleBranchIds,
            boolean sensitiveAccess,
            int pageNo,
            int pageSize
    ) {
        MapSqlParameterSource parameters = parameters(
                clanId, keyword, branchId, status, changedFrom, changedTo,
                fullClanAccess, visibleBranchIds, sensitiveAccess, null
        ).addValue("limit", pageSize, Types.INTEGER)
                .addValue("offset", (pageNo - 1) * pageSize, Types.INTEGER);
        List<TrackingObjectResponse> records = jdbcTemplate.query(
                SELECT + FROM_WHERE + " order by changed_at desc nulls last, me.id desc limit :limit offset :offset",
                parameters,
                (resultSet, rowNumber) -> map(resultSet)
        );
        Long total = jdbcTemplate.queryForObject("select count(*) " + FROM_WHERE, parameters, Long.class);
        return PageResponse.of(records, total == null ? 0L : total, pageNo, pageSize);
    }

    public Optional<TrackingObjectResponse> findVisibleById(
            Long clanId,
            Long targetId,
            boolean fullClanAccess,
            List<Long> visibleBranchIds,
            boolean sensitiveAccess
    ) {
        List<TrackingObjectResponse> values = jdbcTemplate.query(
                SELECT + FROM_WHERE + " order by me.id limit 1",
                parameters(clanId, null, null, null, null, null,
                        fullClanAccess, visibleBranchIds, sensitiveAccess, targetId),
                (resultSet, rowNumber) -> map(resultSet)
        );
        return values.stream().findFirst();
    }

    private MapSqlParameterSource parameters(
            Long clanId,
            String keyword,
            Long branchId,
            String status,
            LocalDateTime changedFrom,
            LocalDateTime changedTo,
            boolean fullClanAccess,
            List<Long> visibleBranchIds,
            boolean sensitiveAccess,
            Long targetId
    ) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase();
        return new MapSqlParameterSource()
                .addValue("clanId", clanId, Types.BIGINT)
                .addValue("keyword", normalizedKeyword, Types.VARCHAR)
                .addValue("keywordPattern", "%" + normalizedKeyword + "%", Types.VARCHAR)
                .addValue("branchId", branchId, Types.BIGINT)
                .addValue("hasBranchId", branchId != null, Types.BOOLEAN)
                .addValue("status", status == null ? "" : status.trim().toLowerCase(), Types.VARCHAR)
                .addValue("changedFrom", changedFrom, Types.TIMESTAMP)
                .addValue("hasChangedFrom", changedFrom != null, Types.BOOLEAN)
                .addValue("changedTo", changedTo, Types.TIMESTAMP)
                .addValue("hasChangedTo", changedTo != null, Types.BOOLEAN)
                .addValue("fullClanAccess", fullClanAccess, Types.BOOLEAN)
                .addValue("visibleBranchIds", visibleBranchIds == null || visibleBranchIds.isEmpty() ? List.of(-1L) : visibleBranchIds)
                .addValue("sensitiveAccess", sensitiveAccess, Types.BOOLEAN)
                .addValue("targetId", targetId, Types.BIGINT)
                .addValue("hasTargetId", targetId != null, Types.BOOLEAN);
    }

    private TrackingObjectResponse map(java.sql.ResultSet resultSet) throws java.sql.SQLException {
        Timestamp changedAt = resultSet.getTimestamp("changed_at");
        return new TrackingObjectResponse(
                resultSet.getString("object_type"),
                resultSet.getLong("object_id"),
                resultSet.getString("display_name"),
                resultSet.getString("secondary_label"),
                resultSet.getString("branch_name"),
                resultSet.getString("summary"),
                resultSet.getString("result_status"),
                changedAt == null ? null : changedAt.toLocalDateTime()
        );
    }
}
