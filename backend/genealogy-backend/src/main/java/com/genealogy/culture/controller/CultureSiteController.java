package com.genealogy.culture.controller;

import com.genealogy.auth.application.RequestContextApplicationService;
import com.genealogy.auth.dto.RequestUserContext;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageQuery;
import com.genealogy.culture.application.CultureSiteApplicationService;
import com.genealogy.culture.application.CultureSiteGovernanceApplicationService;
import com.genealogy.culture.domain.CultureSiteDomainService;
import com.genealogy.culture.dto.CultureArchiveRequest;
import com.genealogy.culture.dto.CultureCommandResponse;
import com.genealogy.culture.dto.CultureSiteCreateRequest;
import com.genealogy.culture.dto.CultureSiteDetailResponse;
import com.genealogy.culture.dto.CultureSitePageResponse;
import com.genealogy.culture.dto.CultureSiteSearchCriteria;
import com.genealogy.culture.dto.CultureSiteUpdateRequest;
import com.genealogy.culture.dto.CultureSubmitReviewRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1")
public class CultureSiteController {

    private final CultureSiteApplicationService applicationService;
    private final CultureSiteGovernanceApplicationService governanceApplicationService;
    private final RequestContextApplicationService requestContextApplicationService;

    public CultureSiteController(
            CultureSiteApplicationService applicationService,
            CultureSiteGovernanceApplicationService governanceApplicationService,
            RequestContextApplicationService requestContextApplicationService
    ) {
        this.applicationService = applicationService;
        this.governanceApplicationService = governanceApplicationService;
        this.requestContextApplicationService = requestContextApplicationService;
    }

    @GetMapping("/clans/{clanId}/culture-sites")
    public ApiResponse<CultureSitePageResponse> list(
            @Positive @PathVariable Long clanId,
            PageQuery pageQuery,
            @Size(max = 100) @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String siteType,
            @Positive @RequestParam(required = false) Long branchId,
            @Size(max = 500) @RequestParam(required = false) String addressText,
            @Size(max = 200) @RequestParam(required = false) String foundedPeriod,
            @Size(max = 100) @RequestParam(required = false) String currentStatus,
            @Positive @RequestParam(required = false) Long relatedPersonId,
            @RequestParam(required = false) String dataStatus,
            @RequestParam(required = false) String privacyLevel,
            @RequestParam(required = false) Boolean featuredOnHome,
            @RequestParam(required = false) String sort,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(applicationService.search(
                clanId,
                new CultureSiteSearchCriteria(
                        keyword, siteType, branchId, addressText, foundedPeriod, currentStatus, relatedPersonId,
                        dataStatus, privacyLevel, featuredOnHome, sort
                ),
                pageQuery.normalizedPageNo(),
                Math.min(pageQuery.normalizedPageSize(), CultureSiteDomainService.MAX_PAGE_SIZE),
                context.userId()
        ));
    }

    @PostMapping("/clans/{clanId}/culture-sites")
    public ApiResponse<CultureSiteDetailResponse> create(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody CultureSiteCreateRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(applicationService.create(
                clanId, request, context.userId(), context.requestId(), context.clientIp()
        ));
    }

    @GetMapping("/culture-sites/{cultureSiteId}")
    public ApiResponse<CultureSiteDetailResponse> get(
            @Positive @PathVariable Long cultureSiteId,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(applicationService.getDetail(cultureSiteId, context.userId()));
    }

    @PutMapping("/culture-sites/{cultureSiteId}")
    public ApiResponse<CultureSiteDetailResponse> update(
            @Positive @PathVariable Long cultureSiteId,
            @Valid @RequestBody CultureSiteUpdateRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(applicationService.update(
                cultureSiteId, request, context.userId(), context.requestId(), context.clientIp()
        ));
    }

    @DeleteMapping("/culture-sites/{cultureSiteId}")
    public ApiResponse<CultureCommandResponse> delete(
            @Positive @PathVariable Long cultureSiteId,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(applicationService.delete(
                cultureSiteId, context.userId(), context.requestId(), context.clientIp()
        ));
    }

    @PostMapping("/culture-sites/{cultureSiteId}/submit-review")
    public ApiResponse<CultureCommandResponse> submitReview(
            @Positive @PathVariable Long cultureSiteId,
            @Valid @RequestBody(required = false) CultureSubmitReviewRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(governanceApplicationService.submitReview(
                cultureSiteId, request, context.userId(), context.requestId(), context.clientIp()
        ));
    }

    @PostMapping("/culture-sites/{cultureSiteId}/archive")
    public ApiResponse<CultureCommandResponse> archive(
            @Positive @PathVariable Long cultureSiteId,
            @Valid @RequestBody CultureArchiveRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(governanceApplicationService.archive(
                cultureSiteId, request, context.userId(), context.requestId(), context.clientIp()
        ));
    }
}
