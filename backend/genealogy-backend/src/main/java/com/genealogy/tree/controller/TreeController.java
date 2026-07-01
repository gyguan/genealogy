package com.genealogy.tree.controller;

import com.genealogy.common.api.ApiResponse;
import com.genealogy.tree.application.TreeApplicationService;
import com.genealogy.tree.dto.TreeGraphResponse;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/tree")
public class TreeController {

    private final TreeApplicationService treeApplicationService;

    public TreeController(TreeApplicationService treeApplicationService) {
        this.treeApplicationService = treeApplicationService;
    }

    @GetMapping("/person/{personId}/family")
    public ApiResponse<TreeGraphResponse> family(@Positive @PathVariable Long personId) {
        return ApiResponse.success(treeApplicationService.family(personId));
    }

    @GetMapping("/descendants")
    public ApiResponse<TreeGraphResponse> descendants(
            @Positive @RequestParam Long rootPersonId,
            @RequestParam(required = false) Integer maxDepth
    ) {
        return ApiResponse.success(treeApplicationService.descendants(rootPersonId, maxDepth));
    }

    @GetMapping("/ancestors")
    public ApiResponse<TreeGraphResponse> ancestors(
            @Positive @RequestParam Long personId,
            @RequestParam(required = false) Integer maxDepth
    ) {
        return ApiResponse.success(treeApplicationService.ancestors(personId, maxDepth));
    }

    @GetMapping("/clans/{clanId}/branches/{branchId}/lineage")
    public ApiResponse<TreeGraphResponse> branchLineage(@Positive @PathVariable Long clanId, @Positive @PathVariable Long branchId) {
        return ApiResponse.success(treeApplicationService.branchLineage(clanId, branchId));
    }
}
