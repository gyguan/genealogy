package com.genealogy.tree.repository;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class TreeReadModelQueryContractTest {

    private static final Path REPOSITORY_ROOT = Path.of("src/main/java/com/genealogy/tree/repository");
    private static final Path QUERY_ROOT = Path.of("src/main/java/com/genealogy/tree/query");

    @Test
    void treeQueriesMustUseTypedImmutableConstructorProjections() throws IOException {
        String people = Files.readString(REPOSITORY_ROOT.resolve("TreePersonQueryRepositoryImpl.java"));
        String relationships = Files.readString(REPOSITORY_ROOT.resolve("TreeRelationshipQueryRepositoryImpl.java"));

        assertThat(people)
                .contains("select new com.genealogy.tree.query.TreePersonSnapshot(")
                .contains("TypedQuery<TreePersonSnapshot>")
                .doesNotContain("PersonEntity person = new PersonEntity()", "Object[]", "int i = 0");
        assertThat(relationships)
                .contains("select new com.genealogy.tree.query.TreeRelationshipSnapshot(")
                .contains("TypedQuery<TreeRelationshipSnapshot>")
                .doesNotContain("RelationshipEntity relationship = new RelationshipEntity()", "Object[]", "int i = 0");
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
        String people = Files.readString(REPOSITORY_ROOT.resolve("TreePersonQueryRepositoryImpl.java"));
        assertThat(people).doesNotContain("p.biography", "p.epitaph", "p.tombPlace", "p.education", "p.occupation", "p.titleOrHonor");
    }

    @Test
    void snapshotsMustBeRecordsAndRemainOutsidePersistenceModel() throws IOException {
        String people = Files.readString(QUERY_ROOT.resolve("TreePersonSnapshot.java"));
        String relationships = Files.readString(QUERY_ROOT.resolve("TreeRelationshipSnapshot.java"));
        assertThat(people).contains("public record TreePersonSnapshot(").doesNotContain("@Entity");
        assertThat(relationships).contains("public record TreeRelationshipSnapshot(").doesNotContain("@Entity");
    }

    @Test
    void branchPagingMustBeGlobalAndExecutedByDatabase() throws IOException {
        String people = Files.readString(REPOSITORY_ROOT.resolve("TreePersonQueryRepositoryImpl.java"));
        assertThat(people)
                .contains("query.setFirstResult(Math.toIntExact(pageable.getOffset()))")
                .contains("query.setMaxResults(pageable.getPageSize())")
                .contains("p.generationNo, p.personCode, p.id")
                .doesNotContain("result.subList(", "query.setMaxResults(targetSize)");
    }

    @Test
    void batchedGraphQueriesMustRestoreDeterministicGlobalOrder() throws IOException {
        String people = Files.readString(REPOSITORY_ROOT.resolve("TreePersonQueryRepositoryImpl.java"));
        String relationships = Files.readString(REPOSITORY_ROOT.resolve("TreeRelationshipQueryRepositoryImpl.java"));
        String batcher = Files.readString(REPOSITORY_ROOT.resolve("TreeQueryBatcher.java"));

        assertThat(batcher).contains("DEFAULT_BATCH_SIZE = 500");
        assertThat(people)
                .contains("TreeQueryBatcher.partition")
                .contains("result.sort(Comparator.comparing(TreePersonSnapshot::id");
        assertThat(relationships)
                .contains("TreeQueryBatcher.partition")
                .contains("result.sort(outgoing ? OUTGOING_ORDER : INCOMING_ORDER)")
                .contains("r.fromPersonId, r.toPersonId, r.id");
    }
}
