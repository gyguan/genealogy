package com.genealogy.review.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Primary
@Service
public class AsyncAwareRevisionApplyService extends RevisionApplyService {

    private static final String TARGET_IMPORT_JOB = "import_job";

    private final ImportJobRepository importJobRepository;

    public AsyncAwareRevisionApplyService(
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            SourceRepository sourceRepository,
            BranchRepository branchRepository,
            GenSchemeRepository genSchemeRepository,
            ImportJobRepository importJobRepository,
            ImportJobRowRepository importJobRowRepository,
            ObjectMapper objectMapper
    ) {
        super(
                personRepository,
                relationshipRepository,
                sourceRepository,
                branchRepository,
                genSchemeRepository,
                importJobRepository,
                importJobRowRepository,
                objectMapper
        );
        this.importJobRepository = importJobRepository;
    }

    @Override
    @Transactional
    public void apply(AuditRecordEntity revision, LocalDateTime applyTime) {
        if (isAsyncImport(revision)) {
            queuePublishing(revision, applyTime);
            return;
        }
        super.apply(revision, applyTime);
    }

    @Override
    @Transactional
    public void reject(AuditRecordEntity revision, LocalDateTime rejectTime) {
        boolean asyncImport = isAsyncImport(revision);
        super.reject(revision, rejectTime);
        if (asyncImport) {
            importJobRepository.findByIdAndClanId(revision.getTargetId(), revision.getClanId()).ifPresent(job -> {
                job.setExecutionStatus(ImportJobEntity.EXECUTION_COMPLETED);
                job.setExecutionStage(ImportJobEntity.STAGE_COMPLETED);
                job.setCompletedAt(rejectTime);
                job.setLeaseOwner(null);
                job.setLeaseExpiresAt(null);
                job.setUpdatedAt(rejectTime);
                importJobRepository.save(job);
            });
        }
    }

    private boolean isAsyncImport(AuditRecordEntity revision) {
        if (!TARGET_IMPORT_JOB.equals(normalize(revision.getTargetType()))) return false;
        return importJobRepository.findByIdAndClanId(revision.getTargetId(), revision.getClanId())
                .map(ImportJobEntity::isAsyncExecution)
                .orElse(false);
    }

    private void queuePublishing(AuditRecordEntity revision, LocalDateTime applyTime) {
        ImportJobEntity job = importJobRepository.findByIdAndClanId(revision.getTargetId(), revision.getClanId())
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_NOT_FOUND", "导入批次不存在"));
        if (!ImportJobEntity.REVIEW_PENDING.equals(job.getReviewStatus())) {
            throw new BusinessException("IMPORT_JOB_REVIEW_NOT_PENDING", "导入批次不是待审核状态");
        }
        job.setReviewStatus(ImportJobEntity.REVIEW_APPROVED);
        job.setExecutionStatus(ImportJobEntity.EXECUTION_QUEUED);
        job.setExecutionStage(ImportJobEntity.STAGE_PUBLISHING);
        job.setPublishedCount(0);
        job.setRequestedAction(null);
        job.setFailureStage(null);
        job.setLastErrorCode(null);
        job.setExecutionRetryCount(0);
        job.setNextRetryAt(null);
        job.setManualInterventionRequired(false);
        job.setCompletedAt(null);
        job.setHeartbeatAt(applyTime);
        job.setUpdatedAt(applyTime);
        importJobRepository.save(job);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
