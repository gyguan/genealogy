package com.genealogy.review.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RevisionApplyImportJobTest {

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
    void approvalShouldPublishAllImportedPersonsAndBatch() {
        ImportJobEntity job = pendingJob();
        ImportJobRowEntity row = draftRow(1001L);
        PersonEntity person = pendingPerson(1001L);
        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.findByJobIdAndRowStatusOrderByRowNoAsc(101L, ImportJobRowEntity.STATUS_DRAFT_CREATED)).thenReturn(List.of(row));
        when(personRepository.findByIdAndDeletedAtIsNull(1001L)).thenReturn(Optional.of(person));

        LocalDateTime now = LocalDateTime.now();
        service.apply(revision(), now);

        assertThat(person.getDataStatus()).isEqualTo("official");
        assertThat(person.getUpdatedAt()).isEqualTo(now);
        assertThat(job.getReviewStatus()).isEqualTo(ImportJobEntity.REVIEW_APPROVED);
        verify(personRepository).saveAll(List.of(person));
        verify(importJobRepository).save(job);
    }

    @Test
    void rejectionShouldRestoreDraftPersonsAndKeepBatchForResubmission() {
        ImportJobEntity job = pendingJob();
        ImportJobRowEntity row = draftRow(1001L);
        PersonEntity person = pendingPerson(1001L);
        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.findByJobIdAndRowStatusOrderByRowNoAsc(101L, ImportJobRowEntity.STATUS_DRAFT_CREATED)).thenReturn(List.of(row));
        when(personRepository.findByIdAndDeletedAtIsNull(1001L)).thenReturn(Optional.of(person));

        service.reject(revision(), LocalDateTime.now());

        assertThat(person.getDataStatus()).isEqualTo("draft");
        assertThat(job.getReviewStatus()).isEqualTo(ImportJobEntity.REVIEW_REJECTED);
        verify(personRepository).saveAll(List.of(person));
        verify(importJobRepository).save(job);
    }

    @Test
    void missingPersonShouldAbortApprovalBeforeAnyBatchUpdate() {
        ImportJobEntity job = pendingJob();
        ImportJobRowEntity row = draftRow(1001L);
        when(importJobRepository.findByIdAndClanId(101L, 1L)).thenReturn(Optional.of(job));
        when(importJobRowRepository.findByJobIdAndRowStatusOrderByRowNoAsc(101L, ImportJobRowEntity.STATUS_DRAFT_CREATED)).thenReturn(List.of(row));
        when(personRepository.findByIdAndDeletedAtIsNull(1001L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.apply(revision(), LocalDateTime.now()))
                .isInstanceOf(BusinessException.class)
                .hasMessage("导入批次关联的人物草稿不存在");

        verify(personRepository, never()).saveAll(any());
        verify(importJobRepository, never()).save(any(ImportJobEntity.class));
        assertThat(job.getReviewStatus()).isEqualTo(ImportJobEntity.REVIEW_PENDING);
    }

    private AuditRecordEntity revision() {
        AuditRecordEntity revision = new AuditRecordEntity();
        revision.setId(301L);
        revision.setClanId(1L);
        revision.setTargetType("import_job");
        revision.setTargetId(101L);
        revision.setStatus("pending");
        return revision;
    }

    private ImportJobEntity pendingJob() {
        ImportJobEntity job = new ImportJobEntity();
        job.setId(101L);
        job.setClanId(1L);
        job.setBranchId(5L);
        job.setReviewStatus(ImportJobEntity.REVIEW_PENDING);
        job.setUpdatedAt(LocalDateTime.now().minusMinutes(1));
        return job;
    }

    private ImportJobRowEntity draftRow(Long personId) {
        ImportJobRowEntity row = new ImportJobRowEntity();
        row.setJobId(101L);
        row.setRowNo(2);
        row.setRowStatus(ImportJobRowEntity.STATUS_DRAFT_CREATED);
        row.setDraftPersonId(personId);
        return row;
    }

    private PersonEntity pendingPerson(Long id) {
        PersonEntity person = new PersonEntity();
        person.setId(id);
        person.setClanId(1L);
        person.setBranchId(5L);
        person.setDataStatus("pending_review");
        return person;
    }
}
