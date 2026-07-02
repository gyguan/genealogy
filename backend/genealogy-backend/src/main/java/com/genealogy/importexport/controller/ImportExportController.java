package com.genealogy.importexport.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.importexport.application.BookletExportApplicationService;
import com.genealogy.importexport.application.PersonCsvApplicationService;
import com.genealogy.importexport.dto.CsvImportResultResponse;
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
import java.util.Map;

@Validated
@RestController
@RequestMapping("/api/v1")
public class ImportExportController {

    private static final String PERSON_CREATE = "person:create";
    private static final String RELATIONSHIP_CREATE = "relationship:create";
    private static final String EXPORT_DOWNLOAD = "export_task:download";

    private final PersonCsvApplicationService personCsvApplicationService;
    private final BookletExportApplicationService bookletExportApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ImportExportController(
            PersonCsvApplicationService personCsvApplicationService,
            BookletExportApplicationService bookletExportApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.personCsvApplicationService = personCsvApplicationService;
        this.bookletExportApplicationService = bookletExportApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping("/imports/templates/persons.csv")
    public ResponseEntity<byte[]> downloadPersonCsvTemplate() {
        return csvResponse("person-template.csv", personCsvApplicationService.buildPersonTemplate());
    }

    @GetMapping("/imports/templates/relations.csv")
    public ResponseEntity<byte[]> downloadRelationCsvTemplate() {
        return csvResponse("relation-template.csv", personCsvApplicationService.buildRelationTemplate());
    }

    @PostMapping(value = "/clans/{clanId}/imports/persons.csv/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<CsvImportResultResponse> previewPersons(@Positive @PathVariable Long clanId, @RequestParam("file") MultipartFile file, @RequestHeader HttpHeaders headers) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requirePermission(clanId, actorId, PERSON_CREATE);
        return ApiResponse.success(personCsvApplicationService.previewPersons(clanId, file));
    }

    @PostMapping(value = "/clans/{clanId}/imports/persons.csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<CsvImportResultResponse> importPersons(@Positive @PathVariable Long clanId, @RequestParam("file") MultipartFile file, @RequestHeader HttpHeaders headers) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requirePermission(clanId, actorId, PERSON_CREATE);
        return ApiResponse.success(personCsvApplicationService.importPersons(clanId, file, actorId));
    }

    @PostMapping(value = "/clans/{clanId}/imports/relations.csv/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<CsvImportResultResponse> previewRelations(@Positive @PathVariable Long clanId, @RequestParam("file") MultipartFile file, @RequestHeader HttpHeaders headers) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requirePermission(clanId, actorId, RELATIONSHIP_CREATE);
        return ApiResponse.success(personCsvApplicationService.previewRelations(clanId, file));
    }

    @PostMapping(value = "/clans/{clanId}/imports/relations.csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<CsvImportResultResponse> importRelations(@Positive @PathVariable Long clanId, @RequestParam("file") MultipartFile file, @RequestHeader HttpHeaders headers) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requirePermission(clanId, actorId, RELATIONSHIP_CREATE);
        return ApiResponse.success(personCsvApplicationService.importRelations(clanId, file, actorId));
    }

    @GetMapping("/clans/{clanId}/exports/persons.csv")
    public ResponseEntity<byte[]> exportPersons(@Positive @PathVariable Long clanId, @RequestHeader HttpHeaders headers) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requirePermission(clanId, actorId, EXPORT_DOWNLOAD);
        return csvResponse("persons.csv", personCsvApplicationService.exportPersons(clanId));
    }

    @GetMapping("/clans/{clanId}/branches/{branchId}/exports/persons.csv")
    public ResponseEntity<byte[]> exportPersonsByBranch(@Positive @PathVariable Long clanId, @Positive @PathVariable Long branchId, @RequestHeader HttpHeaders headers) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requireBranchPermission(clanId, actorId, branchId, EXPORT_DOWNLOAD);
        return csvResponse("branch-" + branchId + "-persons.csv", personCsvApplicationService.exportPersonsByBranch(clanId, branchId));
    }

    @GetMapping("/clans/{clanId}/exports/relations.csv")
    public ResponseEntity<byte[]> exportRelations(@Positive @PathVariable Long clanId, @RequestHeader HttpHeaders headers) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requirePermission(clanId, actorId, EXPORT_DOWNLOAD);
        return csvResponse("relations.csv", personCsvApplicationService.exportRelations(clanId));
    }

    @GetMapping("/clans/{clanId}/branches/{branchId}/exports/relations.csv")
    public ResponseEntity<byte[]> exportRelationsByBranch(@Positive @PathVariable Long clanId, @Positive @PathVariable Long branchId, @RequestHeader HttpHeaders headers) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requireBranchPermission(clanId, actorId, branchId, EXPORT_DOWNLOAD);
        return csvResponse("branch-" + branchId + "-relations.csv", personCsvApplicationService.exportRelationsByBranch(clanId, branchId));
    }

    @GetMapping("/clans/{clanId}/exports/booklet.html")
    public ResponseEntity<byte[]> exportClanBooklet(@Positive @PathVariable Long clanId, @RequestHeader HttpHeaders headers) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requirePermission(clanId, actorId, EXPORT_DOWNLOAD);
        return htmlResponse("clan-" + clanId + "-booklet.html", bookletExportApplicationService.buildClanBooklet(clanId));
    }

    @GetMapping("/clans/{clanId}/branches/{branchId}/exports/booklet.html")
    public ResponseEntity<byte[]> exportBranchBooklet(@Positive @PathVariable Long clanId, @Positive @PathVariable Long branchId, @RequestHeader HttpHeaders headers) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requireBranchPermission(clanId, actorId, branchId, EXPORT_DOWNLOAD);
        return htmlResponse("branch-" + branchId + "-booklet.html", bookletExportApplicationService.buildBranchBooklet(clanId, branchId));
    }

    @GetMapping("/exports/types")
    public ApiResponse<Map<String, Object>> exportTypes() {
        return ApiResponse.success(Map.of(
                "person_csv", "/api/v1/clans/{clanId}/exports/persons.csv",
                "branch_person_csv", "/api/v1/clans/{clanId}/branches/{branchId}/exports/persons.csv",
                "relation_csv", "/api/v1/clans/{clanId}/exports/relations.csv",
                "branch_relation_csv", "/api/v1/clans/{clanId}/branches/{branchId}/exports/relations.csv",
                "booklet_html", "/api/v1/clans/{clanId}/exports/booklet.html",
                "branch_booklet_html", "/api/v1/clans/{clanId}/branches/{branchId}/exports/booklet.html",
                "person_template_csv", "/api/v1/imports/templates/persons.csv",
                "relation_template_csv", "/api/v1/imports/templates/relations.csv"
        ));
    }

    private ResponseEntity<byte[]> csvResponse(String filename, byte[] content) {
        ContentDisposition disposition = ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build();
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString()).contentType(new MediaType("text", "csv", StandardCharsets.UTF_8)).body(content);
    }

    private ResponseEntity<byte[]> htmlResponse(String filename, byte[] content) {
        ContentDisposition disposition = ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build();
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString()).contentType(new MediaType("text", "html", StandardCharsets.UTF_8)).body(content);
    }
}
