package com.genealogy.importexport.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.importexport.application.CsvImportApplicationService;
import com.genealogy.importexport.dto.CsvImportResultResponse;
import com.genealogy.importexport.dto.PersonImportOptions;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
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
public class CsvImportController {

    private static final String PERSON_CREATE = "person:create";
    private static final String RELATIONSHIP_CREATE = "relationship:create";

    private final CsvImportApplicationService csvImportApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public CsvImportController(
            CsvImportApplicationService csvImportApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.csvImportApplicationService = csvImportApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping("/imports/templates/persons.csv")
    public ResponseEntity<byte[]> downloadPersonCsvTemplate() {
        return csvResponse("person-template.csv", csvImportApplicationService.buildPersonTemplate());
    }

    @GetMapping("/imports/templates/relations.csv")
    public ResponseEntity<byte[]> downloadRelationCsvTemplate() {
        return csvResponse("relation-template.csv", csvImportApplicationService.buildRelationTemplate());
    }

    /**
     * Compatibility endpoint used by the current frontend. Person preview and
     * import-job management remain owned by com.genealogy.imports.controller.ImportController.
     */
    @PostMapping(value = "/clans/{clanId}/imports/persons", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<CsvImportResultResponse> importPersons(
            @Positive @PathVariable Long clanId,
            @RequestParam("file") MultipartFile file,
            @ModelAttribute PersonImportOptions options,
            @RequestHeader HttpHeaders headers
    ) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requirePermission(clanId, actorId, PERSON_CREATE);
        return ApiResponse.success(csvImportApplicationService.importPersons(clanId, file, actorId, options));
    }

    @PostMapping(value = {
            "/clans/{clanId}/imports/relationships/preview",
            "/clans/{clanId}/imports/relations/preview",
            "/clans/{clanId}/imports/relations.csv/preview"
    }, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<CsvImportResultResponse> previewRelations(
            @Positive @PathVariable Long clanId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader HttpHeaders headers
    ) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requirePermission(clanId, actorId, RELATIONSHIP_CREATE);
        return ApiResponse.success(csvImportApplicationService.previewRelations(clanId, file));
    }

    @PostMapping(value = {
            "/clans/{clanId}/imports/relationships",
            "/clans/{clanId}/imports/relations",
            "/clans/{clanId}/imports/relations.csv"
    }, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<CsvImportResultResponse> importRelations(
            @Positive @PathVariable Long clanId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader HttpHeaders headers
    ) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requirePermission(clanId, actorId, RELATIONSHIP_CREATE);
        return ApiResponse.success(csvImportApplicationService.importRelations(clanId, file, actorId));
    }

    private ResponseEntity<byte[]> csvResponse(String filename, byte[] content) {
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(filename, StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(content);
    }
}
