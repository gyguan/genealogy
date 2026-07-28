package com.genealogy.tree.application;

import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.query.PersonLineageQuery;
import org.springframework.stereotype.Service;

@Service
public class LineageTraversalService {
    private final TreeGraphEngine graphEngine;
    private final TreeGraphAssembler assembler;

    public LineageTraversalService(
            TreeGraphEngine graphEngine,
            TreeGraphAssembler assembler
    ) {
        this.graphEngine = graphEngine;
        this.assembler = assembler;
    }

    public GraphSnapshot traverse(PersonLineageQuery query) {
        TreeGraphResponse response = graphEngine.personLineage(
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
