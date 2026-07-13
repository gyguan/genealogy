package com.genealogy.branch.repository;

import com.genealogy.branch.entity.BranchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BranchRepository extends JpaRepository<BranchEntity, Long> {

    List<BranchEntity> findByClanIdOrderByLevelAscSortOrderAscIdAsc(Long clanId);

    boolean existsByClanIdAndBranchName(Long clanId, String branchName);

    boolean existsByClanIdAndBranchNameAndIdNot(Long clanId, String branchName, Long id);

    boolean existsByClanId(Long clanId);

    boolean existsByParentId(Long parentId);

    Optional<BranchEntity> findByIdAndClanId(Long id, Long clanId);

    @Query(value = """
            WITH RECURSIVE branch_tree AS (
                SELECT id, parent_id, clan_id
                FROM branch
                WHERE id = :ancestorId
                  AND clan_id = :clanId
                UNION ALL
                SELECT child.id, child.parent_id, child.clan_id
                FROM branch child
                JOIN branch_tree parent ON child.parent_id = parent.id
                WHERE child.clan_id = :clanId
            )
            SELECT EXISTS (
                SELECT 1
                FROM branch_tree
                WHERE id = :candidateId
            )
            """, nativeQuery = true)
    boolean isDescendantOrSelf(
            @Param("clanId") Long clanId,
            @Param("ancestorId") Long ancestorId,
            @Param("candidateId") Long candidateId
    );
}
