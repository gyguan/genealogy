package com.genealogy.source.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageQuery;
import com.genealogy.common.api.PageResponse;
import com.genealogy.source.application.SourceApplicationService;
import com.genealogy.source.dto.SourceCreateRequest;
import com.genealogy.source.dto.SourceResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1")
public class SourceController {

    private final SourceApplicationService sourceApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public SourceController(SourceApplicationService sourceApplicationService, AuthorizationApplicationService authorizationApplicationService) {
        this.sourceApplicationService = sourceApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/clans/{clanId}/sources")
    public ApiResponse<SourceResponse> create(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody SourceCreateRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(sourceApplicationService.create(clanId, request, actorId));
    }

    @GetMapping("/sources/{id}")
    public ApiResponse<SourceResponse> get(@Positive @PathVariable Long id) {
        return ApiResponse.success(sourceApplicationService.get(id));
    }

    @GetMapping("/clans/{clanId}/sources")
    public ApiResponse<PageResponse<SourceResponse>> listByClan(@Positive @PathVariable Long clanId, PageQuery pageQuery) {
        return ApiResponse.success(sourceApplicationService.listByClan(
                clanId,
                pageQuery.normalizedPageNo(),
                pageQuery.normalizedPageSize()
        ));
    }
}
