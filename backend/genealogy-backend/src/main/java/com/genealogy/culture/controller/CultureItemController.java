package com.genealogy.culture.controller;

import com.genealogy.auth.application.RequestContextApplicationService;
import com.genealogy.auth.dto.RequestUserContext;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageQuery;
import com.genealogy.culture.application.CultureDeletionApplicationService;
import com.genealogy.culture.application.CultureItemApplicationService;
import com.genealogy.culture.application.CultureOverviewApplicationService;
import com.genealogy.culture.domain.CultureItemDomainService;
import com.genealogy.culture.dto.CultureCommandResponse;
import com.genealogy.culture.dto.CultureItemCreateRequest;
import com.genealogy.culture.dto.CultureItemDetailResponse;
import com.genealogy.culture.dto.CultureItemPageResponse;
import com.genealogy.culture.dto.CultureItemSearchCriteria;
import com.genealogy.culture.dto.CultureItemUpdateRequest;
import com.genealogy.culture.dto.CultureOverviewResponse;
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

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class CultureItemController {

    private final CultureItemApplicationService cultureItemApplicationService;
    private final CultureOverviewApplicationService cultureOverviewApplicationService;
    private final CultureDeletionApplicationService cultureDeletionApplicationService;
    private final RequestContextApplicationService requestContextApplicationService;

    public CultureItemController(
            CultureItemApplicationService cultureItemApplicationService,
            CultureOverviewApplicationService cultureOverviewApplicationService,
            CultureDeletionApplicationService cultureDeletionApplicationService,
            RequestContextApplicationService requestContextApplicationService
    ) {
        this.cultureItemApplicationService = cultureItemApplicationService;
        this.cultureOverviewApplicationService = cultureOverviewApplicationService;
        this.cultureDeletionApplicationService = cultureDeletionApplicationService;
        this.requestContextApplicationService = requestContextApplicationService;
    }

    @GetMapping("/clans/{clanId}/culture-overview")
    public ApiResponse<CultureOverviewResponse> overview(
            @Positive @PathVariable Long clanId,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(cultureOverviewApplicationService.getOverview(clanId, context.userId()));
    }

    @GetMapping("/clans/{clanId}/culture-items")
    public ApiResponse<CultureItemPageResponse> list(
            @Positive @PathVariable Long clanId,
            PageQuery pageQuery,
            @Size(max = 100) @RequestParam(required = false) String keyword,
            @Size(max = 20) @RequestParam(name = "category", required = false) List<String> categories,
            @Size(max = 100) @RequestParam(name = "branchId", required = false) List<@Positive Long> branchIds,
            @Size(max = 20) @RequestParam(name = "dataStatus", required = false) List<String> dataStatuses,
            @Size(max = 20) @RequestParam(name = "privacyLevel", required = false) List<String> privacyLevels,
            @Size(max = 2) @RequestParam(name = "hasSource", required = false) List<Boolean> hasSourceValues,
            @Size(max = 2) @RequestParam(name = "featuredOnHome", required = false) List<Boolean> featuredOnHomeValues,
            @RequestParam(required = false) String sort,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        CultureItemSearchCriteria criteria = CultureItemSearchCriteria.multi(
                keyword,
                categories,
                branchIds,
                dataStatuses,
                privacyLevels,
                hasSourceValues,
                featuredOnHomeValues,
                sort
        );
        return ApiResponse.success(cultureItemApplicationService.search(
                clanId,
                criteria,
                pageQuery.normalizedPageNo(),
                Math.min(pageQuery.normalizedPageSize(), CultureItemDomainService.MAX_PAGE_SIZE),
                context.userId()
        ));
    }

    @PostMapping("/clans/{clanId}/culture-items")
    public ApiResponse<CultureItemDetailResponse> create(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody CultureItemCreateRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(cultureItemApplicationService.create(
                clanId, request, context.userId(), context.requestId(), context.clientIp()
        ));
    }

    @GetMapping("/culture-items/{cultureItemId}")
    public ApiResponse<CultureItemDetailResponse> get(
            @Positive @PathVariable Long cultureItemId,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(cultureItemApplicationService.getDetail(cultureItemId, context.userId()));
    }

    @PutMapping("/culture-items/{cultureItemId}")
    public ApiResponse<CultureItemDetailResponse> update(
            @Positive @PathVariable Long cultureItemId,
            @Valid @RequestBody CultureItemUpdateRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(cultureItemApplicationService.update(
                cultureItemId, request, context.userId(), context.requestId(), context.clientIp()
        ));
    }

    @DeleteMapping("/culture-items/{cultureItemId}")
    public ApiResponse<CultureCommandResponse> delete(
            @Positive @PathVariable Long cultureItemId,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(cultureDeletionApplicationService.deleteCultureItem(
                cultureItemId, context.userId(), context.requestId(), context.clientIp()
        ));
    }
}
