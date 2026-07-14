package com.genealogy.tracking.repository;

import com.genealogy.common.api.PageResponse;
import com.genealogy.tracking.dto.TrackingObjectResponse;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TrackingObjectQueryRepositoryPostgresTest {

    private TrackingObjectQueryRepository repository;
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        String url = System.getenv("TEST_POSTGRES_URL");
        Assumptions.assumeTrue(url != null && !url.isBlank(), "PostgreSQL smoke environment is not configured");
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                url,
                System.getenv().getOrDefault("TEST_POSTGRES_USERNAME", "genealogy"),
                System.getenv().getOrDefault("TEST_POSTGRES_PASSWORD", "genealogy")
        );
        jdbcTemplate = new JdbcTemplate(dataSource);
        repository = new TrackingObjectQueryRepository(new NamedParameterJdbcTemplate(dataSource));
        jdbcTemplate.execute("drop table if exists person");
        jdbcTemplate.execute("drop table if exists branch");
        jdbcTemplate.execute("""
                create table branch (
                    id bigint primary key,
                    clan_id bigint not null,
                    branch_name varchar(100),
                    branch_path varchar(500),
                    level integer,
                    status varchar(50),
                    created_at timestamp,
                    updated_at timestamp
                )
                """);
        jdbcTemplate.execute("""
                create table person (
                    id bigint primary key,
                    clan_id bigint not null,
                    name varchar(100) not null,
                    genealogy_name varchar(100),
                    courtesy_name varchar(100),
                    alias_name varchar(100),
                    person_code varchar(100),
                    branch_id bigint,
                    generation_no integer,
                    generation_word varchar(100),
                    rank_in_family varchar(100),
                    privacy_level varchar(50),
                    data_status varchar(50),
                    created_at timestamp,
                    updated_at timestamp,
                    deleted_at timestamp
                )
                """);
        jdbcTemplate.update("insert into branch(id, clan_id, branch_name, status, created_at) values (10, 1, '长房', 'active', now())");
        jdbcTemplate.update("insert into branch(id, clan_id, branch_name, status, created_at) values (11, 1, '二房', 'active', now())");
        jdbcTemplate.update("""
                insert into person(id, clan_id, name, genealogy_name, person_code, branch_id, generation_no,
                                   privacy_level, data_status, created_at)
                values (100, 1, '张三', '海靖公', 'P-100', 10, 12, 'clan_only', 'official', now())
                """);
        jdbcTemplate.update("""
                insert into person(id, clan_id, name, genealogy_name, person_code, branch_id, generation_no,
                                   privacy_level, data_status, created_at)
                values (101, 1, '张三', '隐私人物', 'P-101', 10, 13, 'sealed', 'official', now())
                """);
        jdbcTemplate.update("""
                insert into person(id, clan_id, name, genealogy_name, person_code, branch_id, generation_no,
                                   privacy_level, data_status, created_at)
                values (102, 1, '张三', '二房人物', 'P-102', 11, 14, 'clan_only', 'official', now())
                """);
    }

    @Test
    void PostgreSqlAppliesVisibilityBeforePagingAndHandlesNullableFilters() {
        PageResponse<TrackingObjectResponse> page = repository.search(
                1L,
                "person",
                "张三",
                null,
                null,
                null,
                null,
                false,
                List.of(10L),
                1,
                20
        );

        assertThat(page.total()).isEqualTo(1L);
        assertThat(page.records()).singleElement().satisfies(person -> {
            assertThat(person.objectId()).isEqualTo(100L);
            assertThat(person.displayName()).isEqualTo("海靖公");
            assertThat(person.branchName()).isEqualTo("长房");
            assertThat(person.secondaryLabel()).contains("第12世").contains("P-100");
        });
    }

    @Test
    void PostgreSqlSupportsChangedTimeAndExplicitBranchFilters() {
        PageResponse<TrackingObjectResponse> page = repository.search(
                1L,
                "person",
                null,
                10L,
                "official",
                LocalDateTime.now().minusDays(1),
                LocalDateTime.now().plusDays(1),
                true,
                List.of(-1L),
                1,
                20
        );

        assertThat(page.total()).isEqualTo(1L);
        assertThat(page.records()).extracting(TrackingObjectResponse::objectId).containsExactly(100L);
    }
}
