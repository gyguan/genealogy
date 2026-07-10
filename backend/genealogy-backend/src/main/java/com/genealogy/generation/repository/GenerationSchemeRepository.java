package com.genealogy.generation.repository;

import com.genealogy.generation.entity.GenerationSchemeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GenerationSchemeRepository extends JpaRepository<GenerationSchemeEntity, Long> {

    Optional<GenerationSchemeEntity> findByIdAndClanId(Long id, Long clanId);
}
