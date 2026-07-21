package com.genealogy.workbench.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.workbench.application.WorkbenchTaskHistoryApplicationService;
import com.genealogy.workbench.dto.WorkbenchHistoryItemResponse;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/workbench/tasks")
public class WorkbenchTaskHistoryController {

    private final WorkbenchTaskHistoryApplicationService workbenchTaskHistoryApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public WorkbenchTaskHistoryController(
            WorkbenchTaskHistoryApplicationService workbenchTaskHistoryApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.workbenchTaskHistoryApplicationService = workbenchTaskHistoryApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping("/{taskKey}/history")
    public ApiResponse<List<WorkbenchHistoryItemResponse>> history(
            @PathVariable String taskKey,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(workbenchTaskHistoryApplicationService.history(taskKey, actorId));
    }
}
