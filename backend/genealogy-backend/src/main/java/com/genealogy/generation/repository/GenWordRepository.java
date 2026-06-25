package com.genealogy.generation.repository;

import com.genealogy.generation.entity.GenerationWordEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GenWordRepository extends JpaRepository<GenerationWordEntity, Long> {
    List<GenerationWordEntity> findBySchemeIdOrderByGenerationNoAsc(Long schemeId);
}
