package com.genealogy.tree.repository;

import com.genealogy.person.entity.PersonEntity;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.List;

public interface TreePersonQueryRepository {

    List<PersonEntity> findTreePeopleByIds(
            Long clanId,
            Collection<Long> personIds,
            Collection<String> statuses
    );

    List<PersonEntity> findTreePeopleByBranches(
            Long clanId,
            Collection<Long> branchIds,
            Collection<String> statuses,
            Pageable pageable
    );
}
