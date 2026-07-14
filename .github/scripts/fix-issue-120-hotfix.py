from pathlib import Path

path = Path('backend/genealogy-backend/src/main/java/com/genealogy/tracking/repository/TrackingObjectQueryRepository.java')
text = path.read_text()
start = text.index('    private SearchSql reviewTaskSql() {')
end = text.index('    private record SearchSql(', start)
method = '''    private SearchSql reviewTaskSql() {
        String reviewTargetVisible = "case rev.target_type "
                + "when 'person' then exists (select 1 from person rvp "
                + "where rvp.id = rev.target_id and rvp.clan_id = rt.clan_id and rvp.deleted_at is null "
                + "and coalesce(rvp.privacy_level, 'clan_only') <> 'sealed' "
                + "and (:fullClanAccess = true or (rvp.branch_id in (:visibleBranchIds) "
                + "and coalesce(rvp.privacy_level, 'clan_only') in ('public', 'clan_only', 'branch_only')))) "
                + "when 'relationship' then exists (select 1 from relationship rvr "
                + "join person rvfp on rvfp.id = rvr.from_person_id and rvfp.clan_id = rvr.clan_id and rvfp.deleted_at is null "
                + "join person rvtp on rvtp.id = rvr.to_person_id and rvtp.clan_id = rvr.clan_id and rvtp.deleted_at is null "
                + "where rvr.id = rev.target_id and rvr.clan_id = rt.clan_id and rvr.deleted_at is null "
                + "and coalesce(rvfp.privacy_level, 'clan_only') <> 'sealed' "
                + "and coalesce(rvtp.privacy_level, 'clan_only') <> 'sealed' "
                + "and (:fullClanAccess = true or (rvfp.branch_id in (:visibleBranchIds) "
                + "and rvtp.branch_id in (:visibleBranchIds) "
                + "and coalesce(rvfp.privacy_level, 'clan_only') in ('public', 'clan_only', 'branch_only') "
                + "and coalesce(rvtp.privacy_level, 'clan_only') in ('public', 'clan_only', 'branch_only')))) "
                + "when 'source' then exists (select 1 from source rvs "
                + "where rvs.id = rev.target_id and rvs.clan_id = rt.clan_id "
                + "and coalesce(rvs.privacy_level, 'clan_only') <> 'sealed' "
                + "and (:fullClanAccess = true or (coalesce(rvs.privacy_level, 'clan_only') in ('public', 'clan_only', 'branch_only') "
                + "and exists (select 1 from source_binding rvsb "
                + "where rvsb.source_id = rvs.id and rvsb.clan_id = rvs.clan_id and ("
                + "(rvsb.target_type = 'branch' and rvsb.target_id in (:visibleBranchIds)) or "
                + "(rvsb.target_type = 'person' and exists (select 1 from person rvsp "
                + "where rvsp.id = rvsb.target_id and rvsp.clan_id = rvs.clan_id "
                + "and rvsp.deleted_at is null and rvsp.branch_id in (:visibleBranchIds))) or "
                + "(rvsb.target_type = 'relationship' and exists (select 1 from relationship rvsr "
                + "join person rvsrp on rvsrp.id = rvsr.from_person_id "
                + "where rvsr.id = rvsb.target_id and rvsr.clan_id = rvs.clan_id "
                + "and rvsr.deleted_at is null and rvsrp.clan_id = rvs.clan_id "
                + "and rvsrp.deleted_at is null and rvsrp.branch_id in (:visibleBranchIds)))"
                + "))))) "
                + "when 'branch' then exists (select 1 from branch rvb "
                + "where rvb.id = rev.target_id and rvb.clan_id = rt.clan_id "
                + "and (:fullClanAccess = true or rvb.id in (:visibleBranchIds))) "
                + "else false end";
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
                + "and (" + reviewTargetVisible + ") "
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

'''
path.write_text(text[:start] + method + text[end:])
