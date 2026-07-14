package com.genealogy.person.repository;

import com.genealogy.person.entity.PersonEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PersonRepository extends JpaRepository<PersonEntity, Long>, JpaSpecificationExecutor<PersonEntity> {

    List<PersonEntity> findByClanIdAndDeletedAtIsNull(Long clanId);

    List<PersonEntity> findByClanIdAndBranchIdAndDeletedAtIsNull(Long clanId, Long branchId);

    Page<PersonEntity> findByClanIdAndDeletedAtIsNull(Long clanId, Pageable pageable);

    Page<PersonEntity> findByClanIdAndBranchIdAndDeletedAtIsNull(Long clanId, Long branchId, Pageable pageable);

    Optional<PersonEntity> findByIdAndDeletedAtIsNull(Long id);

    List<PersonEntity> findByClanIdAndPersonCodeAndDeletedAtIsNull(Long clanId, String personCode);

    boolean existsByClanIdAndPersonCodeAndDeletedAtIsNull(Long clanId, String personCode);

    boolean existsByClanIdAndPersonCodeAndIdNotAndDeletedAtIsNull(Long clanId, String personCode, Long id);

    @Query("""
            select p
            from PersonEntity p
            where p.clanId = :clanId
              and p.id in :personIds
              and p.dataStatus in :statuses
              and p.deletedAt is null
            order by p.id
            """)
    List<PersonEntity> findTreePeopleByIds(
            @Param("clanId") Long clanId,
            @Param("personIds") Collection<Long> personIds,
            @Param("statuses") Collection<String> statuses
    );

    @Query("""
            select p
            from PersonEntity p
            where p.clanId = :clanId
              and p.branchId in :branchIds
              and p.dataStatus in :statuses
              and p.deletedAt is null
            order by
              case when p.generationNo is null then 1 else 0 end,
              p.generationNo,
              p.personCode,
              p.id
            """)
    List<PersonEntity> findTreePeopleByBranches(
            @Param("clanId") Long clanId,
            @Param("branchIds") Collection<Long> branchIds,
            @Param("statuses") Collection<String> statuses,
            Pageable pageable
    );
}
