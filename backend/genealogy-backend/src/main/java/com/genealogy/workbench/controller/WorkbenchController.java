package com.genealogy.workbench.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageQuery;
import com.genealogy.common.api.PageResponse;
import com.genealogy.workbench.application.WorkbenchApplicationService;
import com.genealogy.workbench.dto.WorkbenchSummaryResponse;
import com.genealogy.workbench.dto.WorkbenchTaskResponse;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/workbench")
public class WorkbenchController {

    private final WorkbenchApplicationService workbenchApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public WorkbenchController(
            WorkbenchApplicationService workbenchApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.workbenchApplicationService = workbenchApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping("/summary")
    public ApiResponse<WorkbenchSummaryResponse> summary(
            @Positive @RequestParam Long clanId,
            @RequestParam(required = false) Long branchId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(workbenchApplicationService.summary(clanId, branchId, actorId));
    }

    @GetMapping("/tasks")
    public ApiResponse<PageResponse<WorkbenchTaskResponse>> tasks(
            @Positive @RequestParam Long clanId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String risk,
            PageQuery pageQuery,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(workbenchApplicationService.tasks(
                clanId,
                branchId,
                type,
                status,
                risk,
                pageQuery.normalizedPageNo(),
                pageQuery.normalizedPageSize(),
                actorId
        ));
    }
}
