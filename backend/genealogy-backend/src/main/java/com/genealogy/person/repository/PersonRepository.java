package com.genealogy.person.repository;

import com.genealogy.person.entity.PersonEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

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
}
