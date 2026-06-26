package com.genealogy.source.controller;

import com.genealogy.common.api.ApiResponse;
import com.genealogy.source.application.SourceEvidenceApplicationService;
import com.genealogy.source.dto.AttachmentCreateRequest;
import com.genealogy.source.dto.AttachmentResponse;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class SourceEvidenceController {

    private final SourceEvidenceApplicationService sourceEvidenceApplicationService;

    public SourceEvidenceController(SourceEvidenceApplicationService sourceEvidenceApplicationService) {
        this.sourceEvidenceApplicationService = sourceEvidenceApplicationService;
    }

    @PostMapping("/source-bindings")
    public ApiResponse<SourceBindingResponse> bind(@Valid @RequestBody SourceBindingCreateRequest request) {
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
    public ApiResponse<Void> unbind(@Positive @PathVariable Long bindingId) {
        sourceEvidenceApplicationService.unbind(bindingId);
        return ApiResponse.success();
    }

    @PostMapping("/attachments")
    public ApiResponse<AttachmentResponse> createAttachment(@Valid @RequestBody AttachmentCreateRequest request) {
        return ApiResponse.success(sourceEvidenceApplicationService.createAttachment(request));
    }

    @GetMapping("/sources/{sourceId}/attachments")
    public ApiResponse<List<AttachmentResponse>> listAttachmentsBySource(@Positive @PathVariable Long sourceId) {
        return ApiResponse.success(sourceEvidenceApplicationService.listAttachmentsBySource(sourceId));
    }
}
