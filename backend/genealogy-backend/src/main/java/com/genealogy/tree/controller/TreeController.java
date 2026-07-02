package com.genealogy.tree.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.tree.application.TreeApplicationService;
import com.genealogy.tree.dto.TreeGraphResponse;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/tree")
public class TreeController {

    private final TreeApplicationService treeApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final PersonRepository personRepository;

    public TreeController(
            TreeApplicationService treeApplicationService,
            AuthorizationApplicationService authorizationApplicationService,
            PersonRepository personRepository
    ) {
        this.treeApplicationService = treeApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
        this.personRepository = personRepository;
    }

    @GetMapping("/person/{personId}/family")
    public ApiResponse<TreeGraphResponse> family(
            @Positive @PathVariable Long personId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        requirePersonClanAccess(personId, authorization);
        return ApiResponse.success(treeApplicationService.family(personId));
    }

    @GetMapping("/descendants")
    public ApiResponse<TreeGraphResponse> descendants(
            @Positive @RequestParam Long rootPersonId,
            @RequestParam(required = false) Integer maxDepth,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        requirePersonClanAccess(rootPersonId, authorization);
        return ApiResponse.success(treeApplicationService.descendants(rootPersonId, maxDepth));
    }

    @GetMapping("/ancestors")
    public ApiResponse<TreeGraphResponse> ancestors(
            @Positive @RequestParam Long personId,
            @RequestParam(required = false) Integer maxDepth,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        requirePersonClanAccess(personId, authorization);
        return ApiResponse.success(treeApplicationService.ancestors(personId, maxDepth));
    }

    @GetMapping("/clans/{clanId}/branches/{branchId}/lineage")
    public ApiResponse<TreeGraphResponse> branchLineage(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long branchId,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requireClanMember(clanId, actorId);
        return ApiResponse.success(treeApplicationService.branchLineage(clanId, branchId));
    }

    private void requirePersonClanAccess(Long personId, String authorization) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        PersonEntity person = personRepository.findByIdAndDeletedAtIsNull(personId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
        authorizationApplicationService.requireClanMember(person.getClanId(), actorId);
    }
}
