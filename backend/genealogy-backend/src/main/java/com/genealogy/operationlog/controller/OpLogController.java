package com.genealogy.operationlog.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationLogExportApplicationService;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.operationlog.dto.OperationLogStatsResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

@Validated
@RestController
@RequestMapping("/api/v1/logs")
public class OpLogController {

    private static final String PERMISSION_VIEW = "operation_log.view";
    private static final String PERMISSION_EXPORT = "operation_log.export";

    private final OperationLogApplicationService operationLogApplicationService;
    private final OperationLogExportApplicationService operationLogExportApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public OpLogController(
            OperationLogApplicationService operationLogApplicationService,
            OperationLogExportApplicationService operationLogExportApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.operationLogApplicationService = operationLogApplicationService;
        this.operationLogExportApplicationService = operationLogExportApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping("/operations")
    public ApiResponse<PageResponse<OperationLogResponse>> listOperations(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @NotNull @RequestParam("clanId") Long clanId,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) Long targetId,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime startTime,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime endTime,
            @RequestParam(required = false) String keyword,
            @Min(1) @RequestParam(defaultValue = "1") int pageNo,
            @Min(1) @Max(100) @RequestParam(defaultValue = "20") int pageSize
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requireDirectClanPermission(clanId, userId, PERMISSION_VIEW);
        boolean includeTechnicalFields = authorizationApplicationService.hasDirectClanPermission(
                clanId,
                userId,
                PERMISSION_EXPORT
        );
        return ApiResponse.success(operationLogApplicationService.search(
                clanId,
                actorId,
                actionType,
                targetType,
                targetId,
                startTime,
                endTime,
                keyword,
                pageNo,
                pageSize,
                includeTechnicalFields
        ));
    }

    @GetMapping("/operations/export.csv")
    public ResponseEntity<byte[]> exportOperations(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @NotNull @RequestParam("clanId") Long clanId,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) Long targetId,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime startTime,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime endTime,
            @RequestParam(required = false) String keyword
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requireDirectClanPermission(clanId, userId, PERMISSION_EXPORT);
        byte[] content = operationLogExportApplicationService.exportCsv(
                clanId,
                userId,
                actorId,
                actionType,
                targetType,
                targetId,
                startTime,
                endTime,
                keyword
        );
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename("operation-logs.csv", StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(content);
    }

    @GetMapping("/operations/stats")
    public ApiResponse<OperationLogStatsResponse> operationStats(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @NotNull @RequestParam("clanId") Long clanId,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) Long targetId,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime startTime,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime endTime,
            @RequestParam(required = false) String keyword
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requireDirectClanPermission(clanId, userId, PERMISSION_VIEW);
        return ApiResponse.success(operationLogApplicationService.stats(
                clanId,
                actorId,
                actionType,
                targetType,
                targetId,
                startTime,
                endTime,
                keyword
        ));
    }
}
