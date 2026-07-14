package com.genealogy.imports.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.imports.application.ImportJobExecutionApplicationService;
import com.genealogy.imports.dto.ImportJobExecutionResponse;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/clans/{clanId}/imports/{jobId}/execution")
public class ImportExecutionController {

    private final ImportJobExecutionApplicationService executionApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ImportExecutionController(
            ImportJobExecutionApplicationService executionApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.executionApplicationService = executionApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping
    public ApiResponse<ImportJobExecutionResponse> get(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(executionApplicationService.get(clanId, jobId, actorId));
    }

    @PostMapping("/pause")
    public ApiResponse<ImportJobExecutionResponse> pause(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(executionApplicationService.pause(clanId, jobId, actorId));
    }

    @PostMapping("/resume")
    public ApiResponse<ImportJobExecutionResponse> resume(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(executionApplicationService.resume(clanId, jobId, actorId));
    }

    @PostMapping("/cancel")
    public ApiResponse<ImportJobExecutionResponse> cancel(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(executionApplicationService.cancel(clanId, jobId, actorId));
    }

    @PostMapping("/retry")
    public ApiResponse<ImportJobExecutionResponse> retry(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long jobId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(executionApplicationService.retry(clanId, jobId, actorId));
    }
}
