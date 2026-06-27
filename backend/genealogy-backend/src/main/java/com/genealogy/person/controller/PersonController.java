package com.genealogy.person.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageQuery;
import com.genealogy.common.api.PageResponse;
import com.genealogy.person.application.PersonApplicationService;
import com.genealogy.person.dto.PersonCreateRequest;
import com.genealogy.person.dto.PersonResponse;
import com.genealogy.person.dto.PersonUpdateRequest;
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
@RequestMapping("/api/v1")
public class PersonController {

    private final PersonApplicationService personApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public PersonController(PersonApplicationService personApplicationService, AuthorizationApplicationService authorizationApplicationService) {
        this.personApplicationService = personApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/clans/{clanId}/persons")
    public ApiResponse<PersonResponse> create(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody PersonCreateRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(personApplicationService.create(clanId, request, actorId));
    }

    @GetMapping("/persons/{id}")
    public ApiResponse<PersonResponse> get(@Positive @PathVariable Long id) {
        return ApiResponse.success(personApplicationService.get(id));
    }

    @GetMapping("/clans/{clanId}/persons")
    public ApiResponse<PageResponse<PersonResponse>> listByClan(@Positive @PathVariable Long clanId, PageQuery pageQuery) {
        return ApiResponse.success(personApplicationService.listByClan(
                clanId,
                pageQuery.normalizedPageNo(),
                pageQuery.normalizedPageSize()
        ));
    }

    @GetMapping("/clans/{clanId}/branches/{branchId}/persons")
    public ApiResponse<PageResponse<PersonResponse>> listByClanAndBranch(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long branchId,
            PageQuery pageQuery
    ) {
        return ApiResponse.success(personApplicationService.listByClanAndBranch(
                clanId,
                branchId,
                pageQuery.normalizedPageNo(),
                pageQuery.normalizedPageSize()
        ));
    }

    @PutMapping("/persons/{id}")
    public ApiResponse<PersonResponse> update(
            @Positive @PathVariable Long id,
            @Valid @RequestBody PersonUpdateRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(personApplicationService.update(id, request, actorId));
    }

    @DeleteMapping("/persons/{id}")
    public ApiResponse<Void> delete(
            @Positive @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        personApplicationService.delete(id, actorId);
        return ApiResponse.success();
    }
}
