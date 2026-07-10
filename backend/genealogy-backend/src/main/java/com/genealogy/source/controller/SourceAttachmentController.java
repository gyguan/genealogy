package com.genealogy.source.controller;

import com.genealogy.auth.application.RequestContextApplicationService;
import com.genealogy.auth.dto.RequestUserContext;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageQuery;
import com.genealogy.common.api.PageResponse;
import com.genealogy.source.application.SourceAttachmentApplicationService;
import com.genealogy.source.dto.SourceAttachmentFileResponse;
import com.genealogy.source.dto.SourceAttachmentResponse;
import jakarta.servlet.http.HttpServletRequest;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;

@Validated
@RestController
@RequestMapping("/api/v1")
public class SourceAttachmentController {

    private final SourceAttachmentApplicationService sourceAttachmentApplicationService;
    private final RequestContextApplicationService requestContextApplicationService;

    public SourceAttachmentController(SourceAttachmentApplicationService sourceAttachmentApplicationService, RequestContextApplicationService requestContextApplicationService) {
        this.sourceAttachmentApplicationService = sourceAttachmentApplicationService;
        this.requestContextApplicationService = requestContextApplicationService;
    }

    @GetMapping("/sources/{sourceId}/attachments")
    public ApiResponse<PageResponse<SourceAttachmentResponse>> listBySource(
            @Positive @PathVariable Long sourceId,
            PageQuery pageQuery,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(sourceAttachmentApplicationService.listBySource(
                sourceId,
                pageQuery.normalizedPageNo(),
                pageQuery.normalizedPageSize(),
                context.userId()
        ));
    }

    @PostMapping(value = "/sources/{sourceId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<SourceAttachmentResponse> upload(
            @Positive @PathVariable Long sourceId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String privacyLevel,
            @RequestParam(required = false) String sensitiveLevel,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(sourceAttachmentApplicationService.upload(
                sourceId,
                file,
                privacyLevel,
                sensitiveLevel,
                context.userId(),
                context.requestId(),
                context.clientIp()
        ));
    }

    @GetMapping("/source-attachments/{attachmentId}/preview")
    public ResponseEntity<byte[]> preview(@Positive @PathVariable Long attachmentId, HttpServletRequest servletRequest) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        SourceAttachmentFileResponse file = sourceAttachmentApplicationService.preview(attachmentId, context.userId(), context.requestId(), context.clientIp());
        return fileResponse(file, false);
    }

    @GetMapping("/source-attachments/{attachmentId}/download")
    public ResponseEntity<byte[]> download(@Positive @PathVariable Long attachmentId, HttpServletRequest servletRequest) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        SourceAttachmentFileResponse file = sourceAttachmentApplicationService.download(attachmentId, context.userId(), context.requestId(), context.clientIp());
        return fileResponse(file, true);
    }

    @DeleteMapping("/source-attachments/{attachmentId}")
    public ApiResponse<Void> delete(@Positive @PathVariable Long attachmentId, HttpServletRequest servletRequest) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        sourceAttachmentApplicationService.delete(attachmentId, context.userId(), context.requestId(), context.clientIp());
        return ApiResponse.success();
    }

    private ResponseEntity<byte[]> fileResponse(SourceAttachmentFileResponse file, boolean attachment) {
        ContentDisposition disposition = (attachment ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(file.fileName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.fileSize())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(file.content());
    }
}
