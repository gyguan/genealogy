package com.genealogy.integration;

import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("integration-test")
class PostgreSqlCoreIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("genealogy_it")
            .withUsername("genealogy")
            .withPassword("genealogy");

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
        registry.add("spring.flyway.enabled", () -> true);    }

    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired ClanRepository clanRepository;
    @Autowired PersonRepository personRepository;
    @Autowired RelationshipRepository relationshipRepository;
    @Autowired PlatformTransactionManager transactionManager;

    @Test
    void ftFail003_emptyPostgresRunsFlywayAndValidatesCoreSchema() throws Exception {
        DataSource dataSource = jdbcTemplate.getDataSource();
        assertThat(dataSource).isNotNull();
        String databaseProduct;
        try (var connection = dataSource.getConnection()) {
            databaseProduct = connection.getMetaData().getDatabaseProductName();
        }
        assertThat(databaseProduct).isEqualTo("PostgreSQL");

        Integer successfulMigrations = jdbcTemplate.queryForObject(
                "select count(*) from flyway_schema_history where success = true",
                Integer.class
        );
        assertThat(successfulMigrations).isNotNull().isPositive();

        List<String> tables = jdbcTemplate.queryForList(
                "select table_name from information_schema.tables where table_schema = 'public'",
                String.class
        );
        assertThat(tables).contains("clan", "person", "relationship", "review_task", "operation_log");
    }

    @Test
    @Transactional
    void ftPerm001_repositoryQueryDoesNotMixDifferentClans() {
        ClanEntity clanA = saveClan("A");
        ClanEntity clanB = saveClan("B");
        PersonEntity personA = savePerson(clanA.getId(), "宗族A人物");
        PersonEntity personB = savePerson(clanB.getId(), "宗族B人物");

        List<PersonEntity> visibleForA = personRepository.findByClanIdAndDeletedAtIsNull(clanA.getId());

        assertThat(visibleForA).extracting(PersonEntity::getId).contains(personA.getId());
        assertThat(visibleForA).extracting(PersonEntity::getId).doesNotContain(personB.getId());
    }

    @Test
    @Transactional
    void ftRel002_databaseRejectsSelfRelationship() {
        ClanEntity clan = saveClan("SELF");
        PersonEntity person = savePerson(clan.getId(), "自关系测试人物");

        RelationshipEntity relationship = new RelationshipEntity();
        relationship.setClanId(clan.getId());
        relationship.setFromPersonId(person.getId());
        relationship.setToPersonId(person.getId());
        relationship.setRelationType("parent_child");
        relationship.setRelationCategory("blood");
        relationship.setIsLineageRelation(true);
        relationship.setIsBiological(true);
        relationship.setIsPrimary(true);
        relationship.setConfidenceLevel("high");
        relationship.setDataStatus("draft");
        relationship.setCreatedAt(LocalDateTime.now());
        relationship.setUpdatedAt(LocalDateTime.now());

        assertThatThrownBy(() -> relationshipRepository.saveAndFlush(relationship))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void ftState004_concurrentDuplicateGuardAllowsOnlyOneCommit() throws Exception {
        jdbcTemplate.execute("""
                create table if not exists functional_test_concurrency_guard (
                    request_key varchar(200) primary key,
                    created_at timestamp not null default now()
                )
                """);
        String requestKey = "FT-STATE-004-" + UUID.randomUUID();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            var insert = (java.util.concurrent.Callable<Boolean>) () -> {
                ready.countDown();
                start.await();
                try {
                    transactionTemplate.executeWithoutResult(status -> jdbcTemplate.update(
                            "insert into functional_test_concurrency_guard(request_key) values (?)",
                            requestKey
                    ));
                    return true;
                } catch (DataAccessException exception) {
                    return false;
                }
            };

            Future<Boolean> first = executor.submit(insert);
            Future<Boolean> second = executor.submit(insert);
            ready.await();
            start.countDown();

            List<Boolean> results = List.of(first.get(), second.get());
            assertThat(results.stream().filter(Boolean::booleanValue).count()).isEqualTo(1);
            Integer rows = jdbcTemplate.queryForObject(
                    "select count(*) from functional_test_concurrency_guard where request_key = ?",
                    Integer.class,
                    requestKey
            );
            assertThat(rows).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void transactionRollbackRemovesPartialBusinessWrite() {
        long before = clanRepository.count();
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);

        assertThatThrownBy(() -> transactionTemplate.executeWithoutResult(status -> {
            saveClan("ROLLBACK");
            throw new IllegalStateException("force rollback");
        })).isInstanceOf(IllegalStateException.class);

        assertThat(clanRepository.count()).isEqualTo(before);
    }

    private ClanEntity saveClan(String suffix) {
        ClanEntity clan = new ClanEntity();
        String token = suffix + "-" + UUID.randomUUID();
        clan.setClanCode("IT-" + token);
        clan.setClanName("集成测试宗族-" + token);
        clan.setSurname("黄");
        clan.setStatus("draft");
        clan.setCreatedAt(LocalDateTime.now());
        clan.setUpdatedAt(LocalDateTime.now());
        return clanRepository.saveAndFlush(clan);
    }

    private PersonEntity savePerson(Long clanId, String name) {
        PersonEntity person = new PersonEntity();
        person.setClanId(clanId);
        person.setPersonCode("IT-P-" + UUID.randomUUID());
        person.setName(name);
        person.setGender("unknown");
        person.setIsLiving(true);
        person.setHasDescendant(false);
        person.setLineageStatus("normal");
        person.setPrivacyLevel("clan_only");
        person.setDataStatus("draft");
        person.setCreatedAt(LocalDateTime.now());
        person.setUpdatedAt(LocalDateTime.now());
        return personRepository.saveAndFlush(person);
    }
}
