package com.genealogy.culture.controller;

import com.genealogy.auth.application.RequestContextApplicationService;
import com.genealogy.auth.dto.RequestUserContext;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.culture.application.CultureItemGovernanceApplicationService;
import com.genealogy.culture.dto.CultureArchiveRequest;
import com.genealogy.culture.dto.CultureCommandResponse;
import com.genealogy.culture.dto.CultureSubmitReviewRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/culture-items")
public class CultureItemGovernanceController {

    private final CultureItemGovernanceApplicationService governanceApplicationService;
    private final RequestContextApplicationService requestContextApplicationService;

    public CultureItemGovernanceController(
            CultureItemGovernanceApplicationService governanceApplicationService,
            RequestContextApplicationService requestContextApplicationService
    ) {
        this.governanceApplicationService = governanceApplicationService;
        this.requestContextApplicationService = requestContextApplicationService;
    }

    @PostMapping("/{cultureItemId}/submit-review")
    public ApiResponse<CultureCommandResponse> submitReview(
            @Positive @PathVariable Long cultureItemId,
            @Valid @RequestBody(required = false) CultureSubmitReviewRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(governanceApplicationService.submitReview(
                cultureItemId,
                request == null ? new CultureSubmitReviewRequest(null) : request,
                context.userId(),
                context.requestId(),
                context.clientIp()
        ));
    }

    @PostMapping("/{cultureItemId}/archive")
    public ApiResponse<CultureCommandResponse> archive(
            @Positive @PathVariable Long cultureItemId,
            @Valid @RequestBody CultureArchiveRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(governanceApplicationService.archive(
                cultureItemId,
                request,
                context.userId(),
                context.requestId(),
                context.clientIp()
        ));
    }
}
