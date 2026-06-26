package com.genealogy.generation.repository;

import com.genealogy.generation.entity.GenerationSchemeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GenSchemeRepository extends JpaRepository<GenerationSchemeEntity, Long> {

    List<GenerationSchemeEntity> findByClanIdOrderByIsDefaultDescIdAsc(Long clanId);
}
