package com.genealogy.person.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageQuery;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.person.application.PersonApplicationService;
import com.genealogy.person.application.PersonRevisionApplicationService;
import com.genealogy.person.dto.PersonCreateRequest;
import com.genealogy.person.dto.PersonResponse;
import com.genealogy.person.dto.PersonSearchQuery;
import com.genealogy.person.dto.PersonUpdateRequest;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class PersonController {

    private static final String PERSON_CREATE = "person:create";

    private final PersonApplicationService personApplicationService;
    private final PersonRevisionApplicationService personRevisionApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final PersonRepository personRepository;

    public PersonController(
            PersonApplicationService personApplicationService,
            PersonRevisionApplicationService personRevisionApplicationService,
            AuthorizationApplicationService authorizationApplicationService,
            PersonRepository personRepository
    ) {
        this.personApplicationService = personApplicationService;
        this.personRevisionApplicationService = personRevisionApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
        this.personRepository = personRepository;
    }

    @PostMapping("/clans/{clanId}/persons")
    public ApiResponse<PersonResponse> create(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody PersonCreateRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requireBranchPermission(clanId, actorId, request.branchId(), PERSON_CREATE);
        if (!Boolean.TRUE.equals(request.confirmDuplicate()) && duplicateCount(clanId, request) > 0) {
            throw new BusinessException("PERSON_DUPLICATE_CONFIRM_REQUIRED", "发现疑似重复人物，请确认后再创建");
        }
        return ApiResponse.success(personRevisionApplicationService.create(clanId, request, actorId));
    }

    @GetMapping("/persons/search")
    public ApiResponse<PageResponse<PersonResponse>> search(
            @RequestParam Long clanId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String name,
            @RequestParam(name = "gender", required = false) List<String> genders,
            @RequestParam(name = "generationNo", required = false) List<Integer> generationNos,
            @RequestParam(name = "generationWord", required = false) List<String> generationWords,
            @RequestParam(name = "dataStatus", required = false) List<String> dataStatuses,
            @RequestParam(required = false) String sort,
            PageQuery pageQuery,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        List<String> effectiveStatuses = dataStatuses == null || dataStatuses.isEmpty()
                ? List.of("official")
                : dataStatuses;
        PersonSearchQuery query = new PersonSearchQuery(
                clanId,
                branchId,
                keyword,
                name,
                genders,
                generationNos,
                generationWords,
                effectiveStatuses,
                sort
        );
        return ApiResponse.success(personApplicationService.search(
                query,
                pageQuery.normalizedPageNo(),
                pageQuery.normalizedPageSize(),
                actorId
        ));
    }

    @GetMapping("/persons/{id}")
    public ApiResponse<PersonResponse> get(
            @Positive @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(personApplicationService.get(id, actorId));
    }

    @GetMapping("/clans/{clanId}/persons")
    public ApiResponse<PageResponse<PersonResponse>> listByClan(
            @Positive @PathVariable Long clanId,
            PageQuery pageQuery,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(personApplicationService.listByClan(
                clanId,
                pageQuery.normalizedPageNo(),
                pageQuery.normalizedPageSize(),
                actorId
        ));
    }

    @GetMapping("/clans/{clanId}/branches/{branchId}/persons")
    public ApiResponse<PageResponse<PersonResponse>> listByClanAndBranch(
            @Positive @PathVariable Long clanId,
            @Positive @PathVariable Long branchId,
            PageQuery pageQuery,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(personApplicationService.listByClanAndBranch(
                clanId,
                branchId,
                pageQuery.normalizedPageNo(),
                pageQuery.normalizedPageSize(),
                actorId
        ));
    }

    @PutMapping("/persons/{id}")
    public ApiResponse<PersonResponse> update(
            @Positive @PathVariable Long id,
            @Valid @RequestBody PersonUpdateRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        return ApiResponse.success(personRevisionApplicationService.update(id, request, actorId));
    }

    @DeleteMapping("/persons/{id}")
    public ApiResponse<Void> delete(
            @Positive @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        personRevisionApplicationService.delete(id, actorId);
        return ApiResponse.success();
    }

    private long duplicateCount(Long clanId, PersonCreateRequest request) {
        Specification<PersonEntity> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("clanId"), clanId));
            predicates.add(criteriaBuilder.isNull(root.get("deletedAt")));
            predicates.add(criteriaBuilder.equal(criteriaBuilder.lower(root.get("name")), request.name().trim().toLowerCase()));
            if (request.branchId() != null) predicates.add(criteriaBuilder.equal(root.get("branchId"), request.branchId()));
            if (request.generationNo() != null) predicates.add(criteriaBuilder.equal(root.get("generationNo"), request.generationNo()));
            if (request.generationWord() != null && !request.generationWord().isBlank()) predicates.add(criteriaBuilder.equal(root.get("generationWord"), request.generationWord().trim()));
            if (request.birthDate() != null) predicates.add(criteriaBuilder.equal(root.get("birthDate"), request.birthDate()));
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
        return personRepository.count(spec);
    }
}