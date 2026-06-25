package com.genealogy.generation.controller;

import com.genealogy.common.api.ApiResponse;
import com.genealogy.generation.application.GenerationApplicationService;
import com.genealogy.generation.dto.GenSchemeCreateRequest;
import com.genealogy.generation.dto.GenSchemeResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
}
