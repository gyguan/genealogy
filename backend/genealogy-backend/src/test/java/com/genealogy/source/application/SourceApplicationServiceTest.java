package com.genealogy.source.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingResponse;
import com.genealogy.source.dto.SourceCreateRequest;
import com.genealogy.source.dto.SourceDetailResponse;
import com.genealogy.source.dto.SourceResponse;
import com.genealogy.source.dto.SourceSearchCriteria;
import com.genealogy.source.entity.SourceAttachmentEntity;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceAttachmentRepository;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
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
    private SourceAttachmentRepository sourceAttachmentRepository;

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
        assertThat(response.bindingCount()).isZero();
        assertThat(response.attachmentCount()).isZero();
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

    @Test
    void searchByClanShouldReturnPagedSourcesWithCounts() {
        SourceEntity source = new SourceEntity();
        source.setId(10L);
        source.setClanId(1L);
        source.setSourceName("支派口述访谈");
        source.setSourceType("oral_record");
        source.setVerificationStatus("verified");
        source.setConfidenceLevel("medium");
        source.setPrivacyLevel("clan_only");
        source.setSensitiveLevel("normal");
        source.setCreatedAt(LocalDateTime.now().minusDays(1));
        source.setUpdatedAt(LocalDateTime.now());

        when(clanRepository.existsById(1L)).thenReturn(true);
        when(sourceRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(source), PageRequest.of(0, 20), 1));
        when(sourceBindingRepository.countBySourceId(10L)).thenReturn(3);
        when(sourceAttachmentRepository.countBySourceIdAndDeletedAtIsNull(10L)).thenReturn(2);

        SourceSearchCriteria criteria = new SourceSearchCriteria(
                "口述",
                "oral_record",
                "verified",
                "clan_only",
                "person",
                true,
                true,
                "sourceName,asc"
        );

        PageResponse<SourceResponse> response = sourceApplicationService.searchByClan(1L, criteria, 1, 20, 2L);

        assertThat(response.total()).isEqualTo(1);
        assertThat(response.records()).hasSize(1);
        SourceResponse first = response.records().get(0);
        assertThat(first.sourceType()).isEqualTo("oral_history");
        assertThat(first.verificationStatus()).isEqualTo("official");
        assertThat(first.bindingCount()).isEqualTo(3);
        assertThat(first.attachmentCount()).isEqualTo(2);
    }

    @Test
    void getDetailShouldAggregatePermissionsBindingsAndAttachments() {
        SourceEntity source = new SourceEntity();
        source.setId(10L);
        source.setClanId(1L);
        source.setSourceName("张氏族谱卷一");
        source.setSourceType("genealogy_book");
        source.setVerificationStatus("official");
        source.setConfidenceLevel("high");
        source.setPrivacyLevel("clan_only");
        source.setSensitiveLevel("normal");
        source.setCreatedAt(LocalDateTime.now().minusDays(1));
        source.setUpdatedAt(LocalDateTime.now());

        SourceBindingEntity binding = new SourceBindingEntity();
        binding.setId(20L);
        binding.setSourceId(10L);
        binding.setTargetType("person");
        binding.setTargetId(100L);
        binding.setBindingReason("族谱原文记录人物基础信息");
        binding.setExcerpt("谱文摘录");
        binding.setConfidenceLevel("high");
        binding.setBindingStatus("official");
        binding.setCreatedBy(2L);
        binding.setCreatedAt(LocalDateTime.now());

        SourceAttachmentEntity attachment = new SourceAttachmentEntity();
        attachment.setId(30L);
        attachment.setSourceId(10L);
        attachment.setOriginalFilename("old-book.pdf");
        attachment.setContentType("application/pdf");
        attachment.setFileSize(1024L);
        attachment.setUploadStatus("uploaded");
        attachment.setCreatedBy(2L);
        attachment.setCreatedAt(LocalDateTime.now());

        when(sourceRepository.findById(10L)).thenReturn(Optional.of(source));
        when(sourceBindingRepository.countBySourceId(10L)).thenReturn(1);
        when(sourceAttachmentRepository.countBySourceIdAndDeletedAtIsNull(10L)).thenReturn(1);
        when(sourceBindingRepository.findTop5BySourceIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(binding));
        when(sourceAttachmentRepository.findTop5BySourceIdAndDeletedAtIsNullOrderByCreatedAtDesc(10L)).thenReturn(List.of(attachment));
        when(authorizationApplicationService.can(1L, 2L, "source:bind")).thenReturn(true);
        when(authorizationApplicationService.can(1L, 2L, "attachment:view")).thenReturn(true);
        when(authorizationApplicationService.can(1L, 2L, "attachment:download")).thenReturn(true);

        SourceDetailResponse response = sourceApplicationService.getDetail(10L, 2L);

        assertThat(response.source().id()).isEqualTo(10L);
        assertThat(response.source().bindingCount()).isEqualTo(1);
        assertThat(response.source().attachmentCount()).isEqualTo(1);
        assertThat(response.permissions().canBind()).isTrue();
        assertThat(response.permissions().canPreviewAttachment()).isTrue();
        assertThat(response.permissions().canDownloadAttachment()).isTrue();
        assertThat(response.bindingSummaries()).hasSize(1);
        assertThat(response.bindingSummaries().get(0).targetDisplayName()).isEqualTo("person:100");
        assertThat(response.attachmentSummaries()).hasSize(1);
        assertThat(response.attachmentSummaries().get(0).fileName()).isEqualTo("old-book.pdf");
        assertThat(response.attachmentSummaries().get(0).downloadAllowed()).isTrue();
    }
}
