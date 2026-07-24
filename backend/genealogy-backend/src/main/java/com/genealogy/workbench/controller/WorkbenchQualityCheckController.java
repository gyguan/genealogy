package com.genealogy.workbench.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.workbench.application.WorkbenchQualityCheckApplicationService;
import com.genealogy.workbench.dto.WorkbenchQualityCheckRequest;
import com.genealogy.workbench.dto.WorkbenchQualityCheckResponse;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/v1/workbench/quality-checks")
public class WorkbenchQualityCheckController {

    private final WorkbenchQualityCheckApplicationService service;
    private final AuthorizationApplicationService authorization;

    public WorkbenchQualityCheckController(
            WorkbenchQualityCheckApplicationService service,
            AuthorizationApplicationService authorization
    ) {
        this.service = service;
        this.authorization = authorization;
    }

    @PostMapping
    public ApiResponse<WorkbenchQualityCheckResponse> trigger(
            @Positive @RequestParam Long clanId,
            @RequestBody WorkbenchQualityCheckRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        Long actorId = authorization.requireLogin(authorizationHeader);
        return ApiResponse.success(service.trigger(clanId, request, actorId));
    }

    @GetMapping("/{checkId}")
    public ApiResponse<WorkbenchQualityCheckResponse> get(
            @Positive @RequestParam Long clanId,
            @PathVariable UUID checkId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        Long actorId = authorization.requireLogin(authorizationHeader);
        return ApiResponse.success(service.get(clanId, checkId, actorId));
    }

    @GetMapping("/latest")
    public ApiResponse<WorkbenchQualityCheckResponse> latest(
            @Positive @RequestParam Long clanId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        Long actorId = authorization.requireLogin(authorizationHeader);
        return ApiResponse.success(service.latest(clanId, actorId));
    }

    @PostMapping("/submission-gate")
    public ApiResponse<WorkbenchQualityCheckResponse> submissionGate(
            @Positive @RequestParam Long clanId,
            @RequestBody(required = false) WorkbenchQualityCheckRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        Long actorId = authorization.requireLogin(authorizationHeader);
        return ApiResponse.success(service.ensureSubmissionAllowed(clanId, request, actorId));
    }
}
