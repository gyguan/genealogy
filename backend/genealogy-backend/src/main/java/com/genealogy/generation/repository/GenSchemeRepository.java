package com.genealogy.generation.repository;

import com.genealogy.generation.entity.GenerationSchemeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GenSchemeRepository extends JpaRepository<GenerationSchemeEntity, Long> {
}
