package com.genealogy.relationship.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.relationship.application.RelationshipApplicationService;
import com.genealogy.relationship.dto.RelationshipCreateRequest;
import com.genealogy.relationship.dto.RelationshipResponse;
import com.genealogy.relationship.dto.RelationshipUpdateRequest;
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

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class RelationshipController {

    private final RelationshipApplicationService relationshipApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public RelationshipController(
            RelationshipApplicationService relationshipApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.relationshipApplicationService = relationshipApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/clans/{clanId}/relationships")
    public ApiResponse<RelationshipResponse> create(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody RelationshipCreateRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(relationshipApplicationService.create(clanId, request, actorId));
    }

    @GetMapping("/relationships/{id}")
    public ApiResponse<RelationshipResponse> get(@Positive @PathVariable Long id) {
        return ApiResponse.success(relationshipApplicationService.get(id));
    }

    @GetMapping("/persons/{personId}/relationships")
    public ApiResponse<List<RelationshipResponse>> listByPerson(@Positive @PathVariable Long personId) {
        return ApiResponse.success(relationshipApplicationService.listByPerson(personId));
    }

    @PutMapping("/relationships/{id}")
    public ApiResponse<RelationshipResponse> update(
            @Positive @PathVariable Long id,
            @Valid @RequestBody RelationshipUpdateRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(relationshipApplicationService.update(id, request, actorId));
    }

    @DeleteMapping("/relationships/{id}")
    public ApiResponse<Void> delete(
            @Positive @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        relationshipApplicationService.delete(id, actorId);
        return ApiResponse.success();
    }
}
