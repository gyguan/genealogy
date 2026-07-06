package com.genealogy.review.repository;

import com.genealogy.review.entity.RevisionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RevisionRepository extends JpaRepository<RevisionEntity, Long> {

    List<RevisionEntity> findByClanIdAndStatusOrderBySubmitTimeDesc(Long clanId, String status);
}
