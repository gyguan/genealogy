package com.genealogy.imports.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageQuery;
import com.genealogy.common.api.PageResponse;
import com.genealogy.imports.application.ImportApplicationService;
import com.genealogy.imports.application.ImportJobApplicationService;
import com.genealogy.imports.application.ImportJobReviewApplicationService;
import com.genealogy.imports.application.ImportJobRowApplicationService;
import com.genealogy.imports.application.PersonImportCommandApplicationService;
import com.genealogy.imports.application.PersonImportTemplateApplicationService;
import com.genealogy.imports.application.RelationshipImportApplicationService;
import com.genealogy.imports.application.RelationshipImportJobRowApplicationService;
import com.genealogy.imports.application.RelationshipImportTemplateApplicationService;
import com.genealogy.imports.application.SourceImportApplicationService;
import com.genealogy.imports.application.SourceImportJobRowApplicationService;
import com.genealogy.imports.application.SourceImportTemplateApplicationService;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.dto.ImportJobReviewSubmitRequest;
import com.genealogy.imports.dto.ImportJobRowResponse;
import com.genealogy.imports.dto.ImportJobSummaryResponse;
import com.genealogy.imports.dto.ImportPreviewResponse;
import com.genealogy.imports.dto.PersonImportRowRetryRequest;
import com.genealogy.imports.dto.RelationshipImportPreviewResponse;
import com.genealogy.imports.dto.RelationshipImportRowRetryRequest;
import com.genealogy.imports.dto.SourceImportPreviewResponse;
import com.genealogy.imports.dto.SourceImportRowRetryRequest;
import com.genealogy.review.dto.CheckTaskResponse;
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
@RequestMapping("/api/v1")
public class ImportController {

    private static final MediaType XLSX_MEDIA_TYPE = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    private final ImportApplicationService importApplicationService;
    private final PersonImportCommandApplicationService personImportCommandApplicationService;
    private final ImportJobApplicationService importJobApplicationService;
    private final ImportJobRowApplicationService importJobRowApplicationService;
    private final ImportJobReviewApplicationService importJobReviewApplicationService;
    private final PersonImportTemplateApplicationService personImportTemplateApplicationService;
    private final RelationshipImportApplicationService relationshipImportApplicationService;
    private final RelationshipImportJobRowApplicationService relationshipImportJobRowApplicationService;
    private final RelationshipImportTemplateApplicationService relationshipImportTemplateApplicationService;
    private final SourceImportApplicationService sourceImportApplicationService;
    private final SourceImportJobRowApplicationService sourceImportJobRowApplicationService;
    private final SourceImportTemplateApplicationService sourceImportTemplateApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ImportController(
            ImportApplicationService importApplicationService,
            PersonImportCommandApplicationService personImportCommandApplicationService,
            ImportJobApplicationService importJobApplicationService,
            ImportJobRowApplicationService importJobRowApplicationService,
            ImportJobReviewApplicationService importJobReviewApplicationService,
            PersonImportTemplateApplicationService personImportTemplateApplicationService,
            RelationshipImportApplicationService relationshipImportApplicationService,
            RelationshipImportJobRowApplicationService relationshipImportJobRowApplicationService,
            RelationshipImportTemplateApplicationService relationshipImportTemplateApplicationService,
            SourceImportApplicationService sourceImportApplicationService,
            SourceImportJobRowApplicationService sourceImportJobRowApplicationService,
            SourceImportTemplateApplicationService sourceImportTemplateApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.importApplicationService = importApplicationService;
        this.personImportCommandApplicationService = personImportCommandApplicationService;
        this.importJobApplicationService = importJobApplicationService;
        this.importJobRowApplicationService = importJobRowApplicationService;
        this.importJobReviewApplicationService = importJobReviewApplicationService;
        this.personImportTemplateApplicationService = personImportTemplateApplicationService;
        this.relationshipImportApplicationService = relationshipImportApplicationService;
        this.relationshipImportJobRowApplicationService = relationshipImportJobRowApplicationService;
        this.relationshipImportTemplateApplicationService = relationshipImportTemplateApplicationService;
        this.sourceImportApplicationService = sourceImportApplicationService;
        this.sourceImportJobRowApplicationService = sourceImportJobRowApplicationService;
        this.sourceImportTemplateApplicationService = sourceImportTemplateApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping("/imports/templates/persons.csv")
    public ResponseEntity<byte[]> downloadPersonCsvTemplate() {
        return templateResponse("person-import-template.csv", new MediaType("text", "csv", StandardCharsets.UTF_8),
                personImportTemplateApplicationService.buildCsvTemplate());
    }

    @GetMapping("/imports/templates/persons.xlsx")
    public ResponseEntity<byte[]> downloadPersonXlsxTemplate() {
        return templateResponse("person-import-template.xlsx", XLSX_MEDIA_TYPE,
                personImportTemplateApplicationService.buildXlsxTemplate());
    }

    @GetMapping("/imports/templates/relationships.csv")
    public ResponseEntity<byte[]> downloadRelationshipCsvTemplate() {
        return templateResponse("relationship-import-template.csv", new MediaType("text", "csv", StandardCharsets.UTF_8),
                relationshipImportTemplateApplicationService.buildCsvTemplate());
    }

    @GetMapping("/imports/templates/relationships.xlsx")
    public ResponseEntity<byte[]> downloadRelationshipXlsxTemplate() {
        return templateResponse("relationship-import-template.xlsx", XLSX_MEDIA_TYPE,
                relationshipImportTemplateApplicationService.buildXlsxTemplate());
    }

    @GetMapping("/imports/templates/sources.csv")
    public ResponseEntity<byte[]> downloadSourceCsvTemplate() {
        return templateResponse("source-import-template.csv", new MediaType("text", "csv", StandardCharsets.UTF_8),
                sourceImportTemplateApplicationService.buildCsvTemplate());
    }

    @GetMapping("/imports/templates/sources.xlsx")
    public ResponseEntity<byte[]> downloadSourceXlsxTemplate() {
        return templateResponse("source-import-template.xlsx", XLSX_MEDIA_TYPE,
                sourceImportTemplateApplicationService.buildXlsxTemplate());
    }

    @PostMapping("/clans/{clanId}/imports/persons/preview")
    public ApiResponse<ImportPreviewResponse> previewPersons(
            @Positive @PathVariable Long clanId,
            @Positive @RequestParam("branchId") Long branchId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(importApplicationService.previewPersons(clanId, branchId, file, actorId));
    }

    @PostMapping("/clans/{clanId}/imports/persons.csv")
    public ApiResponse<ImportJobResponse> importPersonsCsv(
            @Positive @PathVariable Long clanId,
            @Positive @RequestParam("branchId") Long branchId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "confirmDuplicates", defaultValue = "false") boolean confirmDuplicates,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(personImportCommandApplicationService.importPersonsCsv(
                clanId, branchId, file, confirmDuplicates, actorId
        ));
    }

    @PostMapping("/clans/{clanId}/imports/relationships/preview")
    public ApiResponse<RelationshipImportPreviewResponse> previewRelationships(
            @Positive @PathVariable Long clanId,
            @Positive @RequestParam("branchId") Long branchId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(relationshipImportApplicationService.preview(clanId, branchId, file, actorId));
    }

    @PostMapping("/clans/{clanId}/imports/relationships")
    public ApiResponse<ImportJobResponse> importRelationships(
            @Positive @PathVariable Long clanId,
            @Positive @RequestParam("branchId") Long branchId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(relationshipImportApplicationService.importRelationships(
                clanId, branchId, file, actorId
        ));
    }

    @PostMapping("/clans/{clanId}/imports/sources/preview")
    public ApiResponse<SourceImportPreviewResponse> previewSources(
            @Positive @PathVariable Long clanId,
            @Positive @RequestParam("branchId") Long branchId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(sourceImportApplicationService.preview(clanId, branchId, file, actorId));
    }

    @PostMapping("/clans/{clanId}/imports/sources")
    public ApiResponse<ImportJobResponse> importSources(
            @Positive @PathVariable Long clanId,
            @Positive @RequestParam("branchId") Long branchId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(sourceImportApplicationService.importSources(clanId, branchId, file, actorId));
    }

    @GetMapping("/clans/{clanId}/imports")
    public ApiResponse<PageResponse<ImportJobSummaryResponse>> listJobs(
            @Positive @PathVariable Long clanId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String importType,
            @RequestParam(required = false) String fileFormat,
            PageQuery pageQuery,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(importJobApplicationService.listJobs(
                clanId, branchId, status, importType, fileFormat,
                pageQuery.normalizedPageNo(), pageQuery.normalizedPageSize(), actorId
        ));
    }

    @GetMapping("/clans/{clanId}/imports/{jobId}")
    public ApiResponse<ImportJobResponse> getJob(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(importJobApplicationService.getJob(clanId, jobId, actorId));
    }

    @GetMapping("/clans/{clanId}/imports/{jobId}/rows")
    public ApiResponse<PageResponse<ImportJobRowResponse>> listRows(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @RequestParam(required = false, defaultValue = "failed") String status,
            PageQuery pageQuery,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(importJobRowApplicationService.listRows(
                clanId, jobId, status, pageQuery.normalizedPageNo(), pageQuery.normalizedPageSize(), actorId
        ));
    }

    @PostMapping("/clans/{clanId}/imports/{jobId}/rows/{rowId}/retry")
    public ApiResponse<ImportJobRowResponse> retryPersonRow(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @Positive @PathVariable Long rowId,
            @Valid @RequestBody PersonImportRowRetryRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(importJobRowApplicationService.retryPersonRow(clanId, jobId, rowId, request, actorId));
    }

    @PostMapping("/clans/{clanId}/imports/{jobId}/rows/{rowId}/relationship-retry")
    public ApiResponse<ImportJobRowResponse> retryRelationshipRow(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @Positive @PathVariable Long rowId,
            @Valid @RequestBody RelationshipImportRowRetryRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(relationshipImportJobRowApplicationService.retry(
                clanId, jobId, rowId, request, actorId
        ));
    }

    @PostMapping("/clans/{clanId}/imports/{jobId}/rows/{rowId}/source-retry")
    public ApiResponse<ImportJobRowResponse> retrySourceRow(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @Positive @PathVariable Long rowId,
            @Valid @RequestBody SourceImportRowRetryRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(sourceImportJobRowApplicationService.retry(clanId, jobId, rowId, request, actorId));
    }

    @PostMapping("/clans/{clanId}/imports/{jobId}/submit-review")
    public ApiResponse<CheckTaskResponse> submitReview(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @Valid @RequestBody ImportJobReviewSubmitRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(importJobReviewApplicationService.submit(clanId, jobId, request, actorId));
    }

    private ResponseEntity<byte[]> templateResponse(String filename, MediaType mediaType, byte[] body) {
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(filename, StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(mediaType)
                .body(body);
    }
}
