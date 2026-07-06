package com.genealogy.review.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class RevisionApplyService {

    private static final String STATUS_OFFICIAL = "official";
    private static final String STATUS_VERIFIED = "verified";

    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final SourceRepository sourceRepository;

    public RevisionApplyService(
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            SourceRepository sourceRepository
    ) {
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.sourceRepository = sourceRepository;
    }

    @Transactional
    public void apply(RevisionEntity revision, Long reviewerId) {
        String targetType = normalize(revision.getTargetType());
        if ("person".equals(targetType)) {
            applyPerson(revision.getTargetId(), reviewerId);
            return;
        }
        if ("relationship".equals(targetType)) {
            applyRelationship(revision.getTargetId());
            return;
        }
        if ("source".equals(targetType)) {
            applySource(revision.getTargetId());
            return;
        }
        if ("source_binding".equals(targetType)) {
            return;
        }
        throw new BusinessException("REVISION_TARGET_UNSUPPORTED", "暂不支持该对象类型的审核生效");
    }

    private void applyPerson(Long personId, Long reviewerId) {
        PersonEntity person = personRepository.findByIdAndDeletedAtIsNull(personId)
                .orElseThrow(() -> new BusinessException("PERSON_NOT_FOUND", "人物不存在或已删除"));
        person.setDataStatus(STATUS_OFFICIAL);
        person.setUpdatedBy(reviewerId);
        person.setUpdatedAt(LocalDateTime.now());
        personRepository.save(person);
    }

    private void applyRelationship(Long relationshipId) {
        RelationshipEntity relationship = relationshipRepository.findById(relationshipId)
                .filter(item -> item.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException("RELATIONSHIP_NOT_FOUND", "亲属关系不存在或已删除"));
        relationship.setDataStatus(STATUS_OFFICIAL);
        relationship.setUpdatedAt(LocalDateTime.now());
        relationshipRepository.save(relationship);
    }

    private void applySource(Long sourceId) {
        SourceEntity source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "来源资料不存在"));
        source.setVerificationStatus(STATUS_VERIFIED);
        sourceRepository.save(source);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
