package com.genealogy.tracking.repository;

import com.genealogy.tracking.dto.TrackingObjectResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.util.Collection;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TrackingObjectQueryRepositoryTest {

    @Test
    @SuppressWarnings("unchecked")
    void appliesClanScopePrivacyAndBranchFiltersBeforeLimitAndUsesSameWhereForCount() {
        NamedParameterJdbcTemplate jdbcTemplate = mock(NamedParameterJdbcTemplate.class);
        when(jdbcTemplate.query(
                anyString(),
                any(MapSqlParameterSource.class),
                any(RowMapper.class)
        )).thenReturn(List.<TrackingObjectResponse>of());
        when(jdbcTemplate.queryForObject(
                anyString(),
                any(MapSqlParameterSource.class),
                eq(Long.class)
        )).thenReturn(0L);
        TrackingObjectQueryRepository repository = new TrackingObjectQueryRepository(jdbcTemplate);

        repository.search(
                1L,
                "person",
                "张三",
                10L,
                "official",
                null,
                null,
                false,
                List.of(10L, 11L),
                2,
                20
        );

        ArgumentCaptor<String> selectSql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> selectParameters = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbcTemplate).query(
                selectSql.capture(),
                selectParameters.capture(),
                any(RowMapper.class)
        );
        ArgumentCaptor<String> countSql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(
                countSql.capture(),
                any(MapSqlParameterSource.class),
                eq(Long.class)
        );

        String select = selectSql.getValue().toLowerCase();
        String count = countSql.getValue().toLowerCase();
        assertThat(select)
                .contains("p.clan_id = :clanid")
                .contains("p.branch_id in (:visiblebranchids)")
                .contains("privacy_level")
                .contains("limit :limit offset :offset");
        assertThat(select.indexOf("p.branch_id in (:visiblebranchids)"))
                .isLessThan(select.indexOf("limit :limit"));
        assertThat(count)
                .contains("p.clan_id = :clanid")
                .contains("p.branch_id in (:visiblebranchids)")
                .contains("privacy_level")
                .doesNotContain("limit :limit")
                .doesNotContain("offset :offset");
        assertThat(selectParameters.getValue().getValue("visibleBranchIds"))
                .isEqualTo(List.of(10L, 11L));
        assertThat(selectParameters.getValue().getValue("offset")).isEqualTo(20);
    }

    @Test
    @SuppressWarnings("unchecked")
    void exactTraceLookupFiltersIdsAfterApplyingTheSameVisibilityBoundary() {
        NamedParameterJdbcTemplate jdbcTemplate = mock(NamedParameterJdbcTemplate.class);
        when(jdbcTemplate.query(anyString(), any(MapSqlParameterSource.class), any(RowMapper.class)))
                .thenReturn(List.<TrackingObjectResponse>of());
        TrackingObjectQueryRepository repository = new TrackingObjectQueryRepository(jdbcTemplate);

        repository.findVisibleByIds(1L, "person", List.of(100L, 101L), false, List.of(10L));

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> parameters = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbcTemplate).query(sql.capture(), parameters.capture(), any(RowMapper.class));

        String normalized = sql.getValue().toLowerCase();
        assertThat(normalized)
                .startsWith("select * from (")
                .contains("p.clan_id = :clanid")
                .contains("p.deleted_at is null")
                .contains("p.branch_id in (:visiblebranchids)")
                .contains("privacy_level")
                .contains(") visible_object where object_id in (:targetids)")
                .doesNotContain("limit :limit")
                .doesNotContain("offset :offset");
        assertThat((Collection<Long>) parameters.getValue().getValue("targetIds")).containsExactly(100L, 101L);
        assertThat(parameters.getValue().getValue("visibleBranchIds")).isEqualTo(List.of(10L));
    }

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
                .contains("case rev.target_type")
                .contains("when 'person' then exists")
                .contains("rvp.privacy_level")
                .contains("when 'relationship' then exists")
                .contains("rvfp.privacy_level")
                .contains("rvtp.privacy_level")
                .contains("when 'source' then exists")
                .contains("rvs.privacy_level")
                .contains("when 'branch' then exists")
                .contains("rvb.id in (:visiblebranchids)")
                .contains("else false end");
        assertThat(countSql.getValue().toLowerCase())
                .contains("case rev.target_type")
                .contains("rvp.privacy_level")
                .contains("rvs.privacy_level")
                .contains("rvb.id in (:visiblebranchids)");
    }
}
