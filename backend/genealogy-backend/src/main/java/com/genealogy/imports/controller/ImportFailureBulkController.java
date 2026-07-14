package com.genealogy.imports.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.imports.application.ImportRowBulkApplicationService;
import com.genealogy.imports.dto.ImportRowBulkExcludeRequest;
import com.genealogy.imports.dto.ImportRowBulkOperationResponse;
import com.genealogy.imports.dto.ImportRowBulkRetryRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
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

@Validated
@RestController
@RequestMapping("/api/v1/clans/{clanId}/imports/{jobId}/rows")
public class ImportFailureBulkController {

    private static final MediaType XLSX_MEDIA_TYPE = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    private final ImportRowBulkApplicationService bulkApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ImportFailureBulkController(
            ImportRowBulkApplicationService bulkApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.bulkApplicationService = bulkApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/bulk-retry")
    public ApiResponse<ImportRowBulkOperationResponse> retry(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @Valid @RequestBody ImportRowBulkRetryRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(bulkApplicationService.retry(clanId, jobId, request, actorId));
    }

    @PostMapping("/bulk-exclude")
    public ApiResponse<ImportRowBulkOperationResponse> exclude(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @Valid @RequestBody ImportRowBulkExcludeRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(bulkApplicationService.exclude(clanId, jobId, request, actorId));
    }

    @GetMapping("/failures.xlsx")
    public ResponseEntity<byte[]> exportFailures(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        ImportRowBulkApplicationService.ImportFailureExport export =
                bulkApplicationService.exportFailures(clanId, jobId, actorId);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(export.filename(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(XLSX_MEDIA_TYPE)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(export.content());
    }

    @PostMapping("/corrections.xlsx")
    public ApiResponse<ImportRowBulkOperationResponse> uploadCorrections(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "retryAfterApply", defaultValue = "true") boolean retryAfterApply,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(bulkApplicationService.uploadCorrections(
                clanId, jobId, file, retryAfterApply, actorId
        ));
    }
}
