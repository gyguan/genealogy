package com.genealogy.source.repository;

import com.genealogy.source.entity.SourceEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SourceRepository extends JpaRepository<SourceEntity, Long> {

    Page<SourceEntity> findByClanId(Long clanId, Pageable pageable);
}
