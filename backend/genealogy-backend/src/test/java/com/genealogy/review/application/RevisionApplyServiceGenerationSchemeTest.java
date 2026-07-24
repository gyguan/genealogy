package com.genealogy.review.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class RevisionApplyServiceGenerationSchemeTest {

    @Mock PersonRepository personRepository;
    @Mock RelationshipRepository relationshipRepository;
    @Mock SourceRepository sourceRepository;
    @Mock BranchRepository branchRepository;
    @Mock GenSchemeRepository genSchemeRepository;
    @Mock ImportJobRepository importJobRepository;
    @Mock ImportJobRowRepository importJobRowRepository;

    @Test
    void appliesWrappedGenerationSchemeSnapshotWithoutLosingRequiredFields() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        RevisionApplyService service = new RevisionApplyService(
                personRepository,
                relationshipRepository,
                sourceRepository,
                branchRepository,
                genSchemeRepository,
                importJobRepository,
                importJobRowRepository,
                objectMapper
        );

        GenerationSchemeEntity scheme = new GenerationSchemeEntity();
        scheme.setId(23L);
        scheme.setClanId(14L);
        scheme.setBranchId(7L);
        scheme.setSchemeName("敦本堂字辈");
        scheme.setPoemText("敦本承先志");
        scheme.setStartGeneration(12);
        scheme.setIsDefault(true);
        scheme.setValidationEnabled(true);
        scheme.setStrictMode(false);
        scheme.setStatus("pending_review");
        scheme.setCreatedAt(LocalDateTime.of(2026, 7, 23, 10, 0));

        AuditRecordEntity revision = new AuditRecordEntity();
        revision.setTargetType("generation_scheme");
        revision.setTargetId(23L);
        revision.setClanId(14L);
        revision.setNewPayload(objectMapper.writeValueAsString(Map.of(
                "scheme", scheme,
                "words", List.of(Map.of("generationNo", 12, "word", "敦"))
        )));

        service.apply(revision, LocalDateTime.of(2026, 7, 23, 11, 0));

        ArgumentCaptor<GenerationSchemeEntity> captor = ArgumentCaptor.forClass(GenerationSchemeEntity.class);
        verify(genSchemeRepository).save(captor.capture());
        GenerationSchemeEntity saved = captor.getValue();
        assertThat(saved.getId()).isEqualTo(23L);
        assertThat(saved.getClanId()).isEqualTo(14L);
        assertThat(saved.getBranchId()).isEqualTo(7L);
        assertThat(saved.getSchemeName()).isEqualTo("敦本堂字辈");
        assertThat(saved.getPoemText()).isEqualTo("敦本承先志");
        assertThat(saved.getStartGeneration()).isEqualTo(12);
        assertThat(saved.getIsDefault()).isTrue();
        assertThat(saved.getValidationEnabled()).isTrue();
        assertThat(saved.getStrictMode()).isFalse();
        assertThat(saved.getStatus()).isEqualTo("official");
        assertThat(saved.getCreatedAt()).isEqualTo(LocalDateTime.of(2026, 7, 23, 10, 0));
    }
}
