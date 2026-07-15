package com.genealogy.source.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationRiskPolicy;
import com.genealogy.source.dto.SourceAttachmentFileResponse;
import com.genealogy.source.dto.SourceAttachmentResponse;
import com.genealogy.source.entity.SourceAttachmentEntity;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceAttachmentRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SourceAttachmentApplicationServiceTest {

    @TempDir
    private Path tempDir;

    @Mock
    private SourceRepository sourceRepository;

    @Mock
    private SourceAttachmentRepository sourceAttachmentRepository;

    @Mock
    private OperationLogApplicationService operationLogApplicationService;

    @Mock
    private AuthorizationApplicationService authorizationApplicationService;

    private SourceAttachmentApplicationService service;

    @BeforeEach
    void setUp() {
        service = new SourceAttachmentApplicationService(
                sourceRepository,
                sourceAttachmentRepository,
                operationLogApplicationService,
                authorizationApplicationService,
                tempDir.toString()
        );
    }

    @Test
    void uploadShouldStoreFileAndReturnSafeResponse() {
        SourceEntity source = source();
        AtomicReference<SourceAttachmentEntity> savedRef = new AtomicReference<>();
        when(sourceRepository.findById(10L)).thenReturn(Optional.of(source));
        when(sourceAttachmentRepository.save(any(SourceAttachmentEntity.class))).thenAnswer(invocation -> {
            SourceAttachmentEntity entity = invocation.getArgument(0);
            entity.setId(30L);
            savedRef.set(entity);
            return entity;
        });
        when(authorizationApplicationService.can(1L, 2L, "attachment:preview")).thenReturn(true);

        MockMultipartFile file = new MockMultipartFile("file", "族谱.pdf", "application/pdf", "hello".getBytes());

        SourceAttachmentResponse response = service.upload(10L, file, "private", "sensitive", 2L, "req-1", "127.0.0.1");

        assertThat(response.id()).isEqualTo(30L);
        assertThat(response.fileName()).isEqualTo("族谱.pdf");
        assertThat(response.privacyLevel()).isEqualTo("private");
        assertThat(response.sensitiveLevel()).isEqualTo("sensitive");
        assertThat(response.previewAllowed()).isTrue();
        assertThat(response.downloadAllowed()).isFalse();
        assertThat(savedRef.get().getStoragePath()).isNotBlank();
        assertThat(savedRef.get().getChecksum()).isNotBlank();
        assertThat(Files.exists(Path.of(savedRef.get().getStoragePath()))).isTrue();
        verify(operationLogApplicationService).record(1L, 2L, "source_attachment_upload", "source_attachment", 30L, "upload source attachment: 族谱.pdf", "sourceId=10; privacyLevel=private; sensitiveLevel=sensitive", "req-1", "127.0.0.1");
    }

    @Test
    void previewHighlySensitiveAttachmentShouldWriteExplicitRiskAudit() throws Exception {
        SourceAttachmentEntity attachment = attachment("highly_sensitive");
        Path filePath = tempDir.resolve("secure.pdf");
        Files.writeString(filePath, "secure-content");
        attachment.setStoragePath(filePath.toString());

        when(sourceAttachmentRepository.findByIdAndDeletedAtIsNull(30L)).thenReturn(Optional.of(attachment));
        when(authorizationApplicationService.can(1L, 2L, "attachment:preview")).thenReturn(false);
        when(authorizationApplicationService.can(1L, 2L, "attachment:view")).thenReturn(false);
        when(authorizationApplicationService.can(1L, 2L, "attachment:download")).thenReturn(true);

        SourceAttachmentFileResponse response = service.preview(30L, 2L, "req-2", "127.0.0.1");

        assertThat(response.fileName()).isEqualTo("old-book.pdf");
        assertThat(new String(response.content())).isEqualTo("secure-content");
        verify(operationLogApplicationService).recordRisk(
                1L,
                2L,
                "source_attachment_preview",
                "source_attachment",
                30L,
                "preview source attachment: old-book.pdf",
                "sourceId=10; sensitiveLevel=highly_sensitive",
                "req-2",
                "127.0.0.1",
                OperationRiskPolicy.sensitiveAccess(true, false, null)
        );
    }

    @Test
    void previewNormalAttachmentShouldRemainOrdinaryAuditLog() throws Exception {
        SourceAttachmentEntity attachment = attachment("normal");
        Path filePath = tempDir.resolve("normal.pdf");
        Files.writeString(filePath, "normal-content");
        attachment.setStoragePath(filePath.toString());

        when(sourceAttachmentRepository.findByIdAndDeletedAtIsNull(30L)).thenReturn(Optional.of(attachment));
        when(authorizationApplicationService.can(1L, 2L, "attachment:preview")).thenReturn(true);

        service.preview(30L, 2L, "req-normal", "127.0.0.1");

        verify(operationLogApplicationService).record(
                1L,
                2L,
                "source_attachment_preview",
                "source_attachment",
                30L,
                "preview source attachment: old-book.pdf",
                "sourceId=10; sensitiveLevel=normal",
                "req-normal",
                "127.0.0.1"
        );
        verifyNoMoreInteractions(operationLogApplicationService);
    }

    @Test
    void listBySourceShouldReturnPagedAttachments() {
        SourceEntity source = source();
        SourceAttachmentEntity attachment = attachment("normal");
        when(sourceRepository.findById(10L)).thenReturn(Optional.of(source));
        when(sourceAttachmentRepository.findBySourceIdAndDeletedAtIsNullOrderByCreatedAtDesc(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(attachment), PageRequest.of(0, 20), 1));
        when(authorizationApplicationService.can(1L, 2L, "attachment:preview")).thenReturn(true);

        PageResponse<SourceAttachmentResponse> response = service.listBySource(10L, 1, 20, 2L);

        assertThat(response.total()).isEqualTo(1);
        assertThat(response.records()).hasSize(1);
        assertThat(response.records().get(0).fileName()).isEqualTo("old-book.pdf");
        assertThat(response.records().get(0).previewAllowed()).isTrue();
    }

    @Test
    void deleteShouldSoftDeleteAndAudit() {
        SourceAttachmentEntity attachment = attachment("normal");
        when(sourceAttachmentRepository.findByIdAndDeletedAtIsNull(30L)).thenReturn(Optional.of(attachment));
        when(sourceAttachmentRepository.save(any(SourceAttachmentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.delete(30L, 2L, "req-3", "127.0.0.1");

        assertThat(attachment.getDeletedAt()).isNotNull();
        verify(operationLogApplicationService).record(1L, 2L, "source_attachment_delete", "source_attachment", 30L, "delete source attachment: old-book.pdf", "sourceId=10", "req-3", "127.0.0.1");
    }

    private SourceEntity source() {
        SourceEntity source = new SourceEntity();
        source.setId(10L);
        source.setClanId(1L);
        source.setSourceName("张氏族谱卷一");
        return source;
    }

    private SourceAttachmentEntity attachment(String sensitiveLevel) {
        SourceAttachmentEntity attachment = new SourceAttachmentEntity();
        attachment.setId(30L);
        attachment.setSourceId(10L);
        attachment.setClanId(1L);
        attachment.setOriginalFilename("old-book.pdf");
        attachment.setStoredFilename("stored.pdf");
        attachment.setContentType("application/pdf");
        attachment.setFileSize(1024L);
        attachment.setStoragePath(tempDir.resolve("stored.pdf").toString());
        attachment.setChecksum("checksum");
        attachment.setUploadStatus("uploaded");
        attachment.setPrivacyLevel("clan_only");
        attachment.setSensitiveLevel(sensitiveLevel);
        attachment.setCreatedBy(2L);
        attachment.setCreatedAt(LocalDateTime.now());
        return attachment;
    }
}
