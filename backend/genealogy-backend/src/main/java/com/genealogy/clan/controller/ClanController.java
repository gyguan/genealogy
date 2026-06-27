package com.genealogy.clan.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.clan.application.ClanApplicationService;
import com.genealogy.clan.dto.ClanCreateRequest;
import com.genealogy.clan.dto.ClanResponse;
import com.genealogy.clan.dto.ClanUpdateRequest;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageQuery;
import com.genealogy.common.api.PageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/clans")
public class ClanController {

    private final ClanApplicationService clanApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ClanController(ClanApplicationService clanApplicationService, AuthorizationApplicationService authorizationApplicationService) {
        this.clanApplicationService = clanApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping
    public ApiResponse<ClanResponse> create(
            @Valid @RequestBody ClanCreateRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(clanApplicationService.create(request, actorId));
    }

    @GetMapping("/{id}")
    public ApiResponse<ClanResponse> get(@Positive @PathVariable Long id) {
        return ApiResponse.success(clanApplicationService.get(id));
    }

    @GetMapping
    public ApiResponse<PageResponse<ClanResponse>> list(PageQuery pageQuery) {
        return ApiResponse.success(clanApplicationService.list(pageQuery.normalizedPageNo(), pageQuery.normalizedPageSize()));
    }

    @PutMapping("/{id}")
    public ApiResponse<ClanResponse> update(
            @Positive @PathVariable Long id,
            @Valid @RequestBody ClanUpdateRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(clanApplicationService.update(id, request, actorId));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @Positive @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        clanApplicationService.delete(id, actorId);
        return ApiResponse.success();
    }
}
