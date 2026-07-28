package com.genealogy.workbench.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.workbench.application.WorkbenchTaskActionApplicationService;
import com.genealogy.workbench.dto.WorkbenchTaskActionRequest;
import com.genealogy.workbench.dto.WorkbenchTaskActionResponse;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/workbench/tasks")
public class WorkbenchTaskActionController {

    private final WorkbenchTaskActionApplicationService actionApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public WorkbenchTaskActionController(
            WorkbenchTaskActionApplicationService actionApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.actionApplicationService = actionApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/{taskKey}/actions")
    public ApiResponse<WorkbenchTaskActionResponse> execute(
            @PathVariable String taskKey,
            @Valid @RequestBody WorkbenchTaskActionRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(actionApplicationService.execute(taskKey, request, actorId));
    }
}
