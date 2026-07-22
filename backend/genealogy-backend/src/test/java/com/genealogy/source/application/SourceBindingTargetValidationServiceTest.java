package com.genealogy.source.application;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.entity.GenerationWordEntity;
import com.genealogy.generation.repository.GenerationSchemeRepository;
import com.genealogy.generation.repository.GenerationWordRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SourceBindingTargetValidationServiceTest {

    @Mock private GenerationWordRepository generationWordRepository;
    @Mock private GenerationSchemeRepository generationSchemeRepository;
    @Mock private PersonRepository personRepository;
    @Mock private RelationshipRepository relationshipRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private ClanRepository clanRepository;

    private SourceBindingTargetValidationService service;

    @BeforeEach
    void setUp() {
        service = new SourceBindingTargetValidationService(
                generationWordRepository,
                generationSchemeRepository,
                personRepository,
                relationshipRepository,
                branchRepository,
                clanRepository
        );
    }

    @Test
    void validateShouldAcceptGenerationWordFromExplicitlyApprovedScheme() {
        GenerationWordEntity word = generationWord(100L, 200L);
        GenerationSchemeEntity scheme = generationScheme(200L, 1L, "approved");
        when(generationWordRepository.findById(100L)).thenReturn(Optional.of(word));
        when(generationSchemeRepository.findByIdAndClanId(200L, 1L)).thenReturn(Optional.of(scheme));

        assertThatCode(() -> service.validate(1L, "generation_word", 100L)).doesNotThrowAnyException();
    }

    @Test
    void validateShouldRejectGenerationWordFromDraftScheme() {
        GenerationWordEntity word = generationWord(100L, 200L);
        GenerationSchemeEntity scheme = generationScheme(200L, 1L, "draft");
        when(generationWordRepository.findById(100L)).thenReturn(Optional.of(word));
        when(generationSchemeRepository.findByIdAndClanId(200L, 1L)).thenReturn(Optional.of(scheme));

        assertThatThrownBy(() -> service.validate(1L, "generation_word", 100L))
                .hasMessageContaining("字辈方案审核通过后才能绑定来源资料");
    }

    @Test
    void validateShouldAcceptOfficialPerson() {
        PersonEntity person = new PersonEntity();
        person.setId(300L);
        person.setClanId(1L);
        person.setDataStatus("official");
        when(personRepository.findByIdAndDeletedAtIsNull(300L)).thenReturn(Optional.of(person));

        assertThatCode(() -> service.validate(1L, "person", 300L)).doesNotThrowAnyException();
    }

    @Test
    void validateShouldRejectDraftPerson() {
        PersonEntity person = new PersonEntity();
        person.setId(300L);
        person.setClanId(1L);
        person.setDataStatus("draft");
        when(personRepository.findByIdAndDeletedAtIsNull(300L)).thenReturn(Optional.of(person));

        assertThatThrownBy(() -> service.validate(1L, "person", 300L))
                .hasMessageContaining("人物审核通过后才能绑定来源资料");
    }

    @Test
    void validateShouldAcceptOfficialRelationship() {
        RelationshipEntity relationship = new RelationshipEntity();
        relationship.setId(400L);
        relationship.setClanId(1L);
        relationship.setDataStatus("official");
        when(relationshipRepository.findByIdAndClanIdAndDeletedAtIsNull(400L, 1L))
                .thenReturn(Optional.of(relationship));

        assertThatCode(() -> service.validate(1L, "relationship", 400L)).doesNotThrowAnyException();
    }

    @Test
    void validateShouldRejectDraftBranch() {
        BranchEntity branch = new BranchEntity();
        branch.setId(500L);
        branch.setClanId(1L);
        branch.setStatus("draft");
        when(branchRepository.findByIdAndClanId(500L, 1L)).thenReturn(Optional.of(branch));

        assertThatThrownBy(() -> service.validate(1L, "branch", 500L))
                .hasMessageContaining("支派审核通过后才能绑定来源资料");
    }

    @Test
    void validateShouldAcceptClanContainerTarget() {
        when(clanRepository.existsById(1L)).thenReturn(true);
        assertThatCode(() -> service.validate(1L, "clan", 1L)).doesNotThrowAnyException();
    }

    private GenerationWordEntity generationWord(Long id, Long schemeId) {
        GenerationWordEntity word = new GenerationWordEntity();
        word.setId(id);
        word.setSchemeId(schemeId);
        word.setGenerationNo(18);
        word.setWord("永");
        return word;
    }

    private GenerationSchemeEntity generationScheme(Long id, Long clanId, String status) {
        GenerationSchemeEntity scheme = new GenerationSchemeEntity();
        scheme.setId(id);
        scheme.setClanId(clanId);
        scheme.setSchemeName("黄氏通用字辈");
        scheme.setStatus(status);
        return scheme;
    }
}
