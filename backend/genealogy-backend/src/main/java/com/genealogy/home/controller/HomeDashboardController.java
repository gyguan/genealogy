package com.genealogy.home.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.home.application.HomeDashboardApplicationService;
import com.genealogy.home.dto.HomeDashboardResponse;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/clans/{clanId}/dashboard")
public class HomeDashboardController {

    private final HomeDashboardApplicationService homeDashboardApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public HomeDashboardController(
            HomeDashboardApplicationService homeDashboardApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.homeDashboardApplicationService = homeDashboardApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping
    public ApiResponse<HomeDashboardResponse> getDashboard(
            @Positive @PathVariable Long clanId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(homeDashboardApplicationService.getDashboard(clanId, actorId));
    }
}
