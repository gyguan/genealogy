package com.genealogy.source.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.source.application.AttachmentFileApplicationService;
import com.genealogy.source.application.SourceEvidenceApplicationService;
import com.genealogy.source.dto.AttachmentCreateRequest;
import com.genealogy.source.dto.AttachmentFileDownload;
import com.genealogy.source.dto.AttachmentResponse;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class SourceEvidenceController {

    private final SourceEvidenceApplicationService sourceEvidenceApplicationService;
    private final AttachmentFileApplicationService attachmentFileApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public SourceEvidenceController(
            SourceEvidenceApplicationService sourceEvidenceApplicationService,
            AttachmentFileApplicationService attachmentFileApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.sourceEvidenceApplicationService = sourceEvidenceApplicationService;
        this.attachmentFileApplicationService = attachmentFileApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/source-bindings")
    public ApiResponse<SourceBindingResponse> bind(
            @Valid @RequestBody SourceBindingCreateRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        request = new SourceBindingCreateRequest(
                request.sourceId(), request.targetType(), request.targetId(), request.bindingReason(), request.excerpt(), userId
        );
        return ApiResponse.success(sourceEvidenceApplicationService.bind(request));
    }

    @GetMapping("/source-bindings")
    public ApiResponse<List<SourceBindingResponse>> listByTarget(
            @RequestParam String targetType,
            @Positive @RequestParam Long targetId
    ) {
        return ApiResponse.success(sourceEvidenceApplicationService.listByTarget(targetType, targetId));
    }

    @GetMapping("/sources/{sourceId}/bindings")
    public ApiResponse<List<SourceBindingResponse>> listBySource(@Positive @PathVariable Long sourceId) {
        return ApiResponse.success(sourceEvidenceApplicationService.listBySource(sourceId));
    }

    @DeleteMapping("/source-bindings/{bindingId}")
    public ApiResponse<Void> unbind(
            @Positive @PathVariable Long bindingId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        sourceEvidenceApplicationService.unbind(bindingId, actorId);
        return ApiResponse.success();
    }

    @PostMapping("/attachments")
    public ApiResponse<AttachmentResponse> createAttachment(
            @Valid @RequestBody AttachmentCreateRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        request = new AttachmentCreateRequest(
                request.clanId(), request.sourceId(), request.fileName(), request.fileType(), request.fileSize(),
                request.storagePath(), request.thumbnailPath(), request.checksum(), userId, request.accessLevel()
        );
        return ApiResponse.success(sourceEvidenceApplicationService.createAttachment(request));
    }

    @PostMapping(value = "/clans/{clanId}/attachments/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<AttachmentResponse> uploadAttachment(
            @Positive @PathVariable Long clanId,
            @RequestParam(required = false) Long sourceId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String accessLevel,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireClanMember(clanId, authorization);
        return ApiResponse.success(attachmentFileApplicationService.upload(clanId, sourceId, file, actorId, accessLevel));
    }

    @GetMapping("/attachments/{attachmentId}/download")
    public ResponseEntity<byte[]> downloadAttachment(
            @Positive @PathVariable Long attachmentId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        AttachmentFileDownload download = attachmentFileApplicationService.download(attachmentId, actorId);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(download.fileName(), StandardCharsets.UTF_8)
                .build();
        MediaType mediaType = download.fileType() == null || download.fileType().isBlank()
                ? MediaType.APPLICATION_OCTET_STREAM
                : MediaType.parseMediaType(download.fileType());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(mediaType)
                .body(download.content());
    }

    @GetMapping("/sources/{sourceId}/attachments")
    public ApiResponse<List<AttachmentResponse>> listAttachmentsBySource(@Positive @PathVariable Long sourceId) {
        return ApiResponse.success(sourceEvidenceApplicationService.listAttachmentsBySource(sourceId));
    }
}
