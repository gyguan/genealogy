package com.genealogy.integration;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.tree.repository.TreePersonQueryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("integration-test")
class BranchRelationshipTreeMybatisPostgreSqlIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("genealogy_branch_relationship_tree_it")
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
        registry.add("spring.task.scheduling.enabled", () -> false);
    }

    @Autowired ClanRepository clanRepository;
    @Autowired BranchRepository branchRepository;
    @Autowired PersonRepository personRepository;
    @Autowired RelationshipRepository relationshipRepository;
    @Autowired TreePersonQueryRepository treePersonQueryRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @Test
    void branchRecursiveQueriesAreClanScopedDeduplicatedAndCycleSafe() {
        Fixture fixture = fixture("BRANCH");
        BranchEntity root = branch(fixture.clan().getId(), null, "root", 1, 1);
        branchRepository.save(root);
        BranchEntity child = branch(fixture.clan().getId(), root.getId(), "child", 2, 1);
        branchRepository.save(child);
        BranchEntity grandchild = branch(fixture.clan().getId(), child.getId(), "grandchild", 3, 1);
        branchRepository.save(grandchild);

        Fixture other = fixture("OTHER");
        BranchEntity otherRoot = branch(other.clan().getId(), null, "other-root", 1, 1);
        branchRepository.save(otherRoot);

        assertThat(branchRepository.isDescendantOrSelf(fixture.clan().getId(), root.getId(), root.getId())).isTrue();
        assertThat(branchRepository.isDescendantOrSelf(fixture.clan().getId(), root.getId(), grandchild.getId())).isTrue();
        assertThat(branchRepository.isDescendantOrSelf(fixture.clan().getId(), root.getId(), otherRoot.getId())).isFalse();
        assertThat(branchRepository.findSubtreeIds(
                fixture.clan().getId(), List.of(root.getId(), child.getId(), root.getId())
        )).containsExactly(root.getId(), child.getId(), grandchild.getId());

        jdbcTemplate.update("update branch set parent_id=? where id=?", grandchild.getId(), root.getId());
        assertThat(branchRepository.findSubtreeIds(fixture.clan().getId(), List.of(root.getId())))
                .containsExactly(root.getId(), child.getId(), grandchild.getId());
    }

    @Test
    void relationshipRepositoryNormalizesEveryWriteAndSupportsExplicitNull() {
        Fixture fixture = fixture("REL");
        PersonEntity from = person(fixture, "REL-001", 1);
        PersonEntity to = person(fixture, "REL-002", 2);
        personRepository.saveAll(List.of(from, to));

        RelationshipEntity relationship = relationship(fixture.clan().getId(), from.getId(), to.getId(), "继嗣");
        relationship.setDescription("clear-me");
        relationshipRepository.save(relationship);

        assertThat(relationship.getRelationType()).isEqualTo("in_adoption");
        assertThat(relationship.getRelationCategory()).isEqualTo("ritual");
        assertThat(relationship.getId()).isPositive();

        relationship.setDescription(null);
        relationshipRepository.save(relationship);
        assertThat(relationshipRepository.findById(relationship.getId()).orElseThrow().getDescription()).isNull();

        RelationshipEntity mismatch = relationship(fixture.clan().getId(), to.getId(), from.getId(), "spouse");
        mismatch.setRelationCategory("blood");
        assertThatThrownBy(() -> relationshipRepository.save(mismatch))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("incompatible");
    }

    @Test
    void treeReadModelsPreserveFiveHundredBoundaryStableOrderAndCrossBatchEdges() {
        Fixture fixture = fixture("TREE");
        List<PersonEntity> people = new ArrayList<>();
        for (int index = 0; index < 501; index++) {
            people.add(person(fixture, "T-" + String.format("%03d", index), 1));
        }
        personRepository.saveAll(people);
        List<Long> personIds = people.stream().map(PersonEntity::getId).toList();

        assertThat(treePersonQueryRepository.findTreePersonSnapshotsByIds(
                fixture.clan().getId(), personIds, List.of("official")
        )).hasSize(501).extracting(snapshot -> snapshot.id()).isSorted();

        assertThat(treePersonQueryRepository.findTreePersonSnapshotsByBranches(
                fixture.clan().getId(), List.of(fixture.branch().getId()), List.of("official"),
                PageRequest.of(0, 501)
        )).hasSize(501).extracting(snapshot -> snapshot.personCode()).isSorted();

        RelationshipEntity crossBatch = relationship(
                fixture.clan().getId(), people.get(0).getId(), people.get(500).getId(), "parent_child"
        );
        crossBatch.setRelationLabel("biological_father");
        crossBatch.setIsLineageRelation(true);
        relationshipRepository.save(crossBatch);

        assertThat(relationshipRepository.findTreeWithinPeopleSnapshots(
                fixture.clan().getId(), personIds, List.of("official"), List.of("blood"),
                PageRequest.of(0, 2)
        )).singleElement().satisfies(snapshot -> {
            assertThat(snapshot.id()).isEqualTo(crossBatch.getId());
            assertThat(snapshot.fromPersonId()).isEqualTo(people.get(0).getId());
            assertThat(snapshot.toPersonId()).isEqualTo(people.get(500).getId());
        });
    }

    private Fixture fixture(String prefix) {
        String token = token();
        ClanEntity clan = new ClanEntity();
        clan.setClanCode(prefix + "-" + token);
        clan.setClanName(prefix + "迁移宗族-" + token);
        clan.setSurname("黄");
        clan.setStatus("official");
        clan.setCreatedAt(LocalDateTime.now());
        clan.setUpdatedAt(LocalDateTime.now());
        clanRepository.save(clan);

        BranchEntity branch = branch(clan.getId(), null, prefix + "-branch-" + token, 1, 1);
        branchRepository.save(branch);
        branch.setBranchPath(String.valueOf(branch.getId()));
        branchRepository.save(branch);
        return new Fixture(clan, branch);
    }

    private BranchEntity branch(Long clanId, Long parentId, String name, int level, int sortOrder) {
        BranchEntity branch = new BranchEntity();
        branch.setClanId(clanId);
        branch.setParentId(parentId);
        branch.setBranchName(name + "-" + token());
        branch.setLevel(level);
        branch.setSortOrder(sortOrder);
        branch.setStatus("official");
        branch.setCreatedAt(LocalDateTime.now());
        branch.setUpdatedAt(LocalDateTime.now());
        return branch;
    }

    private PersonEntity person(Fixture fixture, String code, int generationNo) {
        PersonEntity person = new PersonEntity();
        person.setClanId(fixture.clan().getId());
        person.setBranchId(fixture.branch().getId());
        person.setPersonCode(code + "-" + token());
        person.setName(code);
        person.setGender("male");
        person.setGenerationNo(generationNo);
        person.setIsLiving(true);
        person.setHasDescendant(false);
        person.setLineageStatus("normal");
        person.setPrivacyLevel("clan_only");
        person.setDataStatus("official");
        person.setCreatedAt(LocalDateTime.now());
        person.setUpdatedAt(LocalDateTime.now());
        return person;
    }

    private RelationshipEntity relationship(Long clanId, Long fromId, Long toId, String type) {
        RelationshipEntity relationship = new RelationshipEntity();
        relationship.setClanId(clanId);
        relationship.setFromPersonId(fromId);
        relationship.setToPersonId(toId);
        relationship.setRelationType(type);
        relationship.setDataStatus("official");
        relationship.setIsLineageRelation(false);
        relationship.setIsBiological(false);
        relationship.setIsPrimary(false);
        relationship.setCreatedAt(LocalDateTime.now());
        relationship.setUpdatedAt(LocalDateTime.now());
        return relationship;
    }

    private String token() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }

    private record Fixture(ClanEntity clan, BranchEntity branch) {
    }
}
