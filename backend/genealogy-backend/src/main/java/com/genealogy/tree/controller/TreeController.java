package com.genealogy.tree.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.tree.application.TreeApplicationService;
import com.genealogy.tree.dto.TreeGraphResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/tree")
public class TreeController {

    private final TreeApplicationService treeApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public TreeController(
            TreeApplicationService treeApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.treeApplicationService = treeApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping("/person/{personId}")
    public ApiResponse<TreeGraphResponse> personLineage(
            @Positive @PathVariable Long personId,
            @RequestParam(required = false) String direction,
            @RequestParam(required = false) List<String> relationScopes,
            @RequestParam(required = false) String dataView,
            @Positive @Max(20) @RequestParam(required = false) Integer maxDepth,
            @Positive @Max(2000) @RequestParam(required = false) Integer maxNodes,
            @Positive @Max(4000) @RequestParam(required = false) Integer maxEdges,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(treeApplicationService.personLineage(
                personId, direction, relationScopes, dataView, maxDepth, actorId
        ));
    }

    @GetMapping("/person/{personId}/family")
    public ApiResponse<TreeGraphResponse> family(
            @Positive @PathVariable Long personId,
            @RequestParam(required = false) List<String> relationScopes,
            @RequestParam(required = false) String dataView,
            @Positive @Max(2000) @RequestParam(required = false) Integer maxNodes,
            @Positive @Max(4000) @RequestParam(required = false) Integer maxEdges,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(treeApplicationService.family(personId, relationScopes, dataView, actorId));
    }

    @GetMapping("/descendants")
    public ApiResponse<TreeGraphResponse> descendants(
            @Positive @RequestParam Long rootPersonId,
            @Positive @Max(20) @RequestParam(required = false) Integer maxDepth,
            @RequestParam(required = false) List<String> relationScopes,
            @RequestParam(required = false) String dataView,
            @Positive @Max(2000) @RequestParam(required = false) Integer maxNodes,
            @Positive @Max(4000) @RequestParam(required = false) Integer maxEdges,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(treeApplicationService.descendants(
                rootPersonId, maxDepth, relationScopes, dataView, actorId
        ));
    }

    @GetMapping("/ancestors")
    public ApiResponse<TreeGraphResponse> ancestors(
            @Positive @RequestParam Long personId,
            @Positive @Max(20) @RequestParam(required = false) Integer maxDepth,
            @RequestParam(required = false) List<String> relationScopes,
            @RequestParam(required = false) String dataView,
            @Positive @Max(2000) @RequestParam(required = false) Integer maxNodes,
            @Positive @Max(4000) @RequestParam(required = false) Integer maxEdges,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(treeApplicationService.ancestors(
                personId, maxDepth, relationScopes, dataView, actorId
        ));
    }

    @GetMapping("/clans/{clanId}/branches/{branchId}/lineage")
    public ApiResponse<TreeGraphResponse> branchLineage(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long branchId,
            @RequestParam(defaultValue = "true") boolean includeSubBranches,
            @RequestParam(required = false) List<String> relationScopes,
            @RequestParam(required = false) String dataView,
            @Positive @Max(20) @RequestParam(required = false) Integer maxDepth,
            @Positive @Max(2000) @RequestParam(required = false) Integer maxNodes,
            @Positive @Max(4000) @RequestParam(required = false) Integer maxEdges,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(treeApplicationService.branchLineage(
                clanId, branchId, includeSubBranches, relationScopes, dataView, actorId
        ));
    }
}
