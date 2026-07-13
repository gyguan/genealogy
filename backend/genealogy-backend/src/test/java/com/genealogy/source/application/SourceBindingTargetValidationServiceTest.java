package com.genealogy.source.application;

import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.entity.GenerationWordEntity;
import com.genealogy.generation.repository.GenerationSchemeRepository;
import com.genealogy.generation.repository.GenerationWordRepository;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SourceBindingTargetValidationServiceTest {

    @Mock
    private SourceRepository sourceRepository;

    @Mock
    private GenerationWordRepository generationWordRepository;

    @Mock
    private GenerationSchemeRepository generationSchemeRepository;

    private SourceBindingTargetValidationService service;

    @BeforeEach
    void setUp() {
        service = new SourceBindingTargetValidationService(
                sourceRepository,
                generationWordRepository,
                generationSchemeRepository
        );
    }

    @Test
    void validateShouldAcceptGenerationWordFromOfficialScheme() {
        GenerationWordEntity word = generationWord(100L, 200L);
        GenerationSchemeEntity scheme = generationScheme(200L, 1L, "official");
        when(generationWordRepository.findById(100L)).thenReturn(Optional.of(word));
        when(generationSchemeRepository.findByIdAndClanId(200L, 1L)).thenReturn(Optional.of(scheme));

        assertThatCode(() -> service.validate(1L, generationWordRequest()))
                .doesNotThrowAnyException();
    }

    @Test
    void validateShouldRejectMissingGenerationWord() {
        when(generationWordRepository.findById(100L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.validate(1L, generationWordRequest()))
                .hasMessageContaining("字辈明细不存在");
    }

    @Test
    void validateShouldRejectGenerationWordFromAnotherClan() {
        SourceEntity source = new SourceEntity();
        source.setId(10L);
        source.setClanId(1L);
        GenerationWordEntity word = generationWord(100L, 200L);
        when(sourceRepository.findById(10L)).thenReturn(Optional.of(source));
        when(generationWordRepository.findById(100L)).thenReturn(Optional.of(word));
        when(generationSchemeRepository.findByIdAndClanId(200L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.validate(generationWordRequest()))
                .hasMessageContaining("字辈不属于当前宗族");
    }

    @Test
    void validateShouldRejectGenerationWordFromDraftScheme() {
        GenerationWordEntity word = generationWord(100L, 200L);
        GenerationSchemeEntity scheme = generationScheme(200L, 1L, "draft");
        when(generationWordRepository.findById(100L)).thenReturn(Optional.of(word));
        when(generationSchemeRepository.findByIdAndClanId(200L, 1L)).thenReturn(Optional.of(scheme));

        assertThatThrownBy(() -> service.validate(1L, generationWordRequest()))
                .hasMessageContaining("字辈方案审核通过后才能绑定来源资料");
    }

    @Test
    void validateShouldIgnoreOtherTargetTypes() {
        SourceBindingCreateRequest personRequest = new SourceBindingCreateRequest(10L, "person", 300L, "reason", "excerpt", 2L);

        assertThatCode(() -> service.validate(1L, personRequest))
                .doesNotThrowAnyException();
        verifyNoInteractions(sourceRepository, generationWordRepository, generationSchemeRepository);
    }

    private SourceBindingCreateRequest generationWordRequest() {
        return new SourceBindingCreateRequest(10L, "generation_word", 100L, "reason", "excerpt", 2L);
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
