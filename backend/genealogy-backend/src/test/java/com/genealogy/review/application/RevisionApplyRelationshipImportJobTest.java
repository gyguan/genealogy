package com.genealogy.review.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RevisionApplyRelationshipImportJobTest {

    @Mock private PersonRepository personRepository;
    @Mock private RelationshipRepository relationshipRepository;
    @Mock private SourceRepository sourceRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private GenSchemeRepository genSchemeRepository;
    @Mock private ImportJobRepository importJobRepository;
    @Mock private ImportJobRowRepository importJobRowRepository;

    private RevisionApplyService service;

    @BeforeEach
    void setUp() {
        service = new RevisionApplyService(
                personRepository,
                relationshipRepository,
                sourceRepository,
                branchRepository,
                genSchemeRepository,
                importJobRepository,
                importJobRowRepository,
                new ObjectMapper()
        );
    }

    @Test
    void approvalShouldPublishRelationshipDraftAndBatch() {
        ImportJobEntity job = pendingJob();
        ImportJobRowEntity row = draftRow();
        RelationshipEntity relationship = pendingRelationship();
        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.findByJobIdAndRowStatusOrderByRowNoAsc(101L, ImportJobRowEntity.STATUS_DRAFT_CREATED))
                .thenReturn(List.of(row));
        when(relationshipRepository.findByIdAndClanIdAndDeletedAtIsNull(501L, 1L)).thenReturn(Optional.of(relationship));

        LocalDateTime now = LocalDateTime.now();
        service.apply(revision(), now);

        assertThat(relationship.getDataStatus()).isEqualTo("official");
        assertThat(job.getReviewStatus()).isEqualTo(ImportJobEntity.REVIEW_APPROVED);
        verify(relationshipRepository).saveAll(List.of(relationship));
        verify(importJobRepository).save(job);
    }

    @Test
    void rejectionShouldRestoreRelationshipDraftAndBatch() {
        ImportJobEntity job = pendingJob();
        ImportJobRowEntity row = draftRow();
        RelationshipEntity relationship = pendingRelationship();
        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.findByJobIdAndRowStatusOrderByRowNoAsc(101L, ImportJobRowEntity.STATUS_DRAFT_CREATED))
                .thenReturn(List.of(row));
        when(relationshipRepository.findByIdAndClanIdAndDeletedAtIsNull(501L, 1L)).thenReturn(Optional.of(relationship));

        service.reject(revision(), LocalDateTime.now());

        assertThat(relationship.getDataStatus()).isEqualTo("draft");
        assertThat(job.getReviewStatus()).isEqualTo(ImportJobEntity.REVIEW_REJECTED);
    }

    private AuditRecordEntity revision() {
        AuditRecordEntity revision = new AuditRecordEntity();
        revision.setClanId(1L);
        revision.setTargetType("import_job");
        revision.setTargetId(101L);
        return revision;
    }

    private ImportJobEntity pendingJob() {
        ImportJobEntity job = new ImportJobEntity();
        job.setId(101L);
        job.setClanId(1L);
        job.setBranchId(5L);
        job.setImportType(ImportJobEntity.TYPE_RELATIONSHIP);
        job.setReviewStatus(ImportJobEntity.REVIEW_PENDING);
        return job;
    }

    private ImportJobRowEntity draftRow() {
        ImportJobRowEntity row = new ImportJobRowEntity();
        row.setJobId(101L);
        row.setRowStatus(ImportJobRowEntity.STATUS_DRAFT_CREATED);
        row.setDraftTargetType(ImportJobEntity.TYPE_RELATIONSHIP);
        row.setDraftTargetId(501L);
        return row;
    }

    private RelationshipEntity pendingRelationship() {
        RelationshipEntity relationship = new RelationshipEntity();
        relationship.setId(501L);
        relationship.setClanId(1L);
        relationship.setFromPersonId(11L);
        relationship.setToPersonId(12L);
        relationship.setRelationType("parent_child");
        relationship.setDataStatus("pending_review");
        return relationship;
    }
}
