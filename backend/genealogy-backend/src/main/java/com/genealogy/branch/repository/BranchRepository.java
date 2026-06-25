package com.genealogy.branch.repository;

import com.genealogy.branch.entity.BranchEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BranchRepository extends JpaRepository<BranchEntity, Long> {

    List<BranchEntity> findByClanIdOrderByLevelAscSortOrderAscIdAsc(Long clanId);

    boolean existsByClanIdAndBranchName(Long clanId, String branchName);

    boolean existsByClanIdAndBranchNameAndIdNot(Long clanId, String branchName, Long id);

    boolean existsByClanId(Long clanId);

    boolean existsByParentId(Long parentId);

    Optional<BranchEntity> findByIdAndClanId(Long id, Long clanId);
}
