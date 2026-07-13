package com.genealogy.imports.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageQuery;
import com.genealogy.common.api.PageResponse;
import com.genealogy.imports.application.ImportApplicationService;
import com.genealogy.imports.application.ImportJobApplicationService;
import com.genealogy.imports.application.PersonImportCommandApplicationService;
import com.genealogy.imports.application.PersonImportFilePolicyService;
import com.genealogy.imports.application.PersonImportTemplateApplicationService;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.dto.ImportJobSummaryResponse;
import com.genealogy.imports.dto.ImportPreviewResponse;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

    private final ImportApplicationService importApplicationService;
    private final PersonImportCommandApplicationService personImportCommandApplicationService;
    private final ImportJobApplicationService importJobApplicationService;
    private final PersonImportFilePolicyService personImportFilePolicyService;
    private final PersonImportTemplateApplicationService personImportTemplateApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ImportController(
            ImportApplicationService importApplicationService,
            PersonImportCommandApplicationService personImportCommandApplicationService,
            ImportJobApplicationService importJobApplicationService,
            PersonImportFilePolicyService personImportFilePolicyService,
            PersonImportTemplateApplicationService personImportTemplateApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.importApplicationService = importApplicationService;
        this.personImportCommandApplicationService = personImportCommandApplicationService;
        this.importJobApplicationService = importJobApplicationService;
        this.personImportFilePolicyService = personImportFilePolicyService;
        this.personImportTemplateApplicationService = personImportTemplateApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping("/imports/templates/persons.csv")
    public ResponseEntity<byte[]> downloadPersonCsvTemplate() {
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename("person-import-template.csv", StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(personImportTemplateApplicationService.buildTemplate());
    }

    @PostMapping("/clans/{clanId}/imports/persons/preview")
    public ApiResponse<ImportPreviewResponse> previewPersons(
            @Positive @PathVariable Long clanId,
            @RequestParam(value = "branchId", required = false) Long branchId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "autoMapping", defaultValue = "true") boolean autoMapping,
            @RequestParam(value = "nameIndex", defaultValue = "0") int nameIndex,
            @RequestParam(value = "genderIndex", defaultValue = "1") int genderIndex,
            @RequestParam(value = "generationNoIndex", defaultValue = "2") int generationNoIndex,
            @RequestParam(value = "generationWordIndex", defaultValue = "3") int generationWordIndex,
            @RequestParam(value = "branchIdIndex", defaultValue = "-1") int branchIdIndex,
            @RequestParam(value = "birthDateIndex", defaultValue = "4") int birthDateIndex,
            @RequestParam(value = "isLivingIndex", defaultValue = "5") int isLivingIndex,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        personImportFilePolicyService.validate(branchId, file);
        return ApiResponse.success(importApplicationService.previewPersons(
                clanId,
                branchId,
                file,
                mapping(nameIndex, genderIndex, generationNoIndex, generationWordIndex, birthDateIndex, isLivingIndex),
                autoMapping,
                actorId
        ));
    }

    @PostMapping("/clans/{clanId}/imports/persons.csv")
    public ApiResponse<ImportJobResponse> importPersonsCsv(
            @Positive @PathVariable Long clanId,
            @RequestParam(value = "branchId", required = false) Long branchId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "confirmDuplicates", defaultValue = "false") boolean confirmDuplicates,
            @RequestParam(value = "autoMapping", defaultValue = "true") boolean autoMapping,
            @RequestParam(value = "nameIndex", defaultValue = "0") int nameIndex,
            @RequestParam(value = "genderIndex", defaultValue = "1") int genderIndex,
            @RequestParam(value = "generationNoIndex", defaultValue = "2") int generationNoIndex,
            @RequestParam(value = "generationWordIndex", defaultValue = "3") int generationWordIndex,
            @RequestParam(value = "branchIdIndex", defaultValue = "-1") int branchIdIndex,
            @RequestParam(value = "birthDateIndex", defaultValue = "4") int birthDateIndex,
            @RequestParam(value = "isLivingIndex", defaultValue = "5") int isLivingIndex,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        personImportFilePolicyService.validate(branchId, file);
        return ApiResponse.success(personImportCommandApplicationService.importPersonsCsv(
                clanId,
                branchId,
                file,
                mapping(nameIndex, genderIndex, generationNoIndex, generationWordIndex, birthDateIndex, isLivingIndex),
                autoMapping,
                confirmDuplicates,
                actorId
        ));
    }

    @GetMapping("/clans/{clanId}/imports")
    public ApiResponse<PageResponse<ImportJobSummaryResponse>> listJobs(
            @Positive @PathVariable Long clanId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String importType,
            PageQuery pageQuery,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(importJobApplicationService.listJobs(
                clanId,
                branchId,
                status,
                importType,
                pageQuery.normalizedPageNo(),
                pageQuery.normalizedPageSize(),
                actorId
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

    private ImportApplicationService.FieldMapping mapping(
            int nameIndex,
            int genderIndex,
            int generationNoIndex,
            int generationWordIndex,
            int birthDateIndex,
            int isLivingIndex
    ) {
        return new ImportApplicationService.FieldMapping(
                nameIndex,
                genderIndex,
                generationNoIndex,
                generationWordIndex,
                -1,
                birthDateIndex,
                isLivingIndex
        );
    }
}
