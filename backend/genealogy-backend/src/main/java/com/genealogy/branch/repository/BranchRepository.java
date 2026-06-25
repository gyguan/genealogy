package com.genealogy.branch.repository;

import com.genealogy.branch.entity.BranchEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BranchRepository extends JpaRepository<BranchEntity, Long> {

    List<BranchEntity> findByClanIdOrderByLevelAscSortOrderAscIdAsc(Long clanId);
}
