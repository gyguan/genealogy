package com.genealogy.tracking.repository;

import com.genealogy.tracking.dto.TrackingObjectResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

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
}
