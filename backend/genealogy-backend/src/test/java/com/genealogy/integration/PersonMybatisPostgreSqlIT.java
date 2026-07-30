package com.genealogy.integration;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.persistence.PageQuery;
import com.genealogy.person.dto.PersonSearchQuery;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.person.repository.query.PersonDashboardData;
import com.genealogy.tree.repository.TreePersonQueryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("integration-test")
class PersonMybatisPostgreSqlIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("genealogy_person_mybatis_it")
            .withUsername("genealogy")
            .withPassword("genealogy");

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
        registry.add("spring.flyway.enabled", () -> true);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired ClanRepository clanRepository;
    @Autowired BranchRepository branchRepository;
    @Autowired PersonRepository personRepository;
    @Autowired TreePersonQueryRepository treePersonQueryRepository;
    @Autowired PlatformTransactionManager transactionManager;

    @Test
    void personMapperSupportsIdentityExplicitNullSoftDeleteAndStableSearch() {
        Fixture fixture = fixture();
        PersonEntity first = person(fixture, "P-001", "黄甲", "male", 1, "承", LocalDate.of(1980, 1, 1));
        first.setBiography("待清空");
        first.setUpdatedAt(LocalDateTime.now().minusHours(2));
        personRepository.save(first);
        PersonEntity second = person(fixture, "P-002", "黄乙", "female", 2, "先", null);
        second.setUpdatedAt(LocalDateTime.now());
        personRepository.save(second);

        assertThat(first.getId()).isPositive();
        first.setBiography(null);
        first.setCourtesyName(null);
        personRepository.save(first);
        assertThat(personRepository.findById(first.getId()).orElseThrow().getBiography()).isNull();

        PersonSearchQuery filtered = new PersonSearchQuery(
                fixture.clan().getId(), fixture.branch().getId(), "黄", null,
                List.of("male", "female"), List.of(1, 2), List.of("承", "先"),
                List.of("official"), "generationNo,asc"
        );
        assertThat(personRepository.search(filtered, new PageQuery(1, 10)).records())
                .extracting(PersonEntity::getPersonCode)
                .containsExactly("P-001", "P-002");
        assertThat(personRepository.findForExport(filtered))
                .extracting(PersonEntity::getId)
                .containsExactlyElementsOf(personRepository.search(filtered, new PageQuery(1, 10)).records().stream().map(PersonEntity::getId).toList());

        first.setDeletedAt(LocalDateTime.now());
        personRepository.save(first);
        assertThat(personRepository.findByIdAndDeletedAtIsNull(first.getId())).isEmpty();
        assertThat(personRepository.search(filtered, new PageQuery(1, 10)).records())
                .extracting(PersonEntity::getPersonCode)
                .containsExactly("P-002");
    }

    @Test
    void duplicateDashboardBatchRollbackAndTreeProjectionRemainCompatible() {
        Fixture fixture = fixture();
        PersonEntity first = person(fixture, "D-001", "黄同名", "male", 3, "启", LocalDate.of(1970, 2, 1));
        first.setBiography("人物传记");
        first.setCreatedAt(LocalDateTime.now().minusDays(1));
        first.setUpdatedAt(LocalDateTime.now().minusMinutes(5));
        personRepository.save(first);
        PersonEntity second = person(fixture, "D-002", "黄次", "female", null, null, null);
        second.setCreatedAt(LocalDateTime.now());
        personRepository.save(second);

        assertThat(personRepository.countDuplicates(
                fixture.clan().getId(), fixture.branch().getId(), "黄同名", 3, "启", LocalDate.of(1970, 2, 1)
        )).isEqualTo(1);

        PersonDashboardData dashboard = personRepository.loadDashboardData(
                fixture.clan().getId(), "official", LocalDateTime.now().minusDays(29), 4
        );
        assertThat(dashboard.summary().peopleTotal()).isEqualTo(2);
        assertThat(dashboard.summary().generationMaintained()).isEqualTo(1);
        assertThat(dashboard.summary().biographyMaintained()).isEqualTo(1);
        assertThat(dashboard.recentPeople()).extracting(PersonEntity::getId).containsExactly(second.getId(), first.getId());

        assertThat(treePersonQueryRepository.findTreePersonSnapshotsByBranches(
                fixture.clan().getId(), List.of(fixture.branch().getId()), List.of("official"), PageRequest.of(0, 10)
        )).extracting(snapshot -> snapshot.id()).containsExactly(first.getId(), second.getId());

        String firstOriginal = first.getPersonCode();
        String secondOriginal = second.getPersonCode();
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> {
            first.setPersonCode("DUPLICATE-CODE");
            second.setPersonCode("DUPLICATE-CODE");
            personRepository.saveAll(List.of(first, second));
        })).isInstanceOf(RuntimeException.class);
        assertThat(personRepository.findById(first.getId()).orElseThrow().getPersonCode()).isEqualTo(firstOriginal);
        assertThat(personRepository.findById(second.getId()).orElseThrow().getPersonCode()).isEqualTo(secondOriginal);
    }

    private Fixture fixture() {
        String token = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        ClanEntity clan = new ClanEntity();
        clan.setClanCode("PERSON-" + token);
        clan.setClanName("人物迁移宗族-" + token);
        clan.setSurname("黄");
        clan.setStatus("official");
        clan.setCreatedAt(LocalDateTime.now());
        clan.setUpdatedAt(LocalDateTime.now());
        clanRepository.save(clan);

        BranchEntity branch = new BranchEntity();
        branch.setClanId(clan.getId());
        branch.setBranchName("人物迁移支派-" + token);
        branch.setLevel(1);
        branch.setSortOrder(1);
        branch.setStatus("official");
        branch.setCreatedAt(LocalDateTime.now());
        branch.setUpdatedAt(LocalDateTime.now());
        branchRepository.saveAndFlush(branch);
        return new Fixture(clan, branch);
    }

    private PersonEntity person(Fixture fixture, String code, String name, String gender, Integer generationNo, String generationWord, LocalDate birthDate) {
        PersonEntity person = new PersonEntity();
        person.setClanId(fixture.clan().getId());
        person.setBranchId(fixture.branch().getId());
        person.setPersonCode(code);
        person.setName(name);
        person.setGender(gender);
        person.setGenerationNo(generationNo);
        person.setGenerationWord(generationWord);
        person.setBirthDate(birthDate);
        person.setIsLiving(true);
        person.setHasDescendant(false);
        person.setLineageStatus("normal");
        person.setPrivacyLevel("clan_only");
        person.setDataStatus("official");
        person.setCreatedAt(LocalDateTime.now());
        person.setUpdatedAt(LocalDateTime.now());
        return person;
    }

    private record Fixture(ClanEntity clan, BranchEntity branch) {}
}
