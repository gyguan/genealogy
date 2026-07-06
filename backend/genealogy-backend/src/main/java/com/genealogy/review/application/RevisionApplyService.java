package com.genealogy.review.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class RevisionApplyService {

    private static final String TARGET_PERSON = "person";
    private static final String TARGET_RELATIONSHIP = "relationship";
    private static final String TARGET_SOURCE = "source";
    private static final String TARGET_BRANCH = "branch";
    private static final String TARGET_GENERATION_SCHEME = "generation_scheme";
    private static final String STATUS_OFFICIAL = "official";
    private static final String STATUS_DRAFT = "draft";
    private static final String STATUS_VERIFIED = "verified";
    private static final String STATUS_UNVERIFIED = "unverified";
    private static final String STATUS_ACTIVE = "active";
    private static final String CHANGE_PERSON_DELETE = "person_delete";

    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final SourceRepository sourceRepository;
    private final BranchRepository branchRepository;
    private final GenSchemeRepository genSchemeRepository;
    private final ObjectMapper objectMapper;

    public RevisionApplyService(
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            SourceRepository sourceRepository,
            BranchRepository branchRepository,
            GenSchemeRepository genSchemeRepository,
            ObjectMapper objectMapper
    ) {
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.sourceRepository = sourceRepository;
        this.branchRepository = branchRepository;
        this.genSchemeRepository = genSchemeRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void apply(AuditRecordEntity revision, LocalDateTime applyTime) {
        String targetType = normalize(revision.getTargetType());
        if (TARGET_PERSON.equals(targetType)) {
            applyPerson(revision, applyTime);
            return;
        }
        if (TARGET_RELATIONSHIP.equals(targetType)) {
            applyRelationship(revision, applyTime);
            return;
        }
        if (TARGET_SOURCE.equals(targetType)) {
            applySource(revision);
            return;
        }
        if (TARGET_BRANCH.equals(targetType)) {
            applyBranch(revision, applyTime);
            return;
        }
        if (TARGET_GENERATION_SCHEME.equals(targetType)) {
            applyGenerationScheme(revision);
            return;
        }
        throw new BusinessException("REVISION_TARGET_UNSUPPORTED", "暂不支持该对象类型的审核生效");
    }

    @Transactional
    public void reject(AuditRecordEntity revision, LocalDateTime rejectTime) {
        String targetType = normalize(revision.getTargetType());
        if (TARGET_PERSON.equals(targetType)) {
            rollbackPerson(revision, rejectTime);
            return;
        }
        if (TARGET_RELATIONSHIP.equals(targetType)) {
            rollbackRelationship(revision, rejectTime);
            return;
        }
        if (TARGET_SOURCE.equals(targetType)) {
            rollbackSource(revision);
            return;
        }
        if (TARGET_BRANCH.equals(targetType)) {
            rollbackBranch(revision, rejectTime);
            return;
        }
        if (TARGET_GENERATION_SCHEME.equals(targetType)) {
            rollbackGenerationScheme(revision);
        }
    }

    private void applyPerson(AuditRecordEntity revision, LocalDateTime applyTime) {
        if (CHANGE_PERSON_DELETE.equals(normalize(revision.getChangeType()))) {
            PersonEntity person = personRepository.findByIdAndDeletedAtIsNull(revision.getTargetId())
                    .orElseThrow(() -> new BusinessException("PERSON_NOT_FOUND", "人物不存在或已删除"));
            person.setDeletedAt(applyTime);
            person.setUpdatedAt(applyTime);
            personRepository.save(person);
            return;
        }
        PersonEntity snapshot = readPayload(revision.getNewPayload(), PersonEntity.class);
        if (snapshot == null) {
            PersonEntity person = personRepository.findByIdAndDeletedAtIsNull(revision.getTargetId())
                    .orElseThrow(() -> new BusinessException("PERSON_NOT_FOUND", "人物不存在或已删除"));
            person.setDataStatus(STATUS_OFFICIAL);
            person.setUpdatedAt(applyTime);
            personRepository.save(person);
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setClanId(revision.getClanId());
        snapshot.setDataStatus(STATUS_OFFICIAL);
        snapshot.setDeletedAt(null);
        snapshot.setUpdatedAt(applyTime);
        personRepository.save(snapshot);
    }

    private void rollbackPerson(AuditRecordEntity revision, LocalDateTime rejectTime) {
        PersonEntity snapshot = readPayload(revision.getOldPayload(), PersonEntity.class);
        if (snapshot == null) {
            personRepository.findByIdAndDeletedAtIsNull(revision.getTargetId()).ifPresent(entity -> {
                entity.setDataStatus(STATUS_DRAFT);
                entity.setUpdatedAt(rejectTime);
                personRepository.save(entity);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setClanId(revision.getClanId());
        snapshot.setUpdatedAt(rejectTime);
        personRepository.save(snapshot);
    }

    private void applyRelationship(AuditRecordEntity revision, LocalDateTime applyTime) {
        RelationshipEntity snapshot = readPayload(revision.getNewPayload(), RelationshipEntity.class);
        if (snapshot == null) {
            relationshipRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setDataStatus(STATUS_OFFICIAL);
                entity.setUpdatedAt(applyTime);
                relationshipRepository.save(entity);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setClanId(revision.getClanId());
        snapshot.setDataStatus(STATUS_OFFICIAL);
        snapshot.setDeletedAt(null);
        snapshot.setUpdatedAt(applyTime);
        relationshipRepository.save(snapshot);
    }

    private void rollbackRelationship(AuditRecordEntity revision, LocalDateTime rejectTime) {
        RelationshipEntity snapshot = readPayload(revision.getOldPayload(), RelationshipEntity.class);
        if (snapshot == null) {
            relationshipRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setDataStatus(STATUS_DRAFT);
                entity.setUpdatedAt(rejectTime);
                relationshipRepository.save(entity);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setClanId(revision.getClanId());
        snapshot.setUpdatedAt(rejectTime);
        relationshipRepository.save(snapshot);
    }

    private void applySource(AuditRecordEntity revision) {
        SourceEntity snapshot = readPayload(revision.getNewPayload(), SourceEntity.class);
        if (snapshot == null) {
            sourceRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setVerificationStatus(STATUS_VERIFIED);
                sourceRepository.save(entity);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setClanId(revision.getClanId());
        snapshot.setVerificationStatus(STATUS_VERIFIED);
        sourceRepository.save(snapshot);
    }

    private void rollbackSource(AuditRecordEntity revision) {
        SourceEntity snapshot = readPayload(revision.getOldPayload(), SourceEntity.class);
        if (snapshot == null) {
            sourceRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setVerificationStatus(STATUS_UNVERIFIED);
                sourceRepository.save(entity);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setClanId(revision.getClanId());
        sourceRepository.save(snapshot);
    }

    private void applyBranch(AuditRecordEntity revision, LocalDateTime applyTime) {
        BranchEntity snapshot = readPayload(revision.getNewPayload(), BranchEntity.class);
        if (snapshot == null) {
            branchRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setStatus(STATUS_ACTIVE);
                entity.setUpdatedAt(applyTime);
                branchRepository.save(entity);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setClanId(revision.getClanId());
        snapshot.setStatus(STATUS_ACTIVE);
        snapshot.setUpdatedAt(applyTime);
        branchRepository.save(snapshot);
    }

    private void rollbackBranch(AuditRecordEntity revision, LocalDateTime rejectTime) {
        BranchEntity snapshot = readPayload(revision.getOldPayload(), BranchEntity.class);
        if (snapshot == null) {
            branchRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setStatus(STATUS_DRAFT);
                entity.setUpdatedAt(rejectTime);
                branchRepository.save(entity);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setClanId(revision.getClanId());
        snapshot.setUpdatedAt(rejectTime);
        branchRepository.save(snapshot);
    }

    private void applyGenerationScheme(AuditRecordEntity revision) {
        GenerationSchemeEntity snapshot = readPayload(revision.getNewPayload(), GenerationSchemeEntity.class);
        if (snapshot == null) {
            genSchemeRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setStatus(STATUS_ACTIVE);
                genSchemeRepository.save(entity);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setClanId(revision.getClanId());
        snapshot.setStatus(STATUS_ACTIVE);
        genSchemeRepository.save(snapshot);
    }

    private void rollbackGenerationScheme(AuditRecordEntity revision) {
        GenerationSchemeEntity snapshot = readPayload(revision.getOldPayload(), GenerationSchemeEntity.class);
        if (snapshot == null) {
            genSchemeRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setStatus(STATUS_DRAFT);
                genSchemeRepository.save(entity);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setClanId(revision.getClanId());
        genSchemeRepository.save(snapshot);
    }

    private <T> T readPayload(String payload, Class<T> type) {
        if (payload == null || payload.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(payload, type);
        } catch (JsonProcessingException ex) {
            throw new BusinessException("REVISION_PAYLOAD_INVALID", "revision payload invalid");
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
