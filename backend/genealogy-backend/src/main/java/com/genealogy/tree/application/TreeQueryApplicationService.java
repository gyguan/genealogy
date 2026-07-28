package com.genealogy.tree.application;

import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.query.BranchLineageQuery;
import com.genealogy.tree.query.PersonLineageQuery;
import org.springframework.stereotype.Service;

@Service
public class TreeQueryApplicationService {
    private final TreeApplicationService delegate;

    public TreeQueryApplicationService(TreeApplicationService delegate) {
        this.delegate = delegate;
    }

    public TreeGraphResponse personLineage(PersonLineageQuery query) {
        return delegate.personLineage(
                query.personId(), query.direction().apiValue(), query.relationScopes(), query.dataView(),
                query.appliedDepth(), query.maxNodes(), query.maxEdges(), query.actorId()
        );
    }

    public TreeGraphResponse branchLineage(BranchLineageQuery query) {
        return delegate.branchLineage(
                query.clanId(), query.branchId(), query.includeSubBranches(), query.relationScopes(), query.dataView(),
                query.appliedDepth(), query.maxNodes(), query.maxEdges(), query.actorId()
        );
    }
}
