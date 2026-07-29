package com.genealogy.tree.application;

import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.observability.TreeQueryMetrics;
import com.genealogy.tree.query.BranchLineageQuery;
import com.genealogy.tree.query.PersonLineageQuery;
import org.springframework.stereotype.Service;

@Service
public class TreeQueryApplicationService {
    private final LineageTraversalService lineageTraversalService;
    private final BranchGraphService branchGraphService;
    private final TreeGraphAssembler assembler;
    private final TreeQueryMetrics metrics;

    public TreeQueryApplicationService(
            LineageTraversalService lineageTraversalService,
            BranchGraphService branchGraphService,
            TreeGraphAssembler assembler,
            TreeQueryMetrics metrics
    ) {
        this.lineageTraversalService = lineageTraversalService;
        this.branchGraphService = branchGraphService;
        this.assembler = assembler;
        this.metrics = metrics;
    }

    public TreeGraphResponse personLineage(PersonLineageQuery query) {
        GraphSnapshot snapshot = metrics.observe(
                "person_" + query.direction().apiValue(),
                () -> lineageTraversalService.traverse(query)
        );
        return assembler.response(snapshot);
    }

    public TreeGraphResponse branchLineage(BranchLineageQuery query) {
        GraphSnapshot snapshot = metrics.observe(
                "branch_descendants",
                () -> branchGraphService.build(query)
        );
        return assembler.response(snapshot);
    }
}
