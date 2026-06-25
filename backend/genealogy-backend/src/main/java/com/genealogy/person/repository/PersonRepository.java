package com.genealogy.person.repository;

import com.genealogy.person.entity.PersonEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PersonRepository extends JpaRepository<PersonEntity, Long> {

    List<PersonEntity> findByClanIdAndDeletedAtIsNull(Long clanId);

    List<PersonEntity> findByClanIdAndBranchIdAndDeletedAtIsNull(Long clanId, Long branchId);
}
