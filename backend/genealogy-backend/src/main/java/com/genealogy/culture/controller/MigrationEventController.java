package com.genealogy.culture.controller;

import com.genealogy.auth.application.RequestContextApplicationService;
import com.genealogy.auth.dto.RequestUserContext;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageQuery;
import com.genealogy.culture.application.MigrationEventApplicationService;
import com.genealogy.culture.application.MigrationEventGovernanceApplicationService;
import com.genealogy.culture.domain.MigrationEventDomainService;
import com.genealogy.culture.dto.CultureArchiveRequest;
import com.genealogy.culture.dto.CultureCommandResponse;
import com.genealogy.culture.dto.CultureSubmitReviewRequest;
import com.genealogy.culture.dto.MigrationEventCreateRequest;
import com.genealogy.culture.dto.MigrationEventDetailResponse;
import com.genealogy.culture.dto.MigrationEventPageResponse;
import com.genealogy.culture.dto.MigrationEventSearchCriteria;
import com.genealogy.culture.dto.MigrationEventUpdateRequest;
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
public class MigrationEventController {

    private final MigrationEventApplicationService migrationEventApplicationService;
    private final MigrationEventGovernanceApplicationService governanceApplicationService;
    private final RequestContextApplicationService requestContextApplicationService;

    public MigrationEventController(
            MigrationEventApplicationService migrationEventApplicationService,
            MigrationEventGovernanceApplicationService governanceApplicationService,
            RequestContextApplicationService requestContextApplicationService
    ) {
        this.migrationEventApplicationService = migrationEventApplicationService;
        this.governanceApplicationService = governanceApplicationService;
        this.requestContextApplicationService = requestContextApplicationService;
    }

    @GetMapping("/clans/{clanId}/migration-events")
    public ApiResponse<MigrationEventPageResponse> list(
            @Positive @PathVariable Long clanId,
            PageQuery pageQuery,
            @Size(max = 100) @RequestParam(required = false) String keyword,
            @Positive @RequestParam(required = false) Long branchId,
            @Size(max = 100) @RequestParam(required = false) String fromLocation,
            @Size(max = 100) @RequestParam(required = false) String toLocation,
            @Size(max = 100) @RequestParam(required = false) String migrationTimeText,
            @Positive @RequestParam(required = false) Long founderPersonId,
            @RequestParam(required = false) String dataStatus,
            @RequestParam(required = false) String privacyLevel,
            @RequestParam(required = false) Boolean hasSource,
            @RequestParam(required = false) String sort,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        MigrationEventSearchCriteria criteria = new MigrationEventSearchCriteria(
                keyword, branchId, fromLocation, toLocation, migrationTimeText, founderPersonId,
                dataStatus, privacyLevel, hasSource, sort
        );
        return ApiResponse.success(migrationEventApplicationService.search(
                clanId,
                criteria,
                pageQuery.normalizedPageNo(),
                Math.min(pageQuery.normalizedPageSize(), MigrationEventDomainService.MAX_PAGE_SIZE),
                context.userId()
        ));
    }

    @PostMapping("/clans/{clanId}/migration-events")
    public ApiResponse<MigrationEventDetailResponse> create(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody MigrationEventCreateRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(migrationEventApplicationService.create(
                clanId, request, context.userId(), context.requestId(), context.clientIp()
        ));
    }

    @GetMapping("/migration-events/{migrationEventId}")
    public ApiResponse<MigrationEventDetailResponse> get(
            @Positive @PathVariable Long migrationEventId,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(migrationEventApplicationService.getDetail(migrationEventId, context.userId()));
    }

    @PutMapping("/migration-events/{migrationEventId}")
    public ApiResponse<MigrationEventDetailResponse> update(
            @Positive @PathVariable Long migrationEventId,
            @Valid @RequestBody MigrationEventUpdateRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(migrationEventApplicationService.update(
                migrationEventId, request, context.userId(), context.requestId(), context.clientIp()
        ));
    }

    @DeleteMapping("/migration-events/{migrationEventId}")
    public ApiResponse<CultureCommandResponse> delete(
            @Positive @PathVariable Long migrationEventId,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(migrationEventApplicationService.delete(
                migrationEventId, context.userId(), context.requestId(), context.clientIp()
        ));
    }

    @PostMapping("/migration-events/{migrationEventId}/submit-review")
    public ApiResponse<CultureCommandResponse> submitReview(
            @Positive @PathVariable Long migrationEventId,
            @Valid @RequestBody(required = false) CultureSubmitReviewRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(governanceApplicationService.submitReview(
                migrationEventId,
                request == null ? new CultureSubmitReviewRequest(null) : request,
                context.userId(),
                context.requestId(),
                context.clientIp()
        ));
    }

    @PostMapping("/migration-events/{migrationEventId}/archive")
    public ApiResponse<CultureCommandResponse> archive(
            @Positive @PathVariable Long migrationEventId,
            @Valid @RequestBody CultureArchiveRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(governanceApplicationService.archive(
                migrationEventId, request, context.userId(), context.requestId(), context.clientIp()
        ));
    }
}
