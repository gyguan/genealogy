package com.genealogy.person.repository;

import com.genealogy.person.entity.PersonEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PersonRepository extends JpaRepository<PersonEntity, Long> {

    List<PersonEntity> findByClanIdAndDeletedAtIsNull(Long clanId);

    List<PersonEntity> findByClanIdAndBranchIdAndDeletedAtIsNull(Long clanId, Long branchId);

    Page<PersonEntity> findByClanIdAndDeletedAtIsNull(Long clanId, Pageable pageable);

    Page<PersonEntity> findByClanIdAndBranchIdAndDeletedAtIsNull(Long clanId, Long branchId, Pageable pageable);

    Optional<PersonEntity> findByIdAndDeletedAtIsNull(Long id);

    boolean existsByClanIdAndPersonCodeAndDeletedAtIsNull(Long clanId, String personCode);

    boolean existsByClanIdAndPersonCodeAndIdNotAndDeletedAtIsNull(Long clanId, String personCode, Long id);
}
