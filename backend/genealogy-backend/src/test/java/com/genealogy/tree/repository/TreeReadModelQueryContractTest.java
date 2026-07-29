package com.genealogy.tree.repository;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class TreeReadModelQueryContractTest {

    private static final Path SOURCE_ROOT = Path.of("src/main/java/com/genealogy/tree/repository");

    @Test
    void treeQueriesMustUseFieldLevelReadModelsInsteadOfManagedEntitySelects() throws IOException {
        String people = Files.readString(SOURCE_ROOT.resolve("TreePersonQueryRepositoryImpl.java"));
        String relationships = Files.readString(SOURCE_ROOT.resolve("TreeRelationshipQueryRepositoryImpl.java"));

        assertThat(people)
                .contains("select p.id, p.clanId, p.branchId")
                .doesNotContain("select p\n", "select p from PersonEntity");
        assertThat(relationships)
                .contains("select r.id, r.clanId, r.fromPersonId")
                .doesNotContain("select r\n", "select r from RelationshipEntity");
    }

    @Test
    void highVolumeTreeQueriesMustRemainBoundedAndDeterministicallyOrdered() throws IOException {
        String people = Files.readString(SOURCE_ROOT.resolve("TreePersonQueryRepositoryImpl.java"));
        String relationships = Files.readString(SOURCE_ROOT.resolve("TreeRelationshipQueryRepositoryImpl.java"));
        String batcher = Files.readString(SOURCE_ROOT.resolve("TreeQueryBatcher.java"));

        assertThat(batcher).contains("DEFAULT_BATCH_SIZE = 500");
        assertThat(people).contains("query.setMaxResults(targetSize)", "p.generationNo, p.personCode, p.id");
        assertThat(relationships).contains("query.setMaxResults(pageable.getPageSize())")
                .contains("r.fromPersonId, r.toPersonId, r.id")
                .contains("TreeQueryBatcher.partition");
    }
}
