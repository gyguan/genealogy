package com.genealogy.tree.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.tree.application.TreeApplicationService;
import com.genealogy.tree.application.TreeQueryContextApplicationService;
import com.genealogy.tree.application.TreeSummaryApplicationService;
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
    private final TreeSummaryApplicationService treeSummaryApplicationService;
    private final TreeQueryContextApplicationService treeQueryContextApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public TreeController(
            TreeApplicationService treeApplicationService,
            TreeSummaryApplicationService treeSummaryApplicationService,
            TreeQueryContextApplicationService treeQueryContextApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.treeApplicationService = treeApplicationService;
        this.treeSummaryApplicationService = treeSummaryApplicationService;
        this.treeQueryContextApplicationService = treeQueryContextApplicationService;
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
        TreeGraphResponse graph = treeApplicationService.personLineage(
                personId, direction, relationScopes, dataView,
                maxDepth, maxNodes, maxEdges, actorId
        );
        return ApiResponse.success(enrichPersonGraph(personId, actorId, graph));
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
        TreeGraphResponse graph = treeApplicationService.family(
                personId, relationScopes, dataView, maxNodes, maxEdges, actorId
        );
        return ApiResponse.success(enrichPersonGraph(personId, actorId, graph));
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
        TreeGraphResponse graph = treeApplicationService.descendants(
                rootPersonId, maxDepth, relationScopes, dataView,
                maxNodes, maxEdges, actorId
        );
        return ApiResponse.success(enrichPersonGraph(rootPersonId, actorId, graph));
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
        TreeGraphResponse graph = treeApplicationService.ancestors(
                personId, maxDepth, relationScopes, dataView,
                maxNodes, maxEdges, actorId
        );
        return ApiResponse.success(enrichPersonGraph(personId, actorId, graph));
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
        TreeGraphResponse graph = treeApplicationService.branchLineage(
                clanId, branchId, includeSubBranches, relationScopes, dataView,
                maxDepth, maxNodes, maxEdges, actorId
        );
        return ApiResponse.success(treeSummaryApplicationService.enrich(clanId, actorId, graph));
    }

    private TreeGraphResponse enrichPersonGraph(Long personId, Long actorId, TreeGraphResponse graph) {
        Long clanId = treeQueryContextApplicationService.requireClanId(personId);
        return treeSummaryApplicationService.enrich(clanId, actorId, graph);
    }
}
