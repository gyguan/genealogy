package com.genealogy.generation.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.generation.repository.GenWordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GenerationApplicationServiceDeleteTest {

    @Mock
    private GenSchemeRepository schemeRepository;
    @Mock
    private GenWordRepository wordRepository;
    @Mock
    private ClanRepository clanRepository;
    @Mock
    private AuthorizationApplicationService authorizationApplicationService;

    private GenerationApplicationService service;

    @BeforeEach
    void setUp() {
        service = new GenerationApplicationService(
                schemeRepository,
                wordRepository,
                clanRepository,
                authorizationApplicationService
        );
    }

    @Test
    void draftSchemeDeletesWordsBeforeScheme() {
        GenerationSchemeEntity scheme = scheme("draft");
        when(schemeRepository.findById(31L)).thenReturn(Optional.of(scheme));

        assertThatCode(() -> service.deleteScheme(31L, 9L)).doesNotThrowAnyException();

        verify(authorizationApplicationService).requireBranchWriteScope(1L, 9L, 7L);
        verify(wordRepository).deleteBySchemeId(31L);
        verify(schemeRepository).delete(scheme);
    }

    @Test
    void rejectedSchemeCannotBeDeletedDirectly() {
        GenerationSchemeEntity scheme = scheme("rejected");
        when(schemeRepository.findById(31L)).thenReturn(Optional.of(scheme));

        assertThatThrownBy(() -> service.deleteScheme(31L, 9L))
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("GENERATION_SCHEME_DELETE_DRAFT_ONLY"))
                .hasMessage("仅草稿字辈方案可直接删除");

        verify(authorizationApplicationService).requireBranchWriteScope(1L, 9L, 7L);
        verify(wordRepository, never()).deleteBySchemeId(31L);
        verify(schemeRepository, never()).delete(scheme);
    }

    private GenerationSchemeEntity scheme(String status) {
        GenerationSchemeEntity scheme = new GenerationSchemeEntity();
        scheme.setId(31L);
        scheme.setClanId(1L);
        scheme.setBranchId(7L);
        scheme.setSchemeName("测试字辈");
        scheme.setStatus(status);
        return scheme;
    }
}
