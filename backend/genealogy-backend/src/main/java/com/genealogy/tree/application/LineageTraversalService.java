package com.genealogy.tree.application;

import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.query.PersonLineageQuery;
import org.springframework.stereotype.Service;

@Service
public class LineageTraversalService {
    private final TreeApplicationService legacyEngine;
    private final TreeGraphAssembler assembler;

    public LineageTraversalService(
            TreeApplicationService legacyEngine,
            TreeGraphAssembler assembler
    ) {
        this.legacyEngine = legacyEngine;
        this.assembler = assembler;
    }

    public GraphSnapshot traverse(PersonLineageQuery query) {
        TreeGraphResponse response = legacyEngine.personLineage(
                query.personId(),
                query.direction().apiValue(),
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
