package com.genealogy.tree.application;

import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.query.BranchLineageQuery;
import org.springframework.stereotype.Service;

@Service
public class BranchGraphService {
    private final TreeApplicationService legacyEngine;
    private final TreeGraphAssembler assembler;

    public BranchGraphService(
            TreeApplicationService legacyEngine,
            TreeGraphAssembler assembler
    ) {
        this.legacyEngine = legacyEngine;
        this.assembler = assembler;
    }

    public GraphSnapshot build(BranchLineageQuery query) {
        TreeGraphResponse response = legacyEngine.branchLineage(
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
