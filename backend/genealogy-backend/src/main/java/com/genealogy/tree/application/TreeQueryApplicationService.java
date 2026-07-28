package com.genealogy.tree.application;

import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.query.BranchLineageQuery;
import com.genealogy.tree.query.PersonLineageQuery;
import org.springframework.stereotype.Service;

@Service
public class TreeQueryApplicationService {
    private final LineageTraversalService lineageTraversalService;
    private final BranchGraphService branchGraphService;
    private final TreeGraphAssembler assembler;

    public TreeQueryApplicationService(
            LineageTraversalService lineageTraversalService,
            BranchGraphService branchGraphService,
            TreeGraphAssembler assembler
    ) {
        this.lineageTraversalService = lineageTraversalService;
        this.branchGraphService = branchGraphService;
        this.assembler = assembler;
    }

    public TreeGraphResponse personLineage(PersonLineageQuery query) {
        return assembler.response(lineageTraversalService.traverse(query));
    }

    public TreeGraphResponse branchLineage(BranchLineageQuery query) {
        return assembler.response(branchGraphService.build(query));
    }
}
