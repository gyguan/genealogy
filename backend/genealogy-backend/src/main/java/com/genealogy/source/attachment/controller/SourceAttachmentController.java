package com.genealogy.source.attachment.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.source.attachment.application.SourceAttachmentApplicationService;
import com.genealogy.source.attachment.dto.SourceAttachmentResponse;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class SourceAttachmentController {

    private final SourceAttachmentApplicationService sourceAttachmentApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public SourceAttachmentController(SourceAttachmentApplicationService sourceAttachmentApplicationService, AuthorizationApplicationService authorizationApplicationService) {
        this.sourceAttachmentApplicationService = sourceAttachmentApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/sources/{sourceId}/attachments")
    public ApiResponse<SourceAttachmentResponse> upload(
            @Positive @PathVariable Long sourceId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(sourceAttachmentApplicationService.upload(sourceId, file, actorId));
    }

    @GetMapping("/source-attachments/sources/{sourceId}")
    public ApiResponse<List<SourceAttachmentResponse>> list(@Positive @PathVariable Long sourceId) {
        return ApiResponse.success(sourceAttachmentApplicationService.list(sourceId));
    }

    @GetMapping("/source-attachments/{attachmentId}/content")
    public ResponseEntity<byte[]> content(
            @Positive @PathVariable Long attachmentId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        authorizationApplicationService.requireLogin(authorization);
        SourceAttachmentApplicationService.AttachmentFile file = sourceAttachmentApplicationService.readFile(attachmentId);
        String filename = URLEncoder.encode(file.filename(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + filename)
                .contentType(MediaType.parseMediaType(file.contentType() == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : file.contentType()))
                .body(file.content());
    }

    @DeleteMapping("/source-attachments/{attachmentId}")
    public ApiResponse<Void> remove(
            @Positive @PathVariable Long attachmentId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        authorizationApplicationService.requireLogin(authorization);
        sourceAttachmentApplicationService.remove(attachmentId);
        return ApiResponse.success();
    }
}
