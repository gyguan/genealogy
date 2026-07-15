package com.genealogy.culture.controller;

import com.genealogy.auth.application.RequestContextApplicationService;
import com.genealogy.auth.dto.RequestUserContext;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.culture.application.CultureQualityApplicationService;
import com.genealogy.culture.dto.CultureQualityResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1")
public class CultureQualityController {

    private final CultureQualityApplicationService qualityApplicationService;
    private final RequestContextApplicationService requestContextApplicationService;

    public CultureQualityController(
            CultureQualityApplicationService qualityApplicationService,
            RequestContextApplicationService requestContextApplicationService
    ) {
        this.qualityApplicationService = qualityApplicationService;
        this.requestContextApplicationService = requestContextApplicationService;
    }

    @GetMapping("/clans/{clanId}/culture-quality")
    public ApiResponse<CultureQualityResponse> quality(
            @Positive @PathVariable Long clanId,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(qualityApplicationService.getQuality(clanId, context.userId()));
    }
}
