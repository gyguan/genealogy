package com.genealogy.relationship.api;

import com.genealogy.common.api.ApiResponse;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.controller.RelationshipController;
import com.genealogy.relationship.dto.RelationshipResponse;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@ControllerAdvice(assignableTypes = RelationshipController.class)
public class RelationshipResponseEnrichmentAdvice implements ResponseBodyAdvice<Object> {

    private final PersonRepository personRepository;

    public RelationshipResponseEnrichmentAdvice(PersonRepository personRepository) {
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
        if (data instanceof RelationshipResponse relationship) {
            Set<Long> personIds = new HashSet<>();
            if (relationship.fromPersonId() != null) personIds.add(relationship.fromPersonId());
            if (relationship.toPersonId() != null) personIds.add(relationship.toPersonId());
            Map<Long, String> names = personNames(personIds);
            return enrichOne(relationship, names);
        }
        if (data instanceof List<?> list && list.stream().anyMatch(RelationshipResponse.class::isInstance)) {
            List<RelationshipResponse> relationships = list.stream()
                    .filter(RelationshipResponse.class::isInstance)
                    .map(RelationshipResponse.class::cast)
                    .toList();
            Set<Long> personIds = new HashSet<>();
            relationships.forEach(item -> {
                if (item.fromPersonId() != null) personIds.add(item.fromPersonId());
                if (item.toPersonId() != null) personIds.add(item.toPersonId());
            });
            Map<Long, String> names = personNames(personIds);
            return relationships.stream().map(item -> enrichOne(item, names)).toList();
        }
        return data;
    }

    private Map<Long, String> personNames(Set<Long> ids) {
        Set<Long> cleanIds = ids.stream().filter(id -> id != null).collect(Collectors.toSet());
        if (cleanIds.isEmpty()) {
            return Map.of();
        }
        return personRepository.findAllById(cleanIds).stream()
                .collect(Collectors.toMap(PersonEntity::getId, person -> person.getName() == null || person.getName().isBlank() ? "人物#" + person.getId() : person.getName(), (left, right) -> left));
    }

    private RelationshipResponse enrichOne(RelationshipResponse source, Map<Long, String> names) {
        return new RelationshipResponse(
                source.id(),
                source.clanId(),
                source.fromPersonId(),
                source.fromPersonName() == null ? names.get(source.fromPersonId()) : source.fromPersonName(),
                source.toPersonId(),
                source.toPersonName() == null ? names.get(source.toPersonId()) : source.toPersonName(),
                source.relationType(),
                source.relationLabel(),
                source.relationCategory(),
                source.ritualRelationType(),
                source.successionReason(),
                source.successorBranchId(),
                source.isLineageRelation(),
                source.isBiological(),
                source.isPrimary(),
                source.description(),
                source.confidenceLevel(),
                source.dataStatus(),
                source.createdAt(),
                source.updatedAt()
        );
    }
}
