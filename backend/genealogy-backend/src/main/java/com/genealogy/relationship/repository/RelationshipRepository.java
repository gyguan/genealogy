package com.genealogy.relationship.repository;

import com.genealogy.relationship.entity.RelationshipEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RelationshipRepository extends JpaRepository<RelationshipEntity, Long> {

    List<RelationshipEntity> findByFromPersonIdAndDeletedAtIsNull(Long fromPersonId);

    List<RelationshipEntity> findByToPersonIdAndDeletedAtIsNull(Long toPersonId);
}
