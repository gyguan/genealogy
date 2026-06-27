package com.genealogy.importexport.controller;

import com.genealogy.auth.application.AuthApplicationService;
import com.genealogy.common.api.ApiResponse;
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

    private final PersonCsvApplicationService personCsvApplicationService;
    private final AuthApplicationService authApplicationService;

    public ImportExportController(PersonCsvApplicationService personCsvApplicationService, AuthApplicationService authApplicationService) {
        this.personCsvApplicationService = personCsvApplicationService;
        this.authApplicationService = authApplicationService;
    }

    @GetMapping("/imports/templates/persons.csv")
    public ResponseEntity<byte[]> downloadPersonCsvTemplate() {
        return csvResponse("person-template.csv", personCsvApplicationService.buildPersonTemplate());
    }

    @PostMapping(value = "/clans/{clanId}/imports/persons.csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<CsvImportResultResponse> importPersons(
            @Positive @PathVariable Long clanId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader HttpHeaders headers
    ) {
        String authorization = headers.getFirst(HttpHeaders.AUTHORIZATION);
        Long actorId = authApplicationService.currentUserIdOrNull(authorization);
        return ApiResponse.success(personCsvApplicationService.importPersons(clanId, file, actorId));
    }

    @GetMapping("/clans/{clanId}/exports/persons.csv")
    public ResponseEntity<byte[]> exportPersons(@Positive @PathVariable Long clanId) {
        return csvResponse("persons.csv", personCsvApplicationService.exportPersons(clanId));
    }

    @GetMapping("/exports/types")
    public ApiResponse<Map<String, Object>> exportTypes() {
        return ApiResponse.success(Map.of(
                "person_csv", "/api/v1/clans/{clanId}/exports/persons.csv",
                "person_template_csv", "/api/v1/imports/templates/persons.csv"
        ));
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
