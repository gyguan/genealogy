package com.genealogy.source.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingResponse;
import com.genealogy.source.dto.SourceCreateRequest;
import com.genealogy.source.dto.SourceResponse;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SourceApplicationServiceTest {

    @Mock
    private SourceRepository sourceRepository;

    @Mock
    private SourceBindingRepository sourceBindingRepository;

    @Mock
    private ClanRepository clanRepository;

    @Mock
    private OperationLogApplicationService operationLogApplicationService;

    @Mock
    private AuthorizationApplicationService authorizationApplicationService;

    @InjectMocks
    private SourceApplicationService sourceApplicationService;

    @Test
    void createShouldApplySlice1Defaults() {
        when(clanRepository.existsById(1L)).thenReturn(true);
        when(sourceRepository.save(any(SourceEntity.class))).thenAnswer(invocation -> {
            SourceEntity entity = invocation.getArgument(0);
            entity.setId(10L);
            return entity;
        });

        SourceCreateRequest request = new SourceCreateRequest(
                "张氏族谱卷一",
                "genealogy_book",
                "修谱委员会",
                "张氏族谱",
                "卷一",
                "12",
                null,
                "谱文摘录",
                "资料说明",
                null,
                null,
                null,
                null
        );

        SourceResponse response = sourceApplicationService.create(1L, request, 2L, "req-1", "127.0.0.1");

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.verificationStatus()).isEqualTo("draft");
        assertThat(response.confidenceLevel()).isEqualTo("unknown");
        assertThat(response.privacyLevel()).isEqualTo("clan_only");
        assertThat(response.sensitiveLevel()).isEqualTo("normal");
        assertThat(response.updatedAt()).isNotNull();
    }

    @Test
    void bindShouldTreatLegacyVerifiedSourceAsOfficial() {
        SourceEntity legacySource = new SourceEntity();
        legacySource.setId(10L);
        legacySource.setClanId(1L);
        legacySource.setSourceName("张氏族谱卷一");
        legacySource.setSourceType("genealogy_book");
        legacySource.setVerificationStatus("verified");
        legacySource.setConfidenceLevel("high");
        legacySource.setPrivacyLevel("clan_only");
        legacySource.setSensitiveLevel("normal");
        legacySource.setCreatedAt(LocalDateTime.now().minusDays(1));

        when(clanRepository.existsById(1L)).thenReturn(true);
        when(sourceRepository.findById(10L)).thenReturn(Optional.of(legacySource));
        when(sourceBindingRepository.existsBySourceIdAndTargetTypeAndTargetId(10L, "person", 100L)).thenReturn(false);
        when(sourceBindingRepository.save(any(SourceBindingEntity.class))).thenAnswer(invocation -> {
            SourceBindingEntity entity = invocation.getArgument(0);
            entity.setId(20L);
            return entity;
        });

        SourceBindingCreateRequest request = new SourceBindingCreateRequest(
                10L,
                "person",
                100L,
                "族谱原文记录人物基础信息",
                "谱文摘录",
                null,
                null,
                null
        );

        SourceBindingResponse response = sourceApplicationService.bind(1L, request, 2L);

        assertThat(legacySource.getVerificationStatus()).isEqualTo("official");
        assertThat(response.bindingStatus()).isEqualTo("official");
        assertThat(response.confidenceLevel()).isEqualTo("high");
        assertThat(response.updatedAt()).isNotNull();
    }

    @Test
    void updateShouldNormalizeExplicitMetadata() {
        SourceEntity source = new SourceEntity();
        source.setId(10L);
        source.setClanId(1L);
        source.setSourceName("旧资料");
        source.setSourceType("genealogy_book");
        source.setVerificationStatus("rejected");
        source.setConfidenceLevel("unknown");
        source.setPrivacyLevel("clan_only");
        source.setSensitiveLevel("normal");
        source.setCreatedAt(LocalDateTime.now().minusDays(1));

        when(sourceRepository.findById(10L)).thenReturn(Optional.of(source));
        when(sourceRepository.save(any(SourceEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SourceCreateRequest request = new SourceCreateRequest(
                "新资料",
                "local_chronicle",
                null,
                null,
                null,
                null,
                "清光绪年间",
                null,
                "说明",
                "HIGH",
                "PRIVATE",
                "SENSITIVE",
                null
        );

        SourceResponse response = sourceApplicationService.update(10L, request, 2L);

        assertThat(response.sourceName()).isEqualTo("新资料");
        assertThat(response.confidenceLevel()).isEqualTo("high");
        assertThat(response.privacyLevel()).isEqualTo("private");
        assertThat(response.sensitiveLevel()).isEqualTo("sensitive");
        assertThat(response.updatedAt()).isNotNull();
    }
}
