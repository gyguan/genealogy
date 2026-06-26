package com.genealogy.generation.repository;

import com.genealogy.generation.entity.GenerationWordEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GenWordRepository extends JpaRepository<GenerationWordEntity, Long> {

    List<GenerationWordEntity> findBySchemeIdOrderByGenerationNoAsc(Long schemeId);

    Optional<GenerationWordEntity> findBySchemeIdAndGenerationNo(Long schemeId, Integer generationNo);

    boolean existsBySchemeIdAndGenerationNo(Long schemeId, Integer generationNo);

    void deleteBySchemeId(Long schemeId);
}
