package com.genealogy.tree.repository;

import com.genealogy.tree.query.TreePersonSnapshot;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.List;

public interface TreePersonQueryRepository {

    List<TreePersonSnapshot> findTreePersonSnapshotsByIds(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses
    );

    List<TreePersonSnapshot> findTreePersonSnapshotsByBranches(
            Long clanId,
            Collection<Long> branchIds,
            Collection<String> statuses,
            Pageable pageable
    );
}