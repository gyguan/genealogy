package com.genealogy.tracking.repository;

import com.genealogy.common.api.PageResponse;
import com.genealogy.tracking.dto.TrackingObjectResponse;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public class TrackingObjectQueryRepository {

    private static final String PERSON_PRIVACY = "coalesce(p.privacy_level, 'clan_only') <> 'sealed' "
            + "and (:fullClanAccess = true or (p.branch_id in (:visibleBranchIds) "
            + "and coalesce(p.privacy_level, 'clan_only') in ('public', 'clan_only', 'branch_only')))";

    private static final String SOURCE_VISIBLE_BINDING = "exists ("
            + "select 1 from source_binding sb "
            + "where sb.source_id = s.id and sb.clan_id = s.clan_id and ("
            + "(sb.target_type = 'branch' and sb.target_id in (:visibleBranchIds)) or "
            + "(sb.target_type = 'person' and exists (select 1 from person sp where sp.id = sb.target_id "
            + "and sp.clan_id = s.clan_id and sp.deleted_at is null and sp.branch_id in (:visibleBranchIds))) or "
            + "(sb.target_type = 'relationship' and exists (select 1 from relationship sr "
            + "join person srp on srp.id = sr.from_person_id "
            + "where sr.id = sb.target_id and sr.clan_id = s.clan_id and sr.deleted_at is null "
            + "and srp.deleted_at is null and srp.branch_id in (:visibleBranchIds)))"
            + "))";

    private static final String SOURCE_BRANCH_NAME = "(select min(sb_branch.branch_name) from branch sb_branch where sb_branch.clan_id = s.clan_id and ("
            + "exists (select 1 from source_binding sb1 where sb1.source_id = s.id and sb1.target_type = 'branch' and sb1.target_id = sb_branch.id) or "
            + "exists (select 1 from source_binding sb2 join person sbp on sbp.id = sb2.target_id "
            + "where sb2.source_id = s.id and sb2.target_type = 'person' and sbp.deleted_at is null and sbp.branch_id = sb_branch.id) or "
            + "exists (select 1 from source_binding sb3 join relationship sbr on sbr.id = sb3.target_id "
            + "join person sbrp on sbrp.id = sbr.from_person_id where sb3.source_id = s.id "
            + "and sb3.target_type = 'relationship' and sbr.deleted_at is null and sbrp.deleted_at is null and sbrp.branch_id = sb_branch.id)"
            + "))";

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public TrackingObjectQueryRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public PageResponse<TrackingObjectResponse> search(
            Long clanId,
            String objectType,
            String keyword,
            Long branchId,
            String status,
            LocalDateTime changedFrom,
            LocalDateTime changedTo,
            boolean fullClanAccess,
            List<Long> visibleBranchIds,
            int pageNo,
            int pageSize
    ) {
        SearchSql searchSql = switch (objectType) {
            case "person" -> personSql();
            case "relationship" -> relationshipSql();
            case "source" -> sourceSql();
            case "branch" -> branchSql();
            case "review_task" -> reviewTaskSql();
            default -> throw new IllegalArgumentException("unsupported tracking object type: " + objectType);
        };
        MapSqlParameterSource parameters = new MapSqlParameterSource()
        .addValue("clanId", clanId, Types.BIGINT)
        .addValue("keyword", keyword == null ? "" : keyword.trim().toLowerCase(), Types.VARCHAR)
        .addValue("keywordPattern", "%" + (keyword == null ? "" : keyword.trim().toLowerCase()) + "%", Types.VARCHAR)
        .addValue("branchId", branchId, Types.BIGINT)
        .addValue("hasBranchId", branchId != null, Types.BOOLEAN)
        .addValue("status", status == null ? "" : status.trim().toLowerCase(), Types.VARCHAR)
        .addValue("changedFrom", changedFrom, Types.TIMESTAMP)
        .addValue("hasChangedFrom", changedFrom != null, Types.BOOLEAN)
        .addValue("changedTo", changedTo, Types.TIMESTAMP)
        .addValue("hasChangedTo", changedTo != null, Types.BOOLEAN)
        .addValue("fullClanAccess", fullClanAccess, Types.BOOLEAN)
        .addValue("visibleBranchIds", visibleBranchIds == null || visibleBranchIds.isEmpty() ? List.of(-1L) : visibleBranchIds)
        .addValue("limit", pageSize, Types.INTEGER)
        .addValue("offset", (pageNo - 1) * pageSize, Types.INTEGER);

        List<TrackingObjectResponse> records = jdbcTemplate.query(
                searchSql.selectClause() + searchSql.fromWhereClause() + searchSql.orderByClause() + " limit :limit offset :offset",
                parameters,
                (resultSet, rowNumber) -> {
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
        );
        Long total = jdbcTemplate.queryForObject(
                "select count(*) " + searchSql.fromWhereClause(),
                parameters,
                Long.class
        );
        return PageResponse.of(records, total == null ? 0L : total, pageNo, pageSize);
    }

    private SearchSql personSql() {
        String select = "select 'person' as object_type, p.id as object_id, "
                + "coalesce(nullif(p.genealogy_name, ''), p.name) as display_name, "
                + "nullif(concat_ws(' · ', b.branch_name, "
                + "case when p.generation_no is null then null else concat('第', p.generation_no, '世') end, "
                + "case when p.genealogy_name is null or p.genealogy_name = '' or p.genealogy_name = p.name then null else concat('谱名：', p.genealogy_name) end, "
                + "case when p.person_code is null or p.person_code = '' then null else concat('人物编码：', p.person_code) end), '') as secondary_label, "
                + "b.branch_name as branch_name, "
                + "concat('人物：', coalesce(nullif(p.genealogy_name, ''), p.name), "
                + "case when p.generation_word is null or p.generation_word = '' then '' else concat('，字辈：', p.generation_word) end, "
                + "case when p.rank_in_family is null or p.rank_in_family = '' then '' else concat('，排行：', p.rank_in_family) end) as summary, "
                + "p.data_status as result_status, coalesce(p.updated_at, p.created_at) as changed_at ";
        String fromWhere = "from person p left join branch b on b.id = p.branch_id and b.clan_id = p.clan_id "
                + "where p.clan_id = :clanId and p.deleted_at is null and " + PERSON_PRIVACY + " "
                + "and (:hasBranchId = false or p.branch_id = :branchId) "
                + "and (:status = '' or lower(coalesce(p.data_status, '')) = :status) "
                + "and (:keyword = '' or lower(p.name) like :keywordPattern "
                + "or lower(coalesce(p.genealogy_name, '')) like :keywordPattern "
                + "or lower(coalesce(p.courtesy_name, '')) like :keywordPattern "
                + "or lower(coalesce(p.alias_name, '')) like :keywordPattern "
                + "or lower(coalesce(p.person_code, '')) like :keywordPattern) "
                + "and (:hasChangedFrom = false or coalesce(p.updated_at, p.created_at) >= :changedFrom) "
                + "and (:hasChangedTo = false or coalesce(p.updated_at, p.created_at) <= :changedTo) ";
        return new SearchSql(select, fromWhere, "order by changed_at desc nulls last, p.id desc");
    }

    private SearchSql relationshipSql() {
        String select = "select 'relationship' as object_type, r.id as object_id, "
                + "concat(coalesce(nullif(fp.genealogy_name, ''), fp.name), ' — ', "
                + "coalesce(nullif(r.relation_label, ''), r.relation_type), ' — ', "
                + "coalesce(nullif(tp.genealogy_name, ''), tp.name)) as display_name, "
                + "nullif(concat_ws(' · ', fb.branch_name, coalesce(nullif(r.relation_category, ''), r.relation_type)), '') as secondary_label, "
                + "fb.branch_name as branch_name, "
                + "concat('关系：', coalesce(nullif(fp.genealogy_name, ''), fp.name), ' 与 ', "
                + "coalesce(nullif(tp.genealogy_name, ''), tp.name), '，类型：', coalesce(nullif(r.relation_label, ''), r.relation_type)) as summary, "
                + "r.data_status as result_status, coalesce(r.updated_at, r.created_at) as changed_at ";
        String personPrivacy = "coalesce(%s.privacy_level, 'clan_only') <> 'sealed' and (:fullClanAccess = true or ("
                + "%s.branch_id in (:visibleBranchIds) and coalesce(%s.privacy_level, 'clan_only') in ('public', 'clan_only', 'branch_only')))";
        String fromWhere = "from relationship r "
                + "join person fp on fp.id = r.from_person_id and fp.clan_id = r.clan_id and fp.deleted_at is null "
                + "join person tp on tp.id = r.to_person_id and tp.clan_id = r.clan_id and tp.deleted_at is null "
                + "left join branch fb on fb.id = fp.branch_id and fb.clan_id = r.clan_id "
                + "where r.clan_id = :clanId and r.deleted_at is null "
                + "and " + personPrivacy.formatted("fp", "fp", "fp") + " "
                + "and " + personPrivacy.formatted("tp", "tp", "tp") + " "
                + "and (:hasBranchId = false or fp.branch_id = :branchId or tp.branch_id = :branchId) "
                + "and (:status = '' or lower(coalesce(r.data_status, '')) = :status) "
                + "and (:keyword = '' or lower(fp.name) like :keywordPattern "
                + "or lower(coalesce(fp.genealogy_name, '')) like :keywordPattern "
                + "or lower(tp.name) like :keywordPattern "
                + "or lower(coalesce(tp.genealogy_name, '')) like :keywordPattern "
                + "or lower(coalesce(r.relation_label, '')) like :keywordPattern "
                + "or lower(r.relation_type) like :keywordPattern) "
                + "and (:hasChangedFrom = false or coalesce(r.updated_at, r.created_at) >= :changedFrom) "
                + "and (:hasChangedTo = false or coalesce(r.updated_at, r.created_at) <= :changedTo) ";
        return new SearchSql(select, fromWhere, "order by changed_at desc nulls last, r.id desc");
    }

    private SearchSql sourceSql() {
        String select = "select 'source' as object_type, s.id as object_id, s.source_name as display_name, "
                + "nullif(concat_ws(' · ', s.source_type, s.provider_name, s.book_title), '') as secondary_label, "
                + SOURCE_BRANCH_NAME + " as branch_name, "
                + "concat('来源：', s.source_name, case when s.book_title is null or s.book_title = '' then '' else concat('，载体：', s.book_title) end) as summary, "
                + "s.verification_status as result_status, coalesce(s.updated_at, s.created_at) as changed_at ";
        String fromWhere = "from source s where s.clan_id = :clanId "
                + "and coalesce(s.privacy_level, 'clan_only') <> 'sealed' "
                + "and (:fullClanAccess = true or (coalesce(s.privacy_level, 'clan_only') in ('public', 'clan_only', 'branch_only') and " + SOURCE_VISIBLE_BINDING + ")) "
                + "and (:hasBranchId = false or exists (select 1 from source_binding fsb where fsb.source_id = s.id and fsb.clan_id = s.clan_id and ("
                + "(fsb.target_type = 'branch' and fsb.target_id = :branchId) or "
                + "(fsb.target_type = 'person' and exists (select 1 from person fsp where fsp.id = fsb.target_id and fsp.deleted_at is null and fsp.branch_id = :branchId)) or "
                + "(fsb.target_type = 'relationship' and exists (select 1 from relationship fsr join person fsrp on fsrp.id = fsr.from_person_id "
                + "where fsr.id = fsb.target_id and fsr.deleted_at is null and fsrp.deleted_at is null and fsrp.branch_id = :branchId))"
                + "))) "
                + "and (:status = '' or lower(coalesce(s.verification_status, '')) = :status) "
                + "and (:keyword = '' or lower(s.source_name) like :keywordPattern "
                + "or lower(coalesce(s.provider_name, '')) like :keywordPattern "
                + "or lower(coalesce(s.book_title, '')) like :keywordPattern) "
                + "and (:hasChangedFrom = false or coalesce(s.updated_at, s.created_at) >= :changedFrom) "
                + "and (:hasChangedTo = false or coalesce(s.updated_at, s.created_at) <= :changedTo) ";
        return new SearchSql(select, fromWhere, "order by changed_at desc nulls last, s.id desc");
    }

    private SearchSql branchSql() {
        String select = "select 'branch' as object_type, b.id as object_id, b.branch_name as display_name, "
                + "nullif(concat_ws(' · ', case when b.level is null then null else concat('第', b.level, '级支派') end, b.branch_path), '') as secondary_label, "
                + "b.branch_name as branch_name, concat('支派：', b.branch_name, case when b.branch_path is null or b.branch_path = '' then '' else concat('，路径：', b.branch_path) end) as summary, "
                + "b.status as result_status, coalesce(b.updated_at, b.created_at) as changed_at ";
        String fromWhere = "from branch b where b.clan_id = :clanId "
                + "and (:fullClanAccess = true or b.id in (:visibleBranchIds)) "
                + "and (:hasBranchId = false or b.id = :branchId) "
                + "and (:status = '' or lower(coalesce(b.status, '')) = :status) "
                + "and (:keyword = '' or lower(b.branch_name) like :keywordPattern or lower(coalesce(b.branch_path, '')) like :keywordPattern) "
                + "and (:hasChangedFrom = false or coalesce(b.updated_at, b.created_at) >= :changedFrom) "
                + "and (:hasChangedTo = false or coalesce(b.updated_at, b.created_at) <= :changedTo) ";
        return new SearchSql(select, fromWhere, "order by changed_at desc nulls last, b.id desc");
    }

    private SearchSql reviewTaskSql() {
        String targetName = "case rev.target_type "
                + "when 'person' then (select coalesce(nullif(rp.genealogy_name, ''), rp.name) from person rp where rp.id = rev.target_id and rp.clan_id = rt.clan_id and rp.deleted_at is null) "
                + "when 'source' then (select rs.source_name from source rs where rs.id = rev.target_id and rs.clan_id = rt.clan_id) "
                + "when 'branch' then (select rb.branch_name from branch rb where rb.id = rev.target_id and rb.clan_id = rt.clan_id) "
                + "when 'relationship' then (select concat(coalesce(nullif(rfp.genealogy_name, ''), rfp.name), ' 与 ', coalesce(nullif(rtp.genealogy_name, ''), rtp.name)) "
                + "from relationship rr join person rfp on rfp.id = rr.from_person_id join person rtp on rtp.id = rr.to_person_id "
                + "where rr.id = rev.target_id and rr.clan_id = rt.clan_id and rr.deleted_at is null) "
                + "else null end";
        String select = "select 'review_task' as object_type, rt.id as object_id, "
                + "coalesce(" + targetName + ", nullif(rev.diff_summary, ''), '审核事项') as display_name, "
                + "nullif(concat_ws(' · ', case rev.target_type when 'person' then '人物审核' when 'relationship' then '关系审核' when 'source' then '来源审核' when 'branch' then '支派审核' else '数据审核' end, rt.status), '') as secondary_label, "
                + "b.branch_name as branch_name, coalesce(nullif(rev.diff_summary, ''), concat('变更类型：', rev.change_type)) as summary, "
                + "rt.status as result_status, coalesce(rt.reviewed_at, rt.created_at) as changed_at ";
        String fromWhere = "from review_task rt join revision rev on rev.id = rt.revision_id and rev.clan_id = rt.clan_id "
                + "left join branch b on b.id = rt.branch_id and b.clan_id = rt.clan_id "
                + "where rt.clan_id = :clanId "
                + "and (:fullClanAccess = true or rt.branch_id in (:visibleBranchIds)) "
                + "and (:hasBranchId = false or rt.branch_id = :branchId) "
                + "and (:status = '' or lower(coalesce(rt.status, '')) = :status) "
                + "and (:keyword = '' or lower(coalesce(rev.diff_summary, '')) like :keywordPattern "
                + "or lower(coalesce(rt.review_comment, '')) like :keywordPattern "
                + "or lower(coalesce(rev.change_type, '')) like :keywordPattern "
                + "or lower(coalesce(rev.target_type, '')) like :keywordPattern "
                + "or exists (select 1 from person kp where rev.target_type = 'person' and kp.id = rev.target_id and kp.clan_id = rt.clan_id and kp.deleted_at is null "
                + "and (lower(kp.name) like :keywordPattern or lower(coalesce(kp.genealogy_name, '')) like :keywordPattern)) "
                + "or exists (select 1 from source ks where rev.target_type = 'source' and ks.id = rev.target_id and ks.clan_id = rt.clan_id and lower(ks.source_name) like :keywordPattern) "
                + "or exists (select 1 from branch kb where rev.target_type = 'branch' and kb.id = rev.target_id and kb.clan_id = rt.clan_id and lower(kb.branch_name) like :keywordPattern)) "
                + "and (:hasChangedFrom = false or coalesce(rt.reviewed_at, rt.created_at) >= :changedFrom) "
                + "and (:hasChangedTo = false or coalesce(rt.reviewed_at, rt.created_at) <= :changedTo) ";
        return new SearchSql(select, fromWhere, "order by changed_at desc nulls last, rt.id desc");
    }

    private record SearchSql(String selectClause, String fromWhereClause, String orderByClause) {
    }
}
