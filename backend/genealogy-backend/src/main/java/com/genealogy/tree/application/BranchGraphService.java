package com.genealogy.tree.application;

import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.query.BranchLineageQuery;
import org.springframework.stereotype.Service;

@Service
public class BranchGraphService {
    private final TreeGraphEngine graphEngine;
    private final TreeGraphAssembler assembler;

    public BranchGraphService(
            TreeGraphEngine graphEngine,
            TreeGraphAssembler assembler
    ) {
        this.graphEngine = graphEngine;
        this.assembler = assembler;
    }

    public GraphSnapshot build(BranchLineageQuery query) {
        TreeGraphResponse response = graphEngine.branchLineage(
                query.clanId(),
                query.branchId(),
                query.includeSubBranches(),
                query.relationScopes(),
                query.dataView(),
                query.appliedDepth(),
                query.maxNodes(),
                query.maxEdges(),
                query.actorId()
        );
        return assembler.snapshot(response);
    }
}
