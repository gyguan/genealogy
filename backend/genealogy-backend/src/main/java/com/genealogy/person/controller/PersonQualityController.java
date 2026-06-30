package com.genealogy.person.controller;

import com.genealogy.common.api.ApiResponse;
import com.genealogy.person.dto.PersonDuplicateCheckRequest;
import com.genealogy.person.dto.PersonDuplicateCheckResponse;
import com.genealogy.person.dto.PersonResponse;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.mapper.PersonMapper;
import com.genealogy.person.repository.PersonRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class PersonQualityController {

    private final PersonRepository personRepository;

    public PersonQualityController(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    @PostMapping("/persons/check-duplicate")
    public ApiResponse<PersonDuplicateCheckResponse> checkDuplicate(@Valid @RequestBody PersonDuplicateCheckRequest request) {
        List<PersonResponse> candidates = personRepository.findAll(buildSpec(request), PageRequest.of(0, 10))
                .map(PersonMapper::toResponse)
                .getContent();
        boolean duplicated = !candidates.isEmpty();
        return ApiResponse.success(new PersonDuplicateCheckResponse(
                duplicated,
                candidates.size(),
                candidates,
                duplicated ? "发现疑似重复人物，请确认后再入谱" : "未发现疑似重复人物"
        ));
    }

    private Specification<PersonEntity> buildSpec(PersonDuplicateCheckRequest request) {
        return (root, criteriaQuery, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("clanId"), request.clanId()));
            predicates.add(criteriaBuilder.isNull(root.get("deletedAt")));
            predicates.add(criteriaBuilder.equal(criteriaBuilder.lower(root.get("name")), request.name().trim().toLowerCase()));
            if (request.branchId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("branchId"), request.branchId()));
            }
            if (request.generationNo() != null) {
                predicates.add(criteriaBuilder.equal(root.get("generationNo"), request.generationNo()));
            }
            if (request.generationWord() != null && !request.generationWord().isBlank()) {
                predicates.add(criteriaBuilder.equal(root.get("generationWord"), request.generationWord().trim()));
            }
            if (request.birthDate() != null) {
                predicates.add(criteriaBuilder.equal(root.get("birthDate"), request.birthDate()));
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }
}
