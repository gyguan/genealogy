package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.entity.ImportJobChunkEntity;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobChunkRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class ImportPublishingChunkService {

    private static final String STATUS_PENDING_REVIEW = "pending_review";
    private static final String STATUS_OFFICIAL = "official";

    private final ImportJobRepository jobRepository;
    private final ImportJobRowRepository rowRepository;
    private final ImportJobChunkRepository chunkRepository;
    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final SourceRepository sourceRepository;

    public ImportPublishingChunkService(
            ImportJobRepository jobRepository,
            ImportJobRowRepository rowRepository,
            ImportJobChunkRepository chunkRepository,
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            SourceRepository sourceRepository
    ) {
        this.jobRepository = jobRepository;
        this.rowRepository = rowRepository;
        this.chunkRepository = chunkRepository;
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.sourceRepository = sourceRepository;
    }

    @Transactional
    public boolean processNextChunk(Long jobId) {
        ImportJobEntity job = jobRepository.findById(jobId)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_NOT_FOUND", "导入任务不存在"));
        if (!ImportJobEntity.STAGE_PUBLISHING.equals(job.getExecutionStage())) {
            throw new BusinessException("IMPORT_JOB_STAGE_INVALID", "导入任务当前不在发布阶段");
        }
        int chunkSize = Math.max(1, value(job.getChunkSize(), 200));
        List<ImportJobRowEntity> rows = rowRepository
                .findByJobIdAndRowStatusAndPublishedAtIsNullOrderByRowNoAsc(
                        jobId,
                        ImportJobRowEntity.STATUS_DRAFT_CREATED,
                        PageRequest.of(0, chunkSize)
                );
        if (rows.isEmpty()) {
            completePublishing(job);
            return true;
        }

        int fromRowNo = rows.get(0).getRowNo();
        int toRowNo = rows.get(rows.size() - 1).getRowNo();
        int chunkNo = value(job.getPublishedCount()) / chunkSize;
        ImportJobChunkEntity chunk = chunkRepository.findByJobIdAndStageAndChunkNo(
                        jobId, ImportJobChunkEntity.STAGE_PUBLISHING, chunkNo)
                .orElseGet(() -> newChunk(jobId, chunkNo, fromRowNo, toRowNo));
        if (ImportJobChunkEntity.STATUS_COMPLETED.equals(chunk.getStatus())) {
            for (ImportJobRowEntity row : rows) {
                if (row.getPublishedAt() == null) row.setPublishedAt(chunk.getCompletedAt());
            }
            rowRepository.saveAll(rows);
        } else {
            chunk.setStatus(ImportJobChunkEntity.STATUS_RUNNING);
            chunk.setAttemptCount(Math.max(1, value(chunk.getAttemptCount()) + (chunk.getId() == null ? 0 : 1)));
            chunk.setErrorSummary(null);
            chunk.setStartedAt(LocalDateTime.now());
            chunkRepository.save(chunk);
            publishRows(job, rows);
            LocalDateTime completedAt = LocalDateTime.now();
            for (ImportJobRowEntity row : rows) {
                row.setPublishedAt(completedAt);
                row.setUpdatedAt(completedAt);
            }
            rowRepository.saveAll(rows);
            chunk.setStatus(ImportJobChunkEntity.STATUS_COMPLETED);
            chunk.setCompletedAt(completedAt);
            chunkRepository.save(chunk);
        }

        long unpublished = rowRepository.countByJobIdAndRowStatusAndPublishedAtIsNull(
                jobId, ImportJobRowEntity.STATUS_DRAFT_CREATED);
        long totalDrafts = rowRepository.countByJobIdAndRowStatus(jobId, ImportJobRowEntity.STATUS_DRAFT_CREATED);
        LocalDateTime now = LocalDateTime.now();
        job.setPublishedCount(safeInt(totalDrafts - unpublished));
        job.setExecutionStatus(unpublished == 0 ? ImportJobEntity.EXECUTION_COMPLETED : ImportJobEntity.EXECUTION_QUEUED);
        job.setExecutionStage(unpublished == 0 ? ImportJobEntity.STAGE_COMPLETED : ImportJobEntity.STAGE_PUBLISHING);
        job.setHeartbeatAt(now);
        job.setUpdatedAt(now);
        if (unpublished == 0) {
            job.setCompletedAt(now);
            job.setLeaseOwner(null);
            job.setLeaseExpiresAt(null);
        }
        jobRepository.save(job);
        return unpublished == 0;
    }

    private void publishRows(ImportJobEntity job, List<ImportJobRowEntity> rows) {
        String type = normalize(job.getImportType());
        LocalDateTime now = LocalDateTime.now();
        if (ImportJobEntity.TYPE_RELATIONSHIP.equals(type)) {
            publishRelationships(job, rows, now);
        } else if (ImportJobEntity.TYPE_SOURCE.equals(type)) {
            publishSources(job, rows, now);
        } else if (ImportJobEntity.TYPE_PERSON.equals(type)) {
            publishPersons(job, rows, now);
        } else {
            throw new BusinessException("IMPORT_ASYNC_PUBLISH_TYPE_UNSUPPORTED", "当前导入类型不支持分段发布");
        }
    }

    private void publishPersons(ImportJobEntity job, List<ImportJobRowEntity> rows, LocalDateTime now) {
        List<PersonEntity> persons = new ArrayList<>();
        for (ImportJobRowEntity row : rows) {
            PersonEntity person = personRepository.findByIdAndDeletedAtIsNull(targetId(row))
                    .orElseThrow(() -> new BusinessException("IMPORT_JOB_DRAFT_PERSON_NOT_FOUND", "导入批次关联的人物草稿不存在"));
            if (!Objects.equals(person.getClanId(), job.getClanId()) || !Objects.equals(person.getBranchId(), job.getBranchId())) {
                throw new BusinessException("IMPORT_JOB_DRAFT_PERSON_SCOPE_MISMATCH", "导入人物不属于批次宗族或支派");
            }
            requirePendingOrOfficial(person.getDataStatus());
            person.setDataStatus(STATUS_OFFICIAL);
            person.setUpdatedAt(now);
            persons.add(person);
        }
        personRepository.saveAll(persons);
    }

    private void publishRelationships(ImportJobEntity job, List<ImportJobRowEntity> rows, LocalDateTime now) {
        List<RelationshipEntity> relationships = new ArrayList<>();
        for (ImportJobRowEntity row : rows) {
            RelationshipEntity relationship = relationshipRepository
                    .findByIdAndClanIdAndDeletedAtIsNull(targetId(row), job.getClanId())
                    .orElseThrow(() -> new BusinessException("IMPORT_JOB_DRAFT_RELATIONSHIP_NOT_FOUND", "导入批次关联的关系草稿不存在"));
            requirePendingOrOfficial(relationship.getDataStatus());
            relationship.setDataStatus(STATUS_OFFICIAL);
            relationship.setUpdatedAt(now);
            relationships.add(relationship);
            if ("spouse".equals(relationship.getRelationType())) {
                List<RelationshipEntity> reverse = relationshipRepository.findActiveSameRelation(
                        job.getClanId(), relationship.getToPersonId(), relationship.getFromPersonId(), "spouse");
                if (reverse.isEmpty()) {
                    throw new BusinessException("IMPORT_JOB_SPOUSE_REVERSE_MISSING", "配偶关系缺少反向关系，无法统一生效");
                }
                for (RelationshipEntity item : reverse) {
                    requirePendingOrOfficial(item.getDataStatus());
                    item.setDataStatus(STATUS_OFFICIAL);
                    item.setUpdatedAt(now);
                    relationships.add(item);
                }
            }
        }
        relationshipRepository.saveAll(relationships);
    }

    private void publishSources(ImportJobEntity job, List<ImportJobRowEntity> rows, LocalDateTime now) {
        List<SourceEntity> sources = new ArrayList<>();
        for (ImportJobRowEntity row : rows) {
            SourceEntity source = sourceRepository.findById(targetId(row))
                    .orElseThrow(() -> new BusinessException("IMPORT_JOB_DRAFT_SOURCE_NOT_FOUND", "导入批次关联的来源资料草稿不存在"));
            if (!Objects.equals(source.getClanId(), job.getClanId())) {
                throw new BusinessException("IMPORT_JOB_DRAFT_SOURCE_SCOPE_MISMATCH", "导入来源资料不属于批次宗族");
            }
            requirePendingOrOfficial(source.getVerificationStatus());
            source.setVerificationStatus(STATUS_OFFICIAL);
            source.setUpdatedAt(now);
            sources.add(source);
        }
        sourceRepository.saveAll(sources);
    }

    private void requirePendingOrOfficial(String status) {
        String normalized = normalize(status);
        if (!STATUS_PENDING_REVIEW.equals(normalized) && !STATUS_OFFICIAL.equals(normalized)) {
            throw new BusinessException("IMPORT_JOB_DRAFT_STATUS_INVALID", "导入草稿状态与批次审核状态不一致");
        }
    }

    private void completePublishing(ImportJobEntity job) {
        LocalDateTime now = LocalDateTime.now();
        job.setExecutionStatus(ImportJobEntity.EXECUTION_COMPLETED);
        job.setExecutionStage(ImportJobEntity.STAGE_COMPLETED);
        job.setReviewStatus(ImportJobEntity.REVIEW_APPROVED);
        job.setPublishedCount(value(job.getSuccessCount()));
        job.setCompletedAt(now);
        job.setHeartbeatAt(now);
        job.setLeaseOwner(null);
        job.setLeaseExpiresAt(null);
        job.setUpdatedAt(now);
        jobRepository.save(job);
    }

    private ImportJobChunkEntity newChunk(Long jobId, int chunkNo, int fromRowNo, int toRowNo) {
        ImportJobChunkEntity chunk = new ImportJobChunkEntity();
        chunk.setJobId(jobId);
        chunk.setStage(ImportJobChunkEntity.STAGE_PUBLISHING);
        chunk.setChunkNo(chunkNo);
        chunk.setFromRowNo(fromRowNo);
        chunk.setToRowNo(toRowNo);
        chunk.setIdempotencyKey("import:" + jobId + ":publishing:" + fromRowNo + "-" + toRowNo);
        chunk.setStatus(ImportJobChunkEntity.STATUS_RUNNING);
        chunk.setAttemptCount(1);
        chunk.setStartedAt(LocalDateTime.now());
        return chunk;
    }

    private Long targetId(ImportJobRowEntity row) {
        Long targetId = row.getDraftTargetId() != null ? row.getDraftTargetId() : row.getDraftPersonId();
        if (targetId == null) {
            throw new BusinessException("IMPORT_JOB_DRAFT_TARGET_MISSING", "导入批次存在未关联业务草稿的数据行");
        }
        return targetId;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private int value(Integer value) {
        return value == null ? 0 : value;
    }

    private int value(Integer value, int fallback) {
        return value == null ? fallback : value;
    }

    private int safeInt(long number) {
        return number > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) number;
    }
}
