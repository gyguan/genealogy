package com.genealogy.person.api;

import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageResponse;
import com.genealogy.person.controller.PersonController;
import com.genealogy.person.dto.PersonResponse;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@ControllerAdvice(assignableTypes = PersonController.class)
public class PersonResponseEnrichmentAdvice implements ResponseBodyAdvice<Object> {

    private static final String SPOUSE = "spouse";

    private final BranchRepository branchRepository;
    private final RelationshipRepository relationshipRepository;
    private final PersonRepository personRepository;

    public PersonResponseEnrichmentAdvice(
            BranchRepository branchRepository,
            RelationshipRepository relationshipRepository,
            PersonRepository personRepository
    ) {
        this.branchRepository = branchRepository;
        this.relationshipRepository = relationshipRepository;
        this.personRepository = personRepository;
    }

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(
            Object body,
            MethodParameter returnType,
            MediaType selectedContentType,
            Class<? extends HttpMessageConverter<?>> selectedConverterType,
            ServerHttpRequest request,
            ServerHttpResponse response
    ) {
        if (!(body instanceof ApiResponse<?> apiResponse) || !apiResponse.isSuccess()) {
            return body;
        }
        Object data = apiResponse.getData();
        Object enrichedData = enrich(data);
        if (enrichedData == data) {
            return body;
        }
        return new ApiResponse<>(apiResponse.isSuccess(), apiResponse.getCode(), apiResponse.getMessage(), enrichedData, apiResponse.getTimestamp());
    }

    private Object enrich(Object data) {
        if (data instanceof PersonResponse person) {
            return enrichPersons(List.of(person)).get(0);
        }
        if (data instanceof PageResponse<?> page && page.records().stream().anyMatch(PersonResponse.class::isInstance)) {
            List<PersonResponse> persons = page.records().stream()
                    .filter(PersonResponse.class::isInstance)
                    .map(PersonResponse.class::cast)
                    .toList();
            return new PageResponse<>(enrichPersons(persons), page.total(), page.pageNo(), page.pageSize(), page.totalPages());
        }
        if (data instanceof List<?> list && list.stream().anyMatch(PersonResponse.class::isInstance)) {
            List<PersonResponse> persons = list.stream()
                    .filter(PersonResponse.class::isInstance)
                    .map(PersonResponse.class::cast)
                    .toList();
            return enrichPersons(persons);
        }
        return data;
    }

    private List<Map<String, Object>> enrichPersons(List<PersonResponse> persons) {
        if (persons.isEmpty()) {
            return List.of();
        }
        Set<Long> personIds = persons.stream().map(PersonResponse::id).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> branchIds = persons.stream().map(PersonResponse::branchId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> clanIds = persons.stream().map(PersonResponse::clanId).filter(Objects::nonNull).collect(Collectors.toSet());

        Map<Long, String> branchNames = branchRepository.findAllById(branchIds).stream()
                .collect(Collectors.toMap(BranchEntity::getId, BranchEntity::getBranchName, (left, right) -> left));
        Map<Long, List<Long>> spouseIdsByPersonId = spouseIdsByPersonId(clanIds, personIds);
        Set<Long> spouseIds = spouseIdsByPersonId.values().stream().flatMap(List::stream).collect(Collectors.toSet());
        Map<Long, String> spouseNames = personRepository.findAllById(spouseIds).stream()
                .collect(Collectors.toMap(PersonEntity::getId, PersonEntity::getName, (left, right) -> left));

        return persons.stream()
                .map(person -> personMap(person, branchNames, spouseIdsByPersonId, spouseNames))
                .toList();
    }

    private Map<Long, List<Long>> spouseIdsByPersonId(Set<Long> clanIds, Set<Long> personIds) {
        Map<Long, List<Long>> result = new HashMap<>();
        if (clanIds.isEmpty() || personIds.isEmpty()) {
            return result;
        }
        for (Long clanId : clanIds) {
            for (RelationshipEntity relationship : relationshipRepository.findByClanIdAndDeletedAtIsNull(clanId)) {
                if (!isSpouseRelationship(relationship)) {
                    continue;
                }
                Long fromId = relationship.getFromPersonId();
                Long toId = relationship.getToPersonId();
                if (personIds.contains(fromId) && toId != null) {
                    result.computeIfAbsent(fromId, ignored -> new ArrayList<>()).add(toId);
                }
                if (personIds.contains(toId) && fromId != null) {
                    result.computeIfAbsent(toId, ignored -> new ArrayList<>()).add(fromId);
                }
            }
        }
        return result;
    }

    private boolean isSpouseRelationship(RelationshipEntity relationship) {
        return SPOUSE.equalsIgnoreCase(String.valueOf(relationship.getRelationType()))
                || SPOUSE.equalsIgnoreCase(String.valueOf(relationship.getRelationLabel()));
    }

    private Map<String, Object> personMap(
            PersonResponse person,
            Map<Long, String> branchNames,
            Map<Long, List<Long>> spouseIdsByPersonId,
            Map<Long, String> spouseNames
    ) {
        List<Long> spouseIds = spouseIdsByPersonId.getOrDefault(person.id(), List.of());
        List<String> names = spouseIds.stream().map(spouseNames::get).filter(Objects::nonNull).toList();
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", person.id());
        map.put("clanId", person.clanId());
        map.put("branchId", person.branchId());
        map.put("branchName", branchNames.get(person.branchId()));
        map.put("personCode", person.personCode());
        map.put("name", person.name());
        map.put("genealogyName", person.genealogyName());
        map.put("courtesyName", person.courtesyName());
        map.put("aliasName", person.aliasName());
        map.put("gender", person.gender());
        map.put("generationNo", person.generationNo());
        map.put("generationWord", person.generationWord());
        map.put("rankInFamily", person.rankInFamily());
        map.put("birthDate", person.birthDate());
        map.put("birthDatePrecision", person.birthDatePrecision());
        map.put("deathDate", person.deathDate());
        map.put("deathDatePrecision", person.deathDatePrecision());
        map.put("isLiving", person.isLiving());
        map.put("birthPlace", person.birthPlace());
        map.put("residencePlace", person.residencePlace());
        map.put("occupation", person.occupation());
        map.put("education", person.education());
        map.put("titleOrHonor", person.titleOrHonor());
        map.put("biography", person.biography());
        map.put("tombPlace", person.tombPlace());
        map.put("epitaph", person.epitaph());
        map.put("hasDescendant", person.hasDescendant());
        map.put("lineageStatus", person.lineageStatus());
        map.put("privacyLevel", person.privacyLevel());
        map.put("dataStatus", person.dataStatus());
        map.put("spouseIds", spouseIds);
        map.put("spouseNames", names);
        map.put("spouseName", String.join("、", names));
        map.put("createdBy", person.createdBy());
        map.put("createdAt", person.createdAt());
        map.put("updatedBy", person.updatedBy());
        map.put("updatedAt", person.updatedAt());
        return map;
    }
}
