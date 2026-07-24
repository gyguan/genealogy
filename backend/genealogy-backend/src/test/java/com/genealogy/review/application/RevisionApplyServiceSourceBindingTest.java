package com.genealogy.review.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RevisionApplyServiceSourceBindingTest {
    @Mock PersonRepository personRepository;
    @Mock RelationshipRepository relationshipRepository;
    @Mock SourceRepository sourceRepository;
    @Mock BranchRepository branchRepository;
    @Mock GenSchemeRepository genSchemeRepository;
    @Mock ImportJobRepository importJobRepository;
    @Mock ImportJobRowRepository importJobRowRepository;
    @Mock SourceBindingRepository sourceBindingRepository;

    private RevisionApplyService service(ObjectMapper mapper) {
        RevisionApplyService service = new RevisionApplyService(personRepository, relationshipRepository, sourceRepository,
      branchRepository, genSchemeRepository, importJobRepository, importJobRowRepository, mapper);
        service.setSourceBindingRepository(sourceBindingRepository);
        return service;
    }

    @Test
    void appliesSourceBindingCreateFromUnifiedReviewTask() throws Exception {
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        SourceBindingEntity payload = new SourceBindingEntity();
        payload.setSourceId(31L); payload.setTargetType("person"); payload.setTargetId(186L);
        payload.setBindingReason("族谱记载"); payload.setExcerpt("人物条目"); payload.setConfidenceLevel("high");
        when(sourceBindingRepository.existsBySourceIdAndTargetTypeAndTargetIdAndBindingStatusNot(31L, "person", 186L, "archived")).thenReturn(false);
        AuditRecordEntity revision = new AuditRecordEntity();
        revision.setTargetType("source_binding"); revision.setTargetId(31L); revision.setClanId(4L);
        revision.setChangeType("create"); revision.setSubmitterId(9L); revision.setNewPayload(mapper.writeValueAsString(payload));
        LocalDateTime time = LocalDateTime.of(2026, 7, 24, 14, 10);
        service(mapper).apply(revision, time);
        ArgumentCaptor<SourceBindingEntity> captor = ArgumentCaptor.forClass(SourceBindingEntity.class);
        verify(sourceBindingRepository).save(captor.capture());
        SourceBindingEntity saved = captor.getValue();
        assertThat(saved.getId()).isNull(); assertThat(saved.getClanId()).isEqualTo(4L);
        assertThat(saved.getBindingStatus()).isEqualTo("official"); assertThat(saved.getCreatedBy()).isEqualTo(9L);
        assertThat(saved.getUpdatedAt()).isEqualTo(time);
    }

    @Test
    void appliesSourceBindingReplaceAndPreservesCreationMetadata() throws Exception {
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 20, 9, 0);
        SourceBindingEntity current = new SourceBindingEntity();
        current.setId(44L); current.setClanId(4L); current.setSourceId(31L); current.setTargetType("person"); current.setTargetId(186L);
        current.setBindingStatus("official"); current.setCreatedBy(7L); current.setCreatedAt(createdAt);
        SourceBindingEntity payload = new SourceBindingEntity();
        payload.setSourceId(32L); payload.setTargetType("person"); payload.setTargetId(186L); payload.setConfidenceLevel("medium");
        when(sourceBindingRepository.findById(44L)).thenReturn(Optional.of(current));
        when(sourceBindingRepository.existsBySourceIdAndTargetTypeAndTargetIdAndBindingStatusNot(32L, "person", 186L, "archived")).thenReturn(false);
        AuditRecordEntity revision = new AuditRecordEntity();
        revision.setTargetType("source_binding"); revision.setTargetId(44L); revision.setClanId(4L);
        revision.setChangeType("replace"); revision.setNewPayload(mapper.writeValueAsString(payload));
        service(mapper).apply(revision, LocalDateTime.of(2026, 7, 24, 14, 15));
        ArgumentCaptor<SourceBindingEntity> captor = ArgumentCaptor.forClass(SourceBindingEntity.class);
        verify(sourceBindingRepository).save(captor.capture());
        assertThat(captor.getValue().getId()).isEqualTo(44L);
        assertThat(captor.getValue().getCreatedBy()).isEqualTo(7L);
        assertThat(captor.getValue().getCreatedAt()).isEqualTo(createdAt);
        assertThat(captor.getValue().getBindingStatus()).isEqualTo("official");
    }

    @Test
    void archivesSourceBindingOnDelete() {
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        SourceBindingEntity current = new SourceBindingEntity();
        current.setId(44L); current.setClanId(4L); current.setBindingStatus("official");
        when(sourceBindingRepository.findById(44L)).thenReturn(Optional.of(current));
        AuditRecordEntity revision = new AuditRecordEntity();
        revision.setTargetType("source_binding"); revision.setTargetId(44L); revision.setClanId(4L); revision.setChangeType("delete");
        LocalDateTime time = LocalDateTime.of(2026, 7, 24, 14, 20);
        service(mapper).apply(revision, time);
        assertThat(current.getBindingStatus()).isEqualTo("archived"); assertThat(current.getUpdatedAt()).isEqualTo(time);
        verify(sourceBindingRepository).save(current);
    }
}
