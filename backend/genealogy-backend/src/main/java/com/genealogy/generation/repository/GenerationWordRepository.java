package com.genealogy.generation.repository;

import com.genealogy.generation.entity.GenerationWordEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GenerationWordRepository extends JpaRepository<GenerationWordEntity, Long> {
}
