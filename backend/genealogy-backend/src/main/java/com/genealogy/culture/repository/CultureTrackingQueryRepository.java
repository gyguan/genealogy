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
public class CultureTrackingQueryRepository {

    private static final String SELECT = """
            select 'culture_item' as object_type,
                   ci.id as object_id,
                   ci.title as display_name,
                   nullif(concat_ws(' · ', ci.category, ci.historical_period, ci.location_text), '') as secondary_label,
                   b.branch_name as branch_name,
                   coalesce(nullif(ci.summary, ''), concat('文化资料：', ci.title)) as summary,
                   ci.data_status as result_status,
                   coalesce(ci.updated_at, ci.created_at) as changed_at
            """;

    private static final String FROM_WHERE = """
            from culture_item ci
            left join branch b on b.id = ci.branch_id and b.clan_id = ci.clan_id
            where ci.clan_id = :clanId
              and ci.deleted_at is null
              and (:fullClanAccess = true or ci.branch_id in (:visibleBranchIds))
              and (:sensitiveAccess = true or (
                    coalesce(ci.privacy_level, 'clan_only') in ('public', 'clan_only', 'branch_only')
                    and coalesce(ci.sensitive_level, 'normal') = 'normal'
              ))
              and (:hasTargetId = false or ci.id = :targetId)
              and (:hasBranchId = false or ci.branch_id = :branchId)
              and (:status = '' or lower(coalesce(ci.data_status, '')) = :status)
              and (:keyword = '' or lower(ci.title) like :keywordPattern
                   or lower(coalesce(ci.summary, '')) like :keywordPattern
                   or lower(coalesce(ci.historical_period, '')) like :keywordPattern
                   or lower(coalesce(ci.location_text, '')) like :keywordPattern)
              and (:hasChangedFrom = false or coalesce(ci.updated_at, ci.created_at) >= :changedFrom)
              and (:hasChangedTo = false or coalesce(ci.updated_at, ci.created_at) <= :changedTo)
            """;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public CultureTrackingQueryRepository(NamedParameterJdbcTemplate jdbcTemplate) {
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
                SELECT + FROM_WHERE + " order by changed_at desc nulls last, ci.id desc limit :limit offset :offset",
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
                SELECT + FROM_WHERE + " order by ci.id limit 1",
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
