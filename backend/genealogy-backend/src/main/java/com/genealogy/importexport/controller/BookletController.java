package com.genealogy.importexport.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.importexport.application.BookletExportApplicationService;
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
public class BookletController {

    private static final String EXPORT_DOWNLOAD = "export_task:download";

    private final BookletExportApplicationService bookletExportApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public BookletController(
            BookletExportApplicationService bookletExportApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.bookletExportApplicationService = bookletExportApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping("/clans/{clanId}/exports/booklet.html")
    public ResponseEntity<byte[]> exportClanBooklet(
            @Positive @PathVariable Long clanId,
            @RequestHeader HttpHeaders headers
    ) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requirePermission(clanId, actorId, EXPORT_DOWNLOAD);
        return htmlResponse(
                "clan-" + clanId + "-booklet.html",
                bookletExportApplicationService.buildClanBooklet(clanId)
        );
    }

    @GetMapping("/clans/{clanId}/branches/{branchId}/exports/booklet.html")
    public ResponseEntity<byte[]> exportBranchBooklet(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long branchId,
            @RequestHeader HttpHeaders headers
    ) {
        Long actorId = authorizationApplicationService.requireLogin(headers.getFirst(HttpHeaders.AUTHORIZATION));
        authorizationApplicationService.requireBranchPermission(clanId, actorId, branchId, EXPORT_DOWNLOAD);
        return htmlResponse(
                "branch-" + branchId + "-booklet.html",
                bookletExportApplicationService.buildBranchBooklet(clanId, branchId)
        );
    }

    private ResponseEntity<byte[]> htmlResponse(String filename, byte[] content) {
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(filename, StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(new MediaType("text", "html", StandardCharsets.UTF_8))
                .body(content);
    }
}
