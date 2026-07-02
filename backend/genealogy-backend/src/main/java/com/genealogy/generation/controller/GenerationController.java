package com.genealogy.generation.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.generation.application.GenerationApplicationService;
import com.genealogy.generation.dto.GenItemRequest;
import com.genealogy.generation.dto.GenItemResponse;
import com.genealogy.generation.dto.GenSchemeCreateRequest;
import com.genealogy.generation.dto.GenSchemeResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class GenerationController {

    private final GenerationApplicationService generationApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public GenerationController(
            GenerationApplicationService generationApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.generationApplicationService = generationApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/clans/{clanId}/generation-schemes")
    public ApiResponse<GenSchemeResponse> createScheme(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody GenSchemeCreateRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(generationApplicationService.createScheme(clanId, request, actorId));
    }

    @GetMapping("/clans/{clanId}/generation-schemes")
    public ApiResponse<List<GenSchemeResponse>> listSchemes(
            @Positive @PathVariable Long clanId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requireClanMember(clanId, actorId);
        return ApiResponse.success(generationApplicationService.listSchemes(clanId));
    }

    @PutMapping("/generation-schemes/{schemeId}/items")
    public ApiResponse<List<GenItemResponse>> replaceItems(
            @Positive @PathVariable Long schemeId,
            @Valid @RequestBody List<GenItemRequest> requests,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(generationApplicationService.replaceItems(schemeId, requests, actorId));
    }

    @PostMapping("/generation-schemes/{schemeId}/items")
    public ApiResponse<GenItemResponse> addItem(
            @Positive @PathVariable Long schemeId,
            @Valid @RequestBody GenItemRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(generationApplicationService.addItem(schemeId, request, actorId));
    }

    @GetMapping("/generation-schemes/{schemeId}/items")
    public ApiResponse<List<GenItemResponse>> listItems(
            @Positive @PathVariable Long schemeId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        GenSchemeResponse scheme = generationApplicationService.getScheme(schemeId);
        authorizationApplicationService.requireClanMember(scheme.clanId(), actorId);
        return ApiResponse.success(generationApplicationService.listItems(schemeId));
    }

    @GetMapping("/generation-schemes/{schemeId}/items/{generationNo}")
    public ApiResponse<GenItemResponse> getItemByGenerationNo(
            @Positive @PathVariable Long schemeId,
            @Positive @PathVariable Integer generationNo,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        GenSchemeResponse scheme = generationApplicationService.getScheme(schemeId);
        authorizationApplicationService.requireClanMember(scheme.clanId(), actorId);
        return ApiResponse.success(generationApplicationService.getItemByGenerationNo(schemeId, generationNo));
    }
}
