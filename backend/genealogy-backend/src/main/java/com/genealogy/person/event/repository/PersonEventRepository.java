package com.genealogy.person.event.repository;

import com.genealogy.person.event.entity.PersonEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PersonEventRepository extends JpaRepository<PersonEventEntity, Long> {

    List<PersonEventEntity> findByPersonIdAndDeletedAtIsNullOrderByEventDateAscSortOrderAscIdAsc(Long personId);
}
