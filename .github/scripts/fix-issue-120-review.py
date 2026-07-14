from pathlib import Path

repo = Path(__file__).resolve().parents[2]
source_path = repo / "backend/genealogy-backend/src/main/java/com/genealogy/tracking/repository/TrackingObjectQueryRepository.java"
test_path = repo / "backend/genealogy-backend/src/test/java/com/genealogy/tracking/repository/TrackingObjectQueryRepositoryTest.java"

source = source_path.read_text()
old_branch = '''    private static final String SOURCE_BRANCH_NAME = "(select min(sb_branch.branch_name) from branch sb_branch where sb_branch.clan_id = s.clan_id and ("
            + "exists (select 1 from source_binding sb1 where sb1.source_id = s.id and sb1.target_type = 'branch' and sb1.target_id = sb_branch.id) or "
            + "exists (select 1 from source_binding sb2 join person sbp on sbp.id = sb2.target_id "
            + "where sb2.source_id = s.id and sb2.target_type = 'person' and sbp.deleted_at is null and sbp.branch_id = sb_branch.id) or "
            + "exists (select 1 from source_binding sb3 join relationship sbr on sbr.id = sb3.target_id "
            + "join person sbrp on sbrp.id = sbr.from_person_id where sb3.source_id = s.id "
            + "and sb3.target_type = 'relationship' and sbr.deleted_at is null and sbrp.deleted_at is null and sbrp.branch_id = sb_branch.id)"
            + "))";'''
new_branch = '''    private static final String SOURCE_BRANCH_NAME = "(select min(sb_branch.branch_name) from branch sb_branch where sb_branch.clan_id = s.clan_id "
            + "and (:fullClanAccess = true or sb_branch.id in (:visibleBranchIds)) "
            + "and (:hasBranchId = false or sb_branch.id = :branchId) and ("
            + "exists (select 1 from source_binding sb1 where sb1.source_id = s.id and sb1.clan_id = s.clan_id and sb1.target_type = 'branch' and sb1.target_id = sb_branch.id) or "
            + "exists (select 1 from source_binding sb2 join person sbp on sbp.id = sb2.target_id "
            + "where sb2.source_id = s.id and sb2.clan_id = s.clan_id and sb2.target_type = 'person' and sbp.clan_id = s.clan_id "
            + "and sbp.deleted_at is null and sbp.branch_id = sb_branch.id) or "
            + "exists (select 1 from source_binding sb3 join relationship sbr on sbr.id = sb3.target_id "
            + "join person sbrp on sbrp.id = sbr.from_person_id where sb3.source_id = s.id and sb3.clan_id = s.clan_id "
            + "and sb3.target_type = 'relationship' and sbr.clan_id = s.clan_id and sbr.deleted_at is null "
            + "and sbrp.clan_id = s.clan_id and sbrp.deleted_at is null and sbrp.branch_id = sb_branch.id)"
            + "))";'''
if old_branch not in source:
    raise SystemExit("SOURCE_BRANCH_NAME block not found")
source = source.replace(old_branch, new_branch)

needle = '''    private SearchSql reviewTaskSql() {
        String targetName = '''
insert = '''    private SearchSql reviewTaskSql() {
        String reviewTargetVisible = "(" 
                + "(rev.target_type = 'person' and exists (select 1 from person rvp where rvp.id = rev.target_id and rvp.clan_id = rt.clan_id "
                + "and rvp.deleted_at is null and coalesce(rvp.privacy_level, 'clan_only') <> 'sealed' "
                + "and (:fullClanAccess = true or (rvp.branch_id in (:visibleBranchIds) and coalesce(rvp.privacy_level, 'clan_only') in ('public', 'clan_only', 'branch_only')))) or "
                + "(rev.target_type = 'relationship' and exists (select 1 from relationship rvr "
                + "join person rvfp on rvfp.id = rvr.from_person_id and rvfp.clan_id = rvr.clan_id and rvfp.deleted_at is null "
                + "join person rvtp on rvtp.id = rvr.to_person_id and rvtp.clan_id = rvr.clan_id and rvtp.deleted_at is null "
                + "where rvr.id = rev.target_id and rvr.clan_id = rt.clan_id and rvr.deleted_at is null "
                + "and coalesce(rvfp.privacy_level, 'clan_only') <> 'sealed' and coalesce(rvtp.privacy_level, 'clan_only') <> 'sealed' "
                + "and (:fullClanAccess = true or ((rvfp.branch_id in (:visibleBranchIds) and coalesce(rvfp.privacy_level, 'clan_only') in ('public', 'clan_only', 'branch_only')) "
                + "and (rvtp.branch_id in (:visibleBranchIds) and coalesce(rvtp.privacy_level, 'clan_only') in ('public', 'clan_only', 'branch_only'))))) or "
                + "(rev.target_type = 'source' and exists (select 1 from source rvs where rvs.id = rev.target_id and rvs.clan_id = rt.clan_id "
                + "and coalesce(rvs.privacy_level, 'clan_only') <> 'sealed' and (:fullClanAccess = true or ("
                + "coalesce(rvs.privacy_level, 'clan_only') in ('public', 'clan_only', 'branch_only') and exists ("
                + "select 1 from source_binding rvsb where rvsb.source_id = rvs.id and rvsb.clan_id = rvs.clan_id and ("
                + "(rvsb.target_type = 'branch' and rvsb.target_id in (:visibleBranchIds)) or "
                + "(rvsb.target_type = 'person' and exists (select 1 from person rvsp where rvsp.id = rvsb.target_id and rvsp.clan_id = rvs.clan_id and rvsp.deleted_at is null and rvsp.branch_id in (:visibleBranchIds))) or "
                + "(rvsb.target_type = 'relationship' and exists (select 1 from relationship rvsr join person rvsrp on rvsrp.id = rvsr.from_person_id "
                + "where rvsr.id = rvsb.target_id and rvsr.clan_id = rvs.clan_id and rvsr.deleted_at is null and rvsrp.deleted_at is null and rvsrp.branch_id in (:visibleBranchIds)))"
                + "))))) or "
                + "(rev.target_type = 'branch' and exists (select 1 from branch rvb where rvb.id = rev.target_id and rvb.clan_id = rt.clan_id "
                + "and (:fullClanAccess = true or rvb.id in (:visibleBranchIds))))" 
                + ")";
        String targetName = '''
if needle not in source:
    raise SystemExit("reviewTaskSql insertion point not found")
source = source.replace(needle, insert)

old_where = '''                + "where rt.clan_id = :clanId "
                + "and (:fullClanAccess = true or rt.branch_id in (:visibleBranchIds)) "'''
new_where = '''                + "where rt.clan_id = :clanId "
                + "and " + reviewTargetVisible + " "
                + "and (:fullClanAccess = true or rt.branch_id in (:visibleBranchIds)) "'''
if old_where not in source:
    raise SystemExit("review task WHERE insertion point not found")
source = source.replace(old_where, new_where)
source_path.write_text(source)

test = test_path.read_text()
insert_before = "\n}\n"
new_tests = r'''

    @Test
    @SuppressWarnings("unchecked")
    void sourceBranchLabelUsesOnlyVisibleAndRequestedBranches() {
        NamedParameterJdbcTemplate jdbcTemplate = mock(NamedParameterJdbcTemplate.class);
        when(jdbcTemplate.query(anyString(), any(MapSqlParameterSource.class), any(RowMapper.class)))
                .thenReturn(List.<TrackingObjectResponse>of());
        when(jdbcTemplate.queryForObject(anyString(), any(MapSqlParameterSource.class), eq(Long.class)))
                .thenReturn(0L);
        TrackingObjectQueryRepository repository = new TrackingObjectQueryRepository(jdbcTemplate);

        repository.search(1L, "source", null, 10L, null, null, null, false, List.of(10L), 1, 20);

        ArgumentCaptor<String> selectSql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(selectSql.capture(), any(MapSqlParameterSource.class), any(RowMapper.class));
        assertThat(selectSql.getValue().toLowerCase())
                .contains("sb_branch.id in (:visiblebranchids)")
                .contains("sb_branch.id = :branchid")
                .contains("sb1.clan_id = s.clan_id")
                .contains("sb2.clan_id = s.clan_id")
                .contains("sb3.clan_id = s.clan_id");
    }

    @Test
    @SuppressWarnings("unchecked")
    void reviewTaskSearchRequiresResolvedTargetVisibilityBeforeRenderingNames() {
        NamedParameterJdbcTemplate jdbcTemplate = mock(NamedParameterJdbcTemplate.class);
        when(jdbcTemplate.query(anyString(), any(MapSqlParameterSource.class), any(RowMapper.class)))
                .thenReturn(List.<TrackingObjectResponse>of());
        when(jdbcTemplate.queryForObject(anyString(), any(MapSqlParameterSource.class), eq(Long.class)))
                .thenReturn(0L);
        TrackingObjectQueryRepository repository = new TrackingObjectQueryRepository(jdbcTemplate);

        repository.search(1L, "review_task", null, null, null, null, null, false, List.of(10L), 1, 20);

        ArgumentCaptor<String> selectSql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> countSql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(selectSql.capture(), any(MapSqlParameterSource.class), any(RowMapper.class));
        verify(jdbcTemplate).queryForObject(countSql.capture(), any(MapSqlParameterSource.class), eq(Long.class));

        assertThat(selectSql.getValue().toLowerCase())
                .contains("rev.target_type = 'person'")
                .contains("rvp.privacy_level")
                .contains("rev.target_type = 'relationship'")
                .contains("rvfp.privacy_level")
                .contains("rvtp.privacy_level")
                .contains("rev.target_type = 'source'")
                .contains("rvs.privacy_level")
                .contains("rev.target_type = 'branch'")
                .contains("rvb.id in (:visiblebranchids)");
        assertThat(countSql.getValue().toLowerCase())
                .contains("rvp.privacy_level")
                .contains("rvs.privacy_level")
                .contains("rvb.id in (:visiblebranchids)");
    }
'''
if not test.endswith(insert_before):
    raise SystemExit("test class ending not found")
test = test[:-len(insert_before)] + new_tests + insert_before
test_path.write_text(test)
