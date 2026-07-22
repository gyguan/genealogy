package com.genealogy.review.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class RevisionApplyService {

    private static final String TARGET_PERSON = "person";
    private static final String TARGET_RELATIONSHIP = "relationship";
    private static final String TARGET_SOURCE = "source";
    private static final String TARGET_BRANCH = "branch";
    private static final String TARGET_GENERATION_SCHEME = "generation_scheme";
    private static final String TARGET_CLAN = "clan";
    private static final String TARGET_IMPORT_JOB = "import_job";
    private static final String STATUS_OFFICIAL = "official";
    private static final String STATUS_REJECTED = "rejected";
    private static final String STATUS_DRAFT = "draft";
    private static final String STATUS_PENDING_REVIEW = "pending_review";
    private static final String CHANGE_PERSON_DELETE = "person_delete";

    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final SourceRepository sourceRepository;
    private final BranchRepository branchRepository;
    private ClanRepository clanRepository;
    private final GenSchemeRepository genSchemeRepository;
    private final ImportJobRepository importJobRepository;
    private final ImportJobRowRepository importJobRowRepository;
    private final ObjectMapper objectMapper;

    public RevisionApplyService(
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            SourceRepository sourceRepository,
            BranchRepository branchRepository,
            GenSchemeRepository genSchemeRepository,
            ImportJobRepository importJobRepository,
            ImportJobRowRepository importJobRowRepository,
            ObjectMapper objectMapper
    ) {
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.sourceRepository = sourceRepository;
        this.branchRepository = branchRepository;
        this.genSchemeRepository = genSchemeRepository;
        this.importJobRepository = importJobRepository;
        this.importJobRowRepository = importJobRowRepository;
        this.objectMapper = objectMapper;
    }

    @Autowired
    void setClanRepository(ClanRepository clanRepository) {
        this.clanRepository = clanRepository;
    }

    @Transactional
    public void apply(AuditRecordEntity revision, LocalDateTime applyTime) {
        String targetType = normalize(revision.getTargetType());
        if (TARGET_CLAN.equals(targetType)) { applyClan(revision, applyTime); return; }
        if (TARGET_PERSON.equals(targetType)) { applyPerson(revision, applyTime); return; }
        if (TARGET_RELATIONSHIP.equals(targetType)) { applyRelationship(revision, applyTime); return; }
        if (TARGET_SOURCE.equals(targetType)) { applySource(revision); return; }
        if (TARGET_BRANCH.equals(targetType)) { applyBranch(revision, applyTime); return; }
        if (TARGET_GENERATION_SCHEME.equals(targetType)) { applyGenerationScheme(revision); return; }
        if (TARGET_IMPORT_JOB.equals(targetType)) { applyImportJob(revision, applyTime); return; }
        throw new BusinessException("REVISION_TARGET_UNSUPPORTED", "暂不支持该对象类型的审核生效");
    }

    @Transactional
    public void reject(AuditRecordEntity revision, LocalDateTime rejectTime) {
        String targetType = normalize(revision.getTargetType());
        if (TARGET_CLAN.equals(targetType)) { rejectClan(revision, rejectTime); return; }
        if (TARGET_PERSON.equals(targetType)) { rejectPerson(revision, rejectTime); return; }
        if (TARGET_RELATIONSHIP.equals(targetType)) { rejectRelationship(revision, rejectTime); return; }
        if (TARGET_SOURCE.equals(targetType)) { rejectSource(revision); return; }
        if (TARGET_BRANCH.equals(targetType)) { rejectBranch(revision, rejectTime); return; }
        if (TARGET_GENERATION_SCHEME.equals(targetType)) { rejectGenerationScheme(revision); return; }
        if (TARGET_IMPORT_JOB.equals(targetType)) rejectImportJob(revision, rejectTime);
    }

    private void applyClan(AuditRecordEntity revision, LocalDateTime applyTime) {
        ClanEntity snapshot = readPayload(revision.getNewPayload(), ClanEntity.class);
        if (snapshot == null) {
            clanRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setStatus(STATUS_OFFICIAL);
                entity.setUpdatedAt(applyTime);
                clanRepository.save(entity);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setStatus(STATUS_OFFICIAL);
        snapshot.setUpdatedAt(applyTime);
        clanRepository.save(snapshot);
    }

    private void rejectClan(AuditRecordEntity revision, LocalDateTime rejectTime) {
        clanRepository.findById(revision.getTargetId()).ifPresent(entity -> {
            entity.setStatus(STATUS_REJECTED);
            entity.setUpdatedAt(rejectTime);
            clanRepository.save(entity);
        });
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
            personRepository.findByIdAndDeletedAtIsNull(revision.getTargetId()).ifPresent(person -> {
                person.setDataStatus(STATUS_OFFICIAL);
                person.setUpdatedAt(applyTime);
                personRepository.save(person);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setClanId(revision.getClanId());
        snapshot.setDataStatus(STATUS_OFFICIAL);
        snapshot.setDeletedAt(null);
        snapshot.setUpdatedAt(applyTime);
        personRepository.save(snapshot);
    }

    private void rejectPerson(AuditRecordEntity revision, LocalDateTime rejectTime) {
        personRepository.findByIdAndDeletedAtIsNull(revision.getTargetId()).ifPresent(entity -> {
            entity.setDataStatus(STATUS_REJECTED);
            entity.setUpdatedAt(rejectTime);
            personRepository.save(entity);
        });
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

    private void rejectRelationship(AuditRecordEntity revision, LocalDateTime rejectTime) {
        relationshipRepository.findById(revision.getTargetId()).ifPresent(entity -> {
            entity.setDataStatus(STATUS_REJECTED);
            entity.setUpdatedAt(rejectTime);
            relationshipRepository.save(entity);
        });
    }

    private void applySource(AuditRecordEntity revision) {
        SourceEntity snapshot = readPayload(revision.getNewPayload(), SourceEntity.class);
        if (snapshot == null) {
            sourceRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setVerificationStatus(STATUS_OFFICIAL);
                sourceRepository.save(entity);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setClanId(revision.getClanId());
        snapshot.setVerificationStatus(STATUS_OFFICIAL);
        sourceRepository.save(snapshot);
    }

    private void rejectSource(AuditRecordEntity revision) {
        sourceRepository.findById(revision.getTargetId()).ifPresent(entity -> {
            entity.setVerificationStatus(STATUS_REJECTED);
            sourceRepository.save(entity);
        });
    }

    private void applyBranch(AuditRecordEntity revision, LocalDateTime applyTime) {
        BranchEntity snapshot = readPayload(revision.getNewPayload(), BranchEntity.class);
        if (snapshot == null) {
            branchRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setStatus(STATUS_OFFICIAL);
                entity.setUpdatedAt(applyTime);
                branchRepository.save(entity);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setClanId(revision.getClanId());
        snapshot.setStatus(STATUS_OFFICIAL);
        snapshot.setUpdatedAt(applyTime);
        branchRepository.save(snapshot);
    }

    private void rejectBranch(AuditRecordEntity revision, LocalDateTime rejectTime) {
        branchRepository.findById(revision.getTargetId()).ifPresent(entity -> {
            entity.setStatus(STATUS_REJECTED);
            entity.setUpdatedAt(rejectTime);
            branchRepository.save(entity);
        });
    }

    private void applyGenerationScheme(AuditRecordEntity revision) {
        GenerationSchemeEntity snapshot = readPayload(revision.getNewPayload(), GenerationSchemeEntity.class);
        if (snapshot == null) {
            genSchemeRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setStatus(STATUS_OFFICIAL);
                genSchemeRepository.save(entity);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setClanId(revision.getClanId());
        snapshot.setStatus(STATUS_OFFICIAL);
        genSchemeRepository.save(snapshot);
    }

    private void rejectGenerationScheme(AuditRecordEntity revision) {
        genSchemeRepository.findById(revision.getTargetId()).ifPresent(entity -> {
            entity.setStatus(STATUS_REJECTED);
            genSchemeRepository.save(entity);
        });
    }

    private void applyImportJob(AuditRecordEntity revision, LocalDateTime applyTime) {
        ImportJobEntity job = requireImportJob(revision);
        String type = normalize(job.getImportType());
        if (ImportJobEntity.TYPE_RELATIONSHIP.equals(type)) {
            updateRelationshipStatuses(requireImportRelationships(job, STATUS_PENDING_REVIEW), STATUS_OFFICIAL, applyTime);
        } else if (ImportJobEntity.TYPE_SOURCE.equals(type)) {
            updateSourceStatuses(requireImportSources(job, STATUS_PENDING_REVIEW), STATUS_OFFICIAL, applyTime);
        } else {
            List<PersonEntity> persons = requireImportPersons(job, STATUS_PENDING_REVIEW);
            for (PersonEntity person : persons) {
                person.setDataStatus(STATUS_OFFICIAL);
                person.setUpdatedAt(applyTime);
            }
            personRepository.saveAll(persons);
        }
        job.setReviewStatus(ImportJobEntity.REVIEW_APPROVED);
        job.setUpdatedAt(applyTime);
        importJobRepository.save(job);
    }

    private void rejectImportJob(AuditRecordEntity revision, LocalDateTime rejectTime) {
        ImportJobEntity job = requireImportJob(revision);
        String type = normalize(job.getImportType());
        if (ImportJobEntity.TYPE_RELATIONSHIP.equals(type)) {
            updateRelationshipStatuses(requireImportRelationships(job, STATUS_PENDING_REVIEW), STATUS_DRAFT, rejectTime);
        } else if (ImportJobEntity.TYPE_SOURCE.equals(type)) {
            updateSourceStatuses(requireImportSources(job, STATUS_PENDING_REVIEW), STATUS_DRAFT, rejectTime);
        } else {
            List<PersonEntity> persons = requireImportPersons(job, STATUS_PENDING_REVIEW);
            for (PersonEntity person : persons) {
                person.setDataStatus(STATUS_DRAFT);
                person.setUpdatedAt(rejectTime);
            }
            personRepository.saveAll(persons);
        }
        job.setReviewStatus(ImportJobEntity.REVIEW_REJECTED);
        job.setUpdatedAt(rejectTime);
        importJobRepository.save(job);
    }

    private ImportJobEntity requireImportJob(AuditRecordEntity revision) {
        ImportJobEntity job = importJobRepository.findByIdAndClanId(revision.getTargetId(), revision.getClanId())
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_NOT_FOUND", "导入批次不存在"));
        if (!ImportJobEntity.REVIEW_PENDING.equals(job.getReviewStatus())) {
            throw new BusinessException("IMPORT_JOB_REVIEW_NOT_PENDING", "导入批次不是待审核状态");
        }
        return job;
    }

    private List<PersonEntity> requireImportPersons(ImportJobEntity job, String expectedStatus) {
        List<PersonEntity> persons = new ArrayList<>();
        for (ImportJobRowEntity row : draftRows(job)) {
            PersonEntity person = personRepository.findByIdAndDeletedAtIsNull(draftTargetId(row))
                    .orElseThrow(() -> new BusinessException("IMPORT_JOB_DRAFT_PERSON_NOT_FOUND", "导入批次关联的人物草稿不存在"));
            if (!Objects.equals(person.getClanId(), job.getClanId()) || !Objects.equals(person.getBranchId(), job.getBranchId())) {
                throw new BusinessException("IMPORT_JOB_DRAFT_PERSON_SCOPE_MISMATCH", "导入人物不属于批次宗族或支派");
            }
            if (!expectedStatus.equals(normalize(person.getDataStatus()))) {
                throw new BusinessException("IMPORT_JOB_DRAFT_PERSON_STATUS_INVALID", "导入人物状态与批次审核状态不一致");
            }
            persons.add(person);
        }
        return persons;
    }

    private List<RelationshipEntity> requireImportRelationships(ImportJobEntity job, String expectedStatus) {
        List<RelationshipEntity> relationships = new ArrayList<>();
        for (ImportJobRowEntity row : draftRows(job)) {
            RelationshipEntity relationship = relationshipRepository.findByIdAndClanIdAndDeletedAtIsNull(draftTargetId(row), job.getClanId())
                    .orElseThrow(() -> new BusinessException("IMPORT_JOB_DRAFT_RELATIONSHIP_NOT_FOUND", "导入批次关联的关系草稿不存在"));
            if (!expectedStatus.equals(normalize(relationship.getDataStatus()))) {
                throw new BusinessException("IMPORT_JOB_DRAFT_RELATIONSHIP_STATUS_INVALID", "导入关系状态与批次审核状态不一致");
            }
            relationships.add(relationship);
            if ("spouse".equals(relationship.getRelationType())) {
                List<RelationshipEntity> reverse = relationshipRepository.findActiveSameRelation(job.getClanId(), relationship.getToPersonId(), relationship.getFromPersonId(), "spouse");
                if (reverse.isEmpty()) throw new BusinessException("IMPORT_JOB_SPOUSE_REVERSE_MISSING", "配偶关系缺少反向关系，无法统一生效");
                for (RelationshipEntity item : reverse) {
                    if (!expectedStatus.equals(normalize(item.getDataStatus()))) {
                        throw new BusinessException("IMPORT_JOB_DRAFT_RELATIONSHIP_STATUS_INVALID", "配偶反向关系状态与批次审核状态不一致");
                    }
                    relationships.add(item);
                }
            }
        }
        return relationships;
    }

    private List<SourceEntity> requireImportSources(ImportJobEntity job, String expectedStatus) {
        List<SourceEntity> sources = new ArrayList<>();
        for (ImportJobRowEntity row : draftRows(job)) {
            SourceEntity source = sourceRepository.findById(draftTargetId(row))
                    .orElseThrow(() -> new BusinessException("IMPORT_JOB_DRAFT_SOURCE_NOT_FOUND", "导入批次关联的来源资料草稿不存在"));
            if (!Objects.equals(source.getClanId(), job.getClanId())) {
                throw new BusinessException("IMPORT_JOB_DRAFT_SOURCE_SCOPE_MISMATCH", "导入来源资料不属于批次宗族");
            }
            if (!expectedStatus.equals(normalize(source.getVerificationStatus()))) {
                throw new BusinessException("IMPORT_JOB_DRAFT_SOURCE_STATUS_INVALID", "导入来源资料状态与批次审核状态不一致");
            }
            sources.add(source);
        }
        return sources;
    }

    private List<ImportJobRowEntity> draftRows(ImportJobEntity job) {
        List<ImportJobRowEntity> rows = importJobRowRepository.findByJobIdAndRowStatusOrderByRowNoAsc(job.getId(), ImportJobRowEntity.STATUS_DRAFT_CREATED);
        if (rows.isEmpty()) {
            long total = importJobRowRepository.countByJobId(job.getId());
            long excluded = importJobRowRepository.countByJobIdAndRowStatus(job.getId(), ImportJobRowEntity.STATUS_EXCLUDED);
            if (total > 0 && excluded == total) return rows;
            throw new BusinessException("IMPORT_JOB_DRAFT_TARGET_EMPTY", "导入批次没有可生效的业务草稿");
        }
        if (rows.stream().anyMatch(row -> draftTargetId(row) == null)) {
            throw new BusinessException("IMPORT_JOB_DRAFT_TARGET_MISSING", "导入批次存在未关联业务草稿的数据行");
        }
        return rows;
    }

    private Long draftTargetId(ImportJobRowEntity row) { return row.getDraftTargetId() != null ? row.getDraftTargetId() : row.getDraftPersonId(); }

    private void updateRelationshipStatuses(List<RelationshipEntity> relationships, String status, LocalDateTime time) {
        for (RelationshipEntity relationship : relationships) {
            relationship.setDataStatus(status);
            relationship.setUpdatedAt(time);
        }
        relationshipRepository.saveAll(relationships);
    }

    private void updateSourceStatuses(List<SourceEntity> sources, String status, LocalDateTime time) {
        for (SourceEntity source : sources) {
            source.setVerificationStatus(status);
            source.setUpdatedAt(time);
        }
        sourceRepository.saveAll(sources);
    }

    private <T> T readPayload(String payload, Class<T> type) {
        if (payload == null || payload.isBlank()) return null;
        try {
            return objectMapper.readValue(payload, type);
        } catch (JsonProcessingException ex) {
            throw new BusinessException("REVISION_PAYLOAD_INVALID", "revision payload invalid");
        }
    }

    private String normalize(String value) { return value == null ? "" : value.trim().toLowerCase(); }
}
