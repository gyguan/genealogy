package com.genealogy.importexport.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.importexport.application.DataExportApplicationService;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@Validated
@RestController
@RequestMapping("/api/v1")
public class DataExportController {

    private static final String EXPORT_DOWNLOAD = "export_task:download";

    private final DataExportApplicationService dataExportApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public DataExportController(
            DataExportApplicationService dataExportApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.dataExportApplicationService = dataExportApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping("/clans/{clanId}/exports/persons.csv")
    public ResponseEntity<byte[]> exportPersons(
            @Positive @PathVariable Long clanId,
            @RequestHeader HttpHeaders headers
    ) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requirePermission(clanId, actorId, EXPORT_DOWNLOAD);
        return csvResponse("persons.csv", dataExportApplicationService.exportPersons(clanId));
    }

    @GetMapping("/clans/{clanId}/branches/{branchId}/exports/persons.csv")
    public ResponseEntity<byte[]> exportPersonsByBranch(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long branchId,
            @RequestHeader HttpHeaders headers
    ) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requireBranchPermission(clanId, actorId, branchId, EXPORT_DOWNLOAD);
        return csvResponse(
                "branch-" + branchId + "-persons.csv",
                dataExportApplicationService.exportPersonsByBranch(clanId, branchId)
        );
    }

    @GetMapping("/clans/{clanId}/exports/relations.csv")
    public ResponseEntity<byte[]> exportRelations(
            @Positive @PathVariable Long clanId,
            @RequestHeader HttpHeaders headers
    ) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requirePermission(clanId, actorId, EXPORT_DOWNLOAD);
        return csvResponse("relations.csv", dataExportApplicationService.exportRelations(clanId));
    }

    @GetMapping("/clans/{clanId}/branches/{branchId}/exports/relations.csv")
    public ResponseEntity<byte[]> exportRelationsByBranch(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long branchId,
            @RequestHeader HttpHeaders headers
    ) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requireBranchPermission(clanId, actorId, branchId, EXPORT_DOWNLOAD);
        return csvResponse(
                "branch-" + branchId + "-relations.csv",
                dataExportApplicationService.exportRelationsByBranch(clanId, branchId)
        );
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
