package com.genealogy.generation.controller;

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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class GenerationController {

    private final GenerationApplicationService generationApplicationService;

    public GenerationController(GenerationApplicationService generationApplicationService) {
        this.generationApplicationService = generationApplicationService;
    }

    @PostMapping("/clans/{clanId}/generation-schemes")
    public ApiResponse<GenSchemeResponse> createScheme(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody GenSchemeCreateRequest request
    ) {
        return ApiResponse.success(generationApplicationService.createScheme(clanId, request));
    }

    @GetMapping("/clans/{clanId}/generation-schemes")
    public ApiResponse<List<GenSchemeResponse>> listSchemes(@Positive @PathVariable Long clanId) {
        return ApiResponse.success(generationApplicationService.listSchemes(clanId));
    }

    @PutMapping("/generation-schemes/{schemeId}/items")
    public ApiResponse<List<GenItemResponse>> replaceItems(
            @Positive @PathVariable Long schemeId,
            @Valid @RequestBody List<GenItemRequest> requests
    ) {
        return ApiResponse.success(generationApplicationService.replaceItems(schemeId, requests));
    }

    @PostMapping("/generation-schemes/{schemeId}/items")
    public ApiResponse<GenItemResponse> addItem(
            @Positive @PathVariable Long schemeId,
            @Valid @RequestBody GenItemRequest request
    ) {
        return ApiResponse.success(generationApplicationService.addItem(schemeId, request));
    }

    @GetMapping("/generation-schemes/{schemeId}/items")
    public ApiResponse<List<GenItemResponse>> listItems(@Positive @PathVariable Long schemeId) {
        return ApiResponse.success(generationApplicationService.listItems(schemeId));
    }

    @GetMapping("/generation-schemes/{schemeId}/items/{generationNo}")
    public ApiResponse<GenItemResponse> getItemByGenerationNo(
            @Positive @PathVariable Long schemeId,
            @Positive @PathVariable Integer generationNo
    ) {
        return ApiResponse.success(generationApplicationService.getItemByGenerationNo(schemeId, generationNo));
    }
}
