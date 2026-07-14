package com.genealogy.tracking.repository;

import com.genealogy.common.api.PageResponse;
import com.genealogy.tracking.dto.TrackingObjectResponse;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TrackingObjectQueryRepositoryReviewPostgresTest {

    private TrackingObjectQueryRepository repository;
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        String url = System.getenv("TEST_POSTGRES_URL");
        Assumptions.assumeTrue(url != null && !url.isBlank(), "PostgreSQL review environment is not configured");
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                url,
                System.getenv().getOrDefault("TEST_POSTGRES_USERNAME", "genealogy"),
                System.getenv().getOrDefault("TEST_POSTGRES_PASSWORD", "genealogy")
        );
        jdbcTemplate = new JdbcTemplate(dataSource);
        repository = new TrackingObjectQueryRepository(new NamedParameterJdbcTemplate(dataSource));

        for (String table : List.of("review_task", "revision", "source_binding", "source", "relationship", "person", "branch")) {
            jdbcTemplate.execute("drop table if exists " + table + " cascade");
        }
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
        jdbcTemplate.execute("""
                create table relationship (
                    id bigint primary key,
                    clan_id bigint not null,
                    from_person_id bigint,
                    to_person_id bigint,
                    relation_type varchar(50),
                    relation_label varchar(100),
                    relation_category varchar(50),
                    successor_branch_id bigint,
                    data_status varchar(50),
                    created_at timestamp,
                    updated_at timestamp,
                    deleted_at timestamp
                )
                """);
        jdbcTemplate.execute("""
                create table source (
                    id bigint primary key,
                    clan_id bigint not null,
                    source_name varchar(200),
                    source_type varchar(50),
                    provider_name varchar(100),
                    book_title varchar(200),
                    privacy_level varchar(50),
                    verification_status varchar(50),
                    created_at timestamp,
                    updated_at timestamp
                )
                """);
        jdbcTemplate.execute("""
                create table source_binding (
                    id bigint primary key,
                    clan_id bigint not null,
                    source_id bigint not null,
                    target_type varchar(50),
                    target_id bigint
                )
                """);
        jdbcTemplate.execute("""
                create table revision (
                    id bigint primary key,
                    clan_id bigint not null,
                    target_type varchar(50),
                    target_id bigint,
                    diff_summary varchar(500),
                    change_type varchar(50)
                )
                """);
        jdbcTemplate.execute("""
                create table review_task (
                    id bigint primary key,
                    clan_id bigint not null,
                    revision_id bigint not null,
                    branch_id bigint,
                    status varchar(50),
                    review_comment varchar(500),
                    reviewed_at timestamp,
                    created_at timestamp
                )
                """);

        jdbcTemplate.update("insert into branch(id, clan_id, branch_name, status, created_at) values (10, 1, 'Z-可见支派', 'active', now())");
        jdbcTemplate.update("insert into branch(id, clan_id, branch_name, status, created_at) values (11, 1, 'A-无权支派', 'active', now())");
        jdbcTemplate.update("""
                insert into person(id, clan_id, name, genealogy_name, branch_id, privacy_level, data_status, created_at)
                values (100, 1, '张三', '可见人物', 10, 'clan_only', 'official', now())
                """);
        jdbcTemplate.update("""
                insert into person(id, clan_id, name, genealogy_name, branch_id, privacy_level, data_status, created_at)
                values (101, 1, '张四', '封存人物', 10, 'sealed', 'official', now())
                """);
        jdbcTemplate.update("insert into revision(id, clan_id, target_type, target_id, diff_summary, change_type) values (500, 1, 'person', 100, '可见变更', 'modified')");
        jdbcTemplate.update("insert into revision(id, clan_id, target_type, target_id, diff_summary, change_type) values (501, 1, 'person', 101, '敏感变更', 'modified')");
        jdbcTemplate.update("insert into review_task(id, clan_id, revision_id, branch_id, status, created_at) values (600, 1, 500, 10, 'pending', now())");
        jdbcTemplate.update("insert into review_task(id, clan_id, revision_id, branch_id, status, created_at) values (601, 1, 501, 10, 'pending', now())");
        jdbcTemplate.update("insert into source(id, clan_id, source_name, source_type, privacy_level, verification_status, created_at) values (700, 1, '族谱原件', 'book', 'clan_only', 'verified', now())");
        jdbcTemplate.update("insert into source_binding(id, clan_id, source_id, target_type, target_id) values (800, 1, 700, 'branch', 10)");
        jdbcTemplate.update("insert into source_binding(id, clan_id, source_id, target_type, target_id) values (801, 1, 700, 'branch', 11)");
    }

    @Test
    void sealedReviewTargetDoesNotEnterScopedResultsOrCount() {
        PageResponse<TrackingObjectResponse> page = repository.search(
                1L, "review_task", null, null, null, null, null,
                false, List.of(10L), 1, 20
        );

        assertThat(page.total()).isEqualTo(1L);
        assertThat(page.records()).singleElement().satisfies(task -> {
            assertThat(task.objectId()).isEqualTo(600L);
            assertThat(task.displayName()).contains("可见人物");
            assertThat(task.summary()).contains("可见变更").doesNotContain("敏感变更");
        });
    }

    @Test
    void sourceBranchLabelComesOnlyFromVisibleBindingSet() {
        PageResponse<TrackingObjectResponse> page = repository.search(
                1L, "source", "族谱", null, null, null, null,
                false, List.of(10L), 1, 20
        );

        assertThat(page.total()).isEqualTo(1L);
        assertThat(page.records()).singleElement().satisfies(source -> {
            assertThat(source.objectId()).isEqualTo(700L);
            assertThat(source.branchName()).isEqualTo("Z-可见支派");
            assertThat(source.branchName()).doesNotContain("无权");
        });
    }
}
