package com.genealogy.tree.application;

import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.query.BranchLineageQuery;
import com.genealogy.tree.query.PersonLineageQuery;
import com.genealogy.tree.query.RelationCategory;
import com.genealogy.tree.query.TreeDirection;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TreeQueryApplicationServiceTest {

    @Test
    void shouldRoutePersonScenariosThroughLineageTraversalService() {
        LineageTraversalService lineage = mock(LineageTraversalService.class);
        BranchGraphService branch = mock(BranchGraphService.class);
        TreeGraphAssembler assembler = mock(TreeGraphAssembler.class);
        TreeQueryApplicationService service = new TreeQueryApplicationService(lineage, branch, assembler);
        PersonLineageQuery query = new PersonLineageQuery(
                10L, TreeDirection.BOTH,
                Set.of(RelationCategory.BLOOD, RelationCategory.MARRIAGE),
                "official", 5, 5, 500, 1000, 20L
        );
        GraphSnapshot snapshot = new GraphSnapshot("person-10", 10L, "both", "official", List.of(), List.of(), null, List.of());
        TreeGraphResponse response = new TreeGraphResponse("person-10", 10L, "both", "official", List.of(), List.of(), null, List.of());
        when(lineage.traverse(query)).thenReturn(snapshot);
        when(assembler.response(snapshot)).thenReturn(response);

        assertSame(response, service.personLineage(query));
        verify(lineage).traverse(query);
        verify(assembler).response(snapshot);
    }

    @Test
    void shouldRouteBranchScenarioThroughBranchGraphService() {
        LineageTraversalService lineage = mock(LineageTraversalService.class);
        BranchGraphService branch = mock(BranchGraphService.class);
        TreeGraphAssembler assembler = mock(TreeGraphAssembler.class);
        TreeQueryApplicationService service = new TreeQueryApplicationService(lineage, branch, assembler);
        BranchLineageQuery query = new BranchLineageQuery(
                1L, 2L, true, Set.of(RelationCategory.BLOOD),
                "official", 5, 5, 500, 1000, 20L
        );
        GraphSnapshot snapshot = new GraphSnapshot(null, null, "descendants", "official", List.of(), List.of(), null, List.of());
        TreeGraphResponse response = new TreeGraphResponse(null, null, "descendants", "official", List.of(), List.of(), null, List.of());
        when(branch.build(query)).thenReturn(snapshot);
        when(assembler.response(snapshot)).thenReturn(response);

        assertSame(response, service.branchLineage(query));
        verify(branch).build(query);
        verify(assembler).response(snapshot);
    }
}
