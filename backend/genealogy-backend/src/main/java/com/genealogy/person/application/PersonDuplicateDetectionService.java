package com.genealogy.person.application;

import com.genealogy.person.dto.PersonCreateRequest;
import com.genealogy.person.dto.PersonDuplicateCheckRequest;
import com.genealogy.person.dto.PersonDuplicateCheckResponse;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.mapper.PersonMapper;
import com.genealogy.person.repository.PersonRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class PersonDuplicateDetectionService {

    private final PersonRepository personRepository;

    public PersonDuplicateDetectionService(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    @Transactional(readOnly = true)
    public PersonDuplicateResult detect(PersonDuplicateQuery query) {
        List<PersonEntity> entities = personRepository.findAll(
                specification(query),
                PageRequest.of(0, query.candidateLimit())
        ).getContent();
        Set<String> matchedFields = matchedFields(query);
        int score = score(matchedFields);
        PersonDuplicateResult.RiskLevel risk = riskLevel(entities.isEmpty(), score);
        List<PersonDuplicateResult.Candidate> candidates = entities.stream()
                .map(entity -> new PersonDuplicateResult.Candidate(
                        PersonMapper.toResponse(entity),
                        matchedFields,
                        score
                ))
                .toList();
        return new PersonDuplicateResult(
                risk,
                candidates,
                matchedFields,
                explanation(risk, matchedFields, candidates.size())
        );
    }

    @Transactional(readOnly = true)
    public PersonDuplicateCheckResponse check(PersonDuplicateCheckRequest request) {
        PersonDuplicateResult result = detect(PersonDuplicateQuery.of(
                request.clanId(),
                request.branchId(),
                request.name(),
                request.generationNo(),
                request.generationWord(),
                request.birthDate()
        ));
        return new PersonDuplicateCheckResponse(
                result.duplicated(),
                result.candidateCount(),
                result.candidates().stream().map(PersonDuplicateResult.Candidate::person).toList(),
                result.duplicated() ? "发现疑似重复人物，请确认后再入谱" : "未发现疑似重复人物"
        );
    }

    @Transactional(readOnly = true)
    public boolean exists(Long clanId, PersonCreateRequest request) {
        return detect(new PersonDuplicateQuery(
                clanId,
                request.branchId(),
                request.name(),
                request.generationNo(),
                request.generationWord(),
                request.birthDate(),
                1
        )).duplicated();
    }

    private Specification<PersonEntity> specification(PersonDuplicateQuery query) {
        return (root, criteriaQuery, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("clanId"), query.clanId()));
            predicates.add(criteriaBuilder.isNull(root.get("deletedAt")));
            predicates.add(criteriaBuilder.equal(
                    criteriaBuilder.lower(root.get("name")),
                    query.name().trim().toLowerCase(Locale.ROOT)
            ));
            if (query.branchId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("branchId"), query.branchId()));
            }
            if (query.generationNo() != null) {
                predicates.add(criteriaBuilder.equal(root.get("generationNo"), query.generationNo()));
            }
            if (query.generationWord() != null && !query.generationWord().isBlank()) {
                predicates.add(criteriaBuilder.equal(root.get("generationWord"), query.generationWord().trim()));
            }
            if (query.birthDate() != null) {
                predicates.add(criteriaBuilder.equal(root.get("birthDate"), query.birthDate()));
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Set<String> matchedFields(PersonDuplicateQuery query) {
        Set<String> fields = new LinkedHashSet<>();
        fields.add("name");
        if (query.branchId() != null) fields.add("branchId");
        if (query.generationNo() != null) fields.add("generationNo");
        if (query.generationWord() != null && !query.generationWord().isBlank()) fields.add("generationWord");
        if (query.birthDate() != null) fields.add("birthDate");
        return Set.copyOf(fields);
    }

    private int score(Set<String> fields) {
        int score = 40;
        if (fields.contains("branchId")) score += 10;
        if (fields.contains("generationNo")) score += 15;
        if (fields.contains("generationWord")) score += 10;
        if (fields.contains("birthDate")) score += 25;
        return Math.min(score, 100);
    }

    private PersonDuplicateResult.RiskLevel riskLevel(boolean empty, int score) {
        if (empty) return PersonDuplicateResult.RiskLevel.NONE;
        if (score >= 80) return PersonDuplicateResult.RiskLevel.HIGH;
        if (score >= 60) return PersonDuplicateResult.RiskLevel.MEDIUM;
        return PersonDuplicateResult.RiskLevel.LOW;
    }

    private String explanation(
            PersonDuplicateResult.RiskLevel risk,
            Set<String> fields,
            int candidateCount
    ) {
        if (risk == PersonDuplicateResult.RiskLevel.NONE) {
            return "未发现姓名及已提供身份字段同时匹配的人物";
        }
        return "发现 " + candidateCount + " 个候选人物，命中字段：" + String.join(",", fields)
                + "，风险等级：" + risk.name();
    }
}
