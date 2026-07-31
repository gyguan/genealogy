package com.genealogy.tree.repository;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class TreeReadModelQueryContractTest {

    private static final Path REPOSITORY_ROOT = Path.of("src/main/java/com/genealogy/tree/repository");
    private static final Path MAPPER_ROOT = REPOSITORY_ROOT.resolve("mybatis");
    private static final Path XML_ROOT = Path.of("src/main/resources/mapper/tree");
    private static final Path QUERY_ROOT = Path.of("src/main/java/com/genealogy/tree/query");

    @Test
    void treeQueriesMustUseTypedImmutableMybatisProjections() throws IOException {
        String people = Files.readString(REPOSITORY_ROOT.resolve("TreePersonQueryRepositoryImpl.java"));
        String relationships = Files.readString(REPOSITORY_ROOT.resolve("TreeRelationshipQueryRepositoryImpl.java"));
        String peopleMapper = Files.readString(MAPPER_ROOT.resolve("TreePersonQueryMapper.java"));
        String relationshipMapper = Files.readString(MAPPER_ROOT.resolve("TreeRelationshipQueryMapper.java"));
        String peopleXml = Files.readString(XML_ROOT.resolve("TreePersonQueryMapper.xml"));
        String relationshipXml = Files.readString(XML_ROOT.resolve("TreeRelationshipQueryMapper.xml"));

        assertThat(people)
                .contains("TreePersonQueryMapper")
                .doesNotContain("Entity" + "Manager", "TypedQuery", "PersonEntity person = new PersonEntity()", "Object[]", "int i = 0");
        assertThat(relationships)
                .contains("TreeRelationshipQueryMapper")
                .doesNotContain("Entity" + "Manager", "TypedQuery", "RelationshipEntity relationship = new RelationshipEntity()", "Object[]", "int i = 0");
        assertThat(peopleMapper).contains("List<TreePersonSnapshot>");
        assertThat(relationshipMapper).contains("List<TreeRelationshipSnapshot>");
        assertThat(peopleXml)
                .contains("type=\"com.genealogy.tree.query.TreePersonSnapshot\"")
                .contains("<constructor>");
        assertThat(relationshipXml)
                .contains("type=\"com.genealogy.tree.query.TreeRelationshipSnapshot\"")
                .contains("<constructor>");
    }

    @Test
    void treeQueryRepositoryContractsMustNotExposePersistenceEntities() throws IOException {
        String peopleContract = Files.readString(REPOSITORY_ROOT.resolve("TreePersonQueryRepository.java"));
        String relationshipsContract = Files.readString(REPOSITORY_ROOT.resolve("TreeRelationshipQueryRepository.java"));

        assertThat(peopleContract).contains("List<TreePersonSnapshot>").doesNotContain("PersonEntity");
        assertThat(relationshipsContract).contains("List<TreeRelationshipSnapshot>").doesNotContain("RelationshipEntity");
    }

    @Test
    void topologyQueriesMustNotLoadLargeNarrativeFields() throws IOException {
        String peopleXml = Files.readString(XML_ROOT.resolve("TreePersonQueryMapper.xml"));
        assertThat(peopleXml).doesNotContain(
                "biography", "epitaph", "tomb_place", "education", "occupation", "title_or_honor"
        );
    }

    @Test
    void snapshotsMustBeRecordsAndRemainOutsidePersistenceModel() throws IOException {
        String people = Files.readString(QUERY_ROOT.resolve("TreePersonSnapshot.java"));
        String relationships = Files.readString(QUERY_ROOT.resolve("TreeRelationshipSnapshot.java"));
        assertThat(people).contains("public record TreePersonSnapshot(").doesNotContain("@Entity");
        assertThat(relationships).contains("public record TreeRelationshipSnapshot(").doesNotContain("@Entity");
    }

    @Test
    void branchPagingMustBoundEachDatabaseBatchAndRestoreGlobalOrderBeforeSlice() throws IOException {
        String people = Files.readString(REPOSITORY_ROOT.resolve("TreePersonQueryRepositoryImpl.java"));
        String peopleXml = Files.readString(XML_ROOT.resolve("TreePersonQueryMapper.xml"));

        assertThat(people)
                .contains("Integer fetchLimit = requiredLimit(pageable)")
                .contains("queryMapper.selectByBranches(clanId, batch, normalizedStatuses, fetchLimit)")
                .contains("result.sort(PERSON_ORDER)")
                .contains("return slice(result, pageable)");
        assertThat(peopleXml)
                .contains("order by generation_no asc nulls last, person_code asc nulls first, id asc")
                .contains("<if test=\"limit != null\">limit #{limit}</if>");
    }

    @Test
    void batchedGraphQueriesMustRestoreDeterministicGlobalOrder() throws IOException {
        String people = Files.readString(REPOSITORY_ROOT.resolve("TreePersonQueryRepositoryImpl.java"));
        String relationships = Files.readString(REPOSITORY_ROOT.resolve("TreeRelationshipQueryRepositoryImpl.java"));
        String relationshipXml = Files.readString(XML_ROOT.resolve("TreeRelationshipQueryMapper.xml"));
        String batcher = Files.readString(REPOSITORY_ROOT.resolve("TreeQueryBatcher.java"));

        assertThat(batcher).contains("DEFAULT_BATCH_SIZE = 500");
        assertThat(people)
                .contains("TreeQueryBatcher.partition")
                .contains("result.sort(Comparator.comparing(TreePersonSnapshot::id");
        assertThat(relationships)
                .contains("TreeQueryBatcher.partition")
                .contains("for (List<Long> fromBatch : batches)")
                .contains("for (List<Long> toBatch : batches)")
                .contains("result.sort(outgoing ? OUTGOING_ORDER : INCOMING_ORDER)");
        assertThat(relationshipXml)
                .contains("order by from_person_id, to_person_id, id")
                .contains("order by to_person_id, from_person_id, id");
    }
}
