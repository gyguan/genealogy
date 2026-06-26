package com.genealogy.source.repository;

import com.genealogy.source.entity.AttachmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttachmentRepository extends JpaRepository<AttachmentEntity, Long> {

    List<AttachmentEntity> findBySourceIdOrderByUploadedAtDesc(Long sourceId);
}
