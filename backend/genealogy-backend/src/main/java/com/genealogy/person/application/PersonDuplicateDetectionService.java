package com.genealogy.person.application;

import com.genealogy.person.dto.PersonCreateRequest;
import com.genealogy.person.dto.PersonDuplicateCheckRequest;
import com.genealogy.person.dto.PersonDuplicateCheckResponse;
import com.genealogy.person.dto.PersonResponse;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.mapper.PersonMapper;
import com.genealogy.person.repository.PersonRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class PersonDuplicateDetectionService {

    private static final int MAX_CANDIDATES = 10;

    private final PersonRepository personRepository;

    public PersonDuplicateDetectionService(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    @Transactional(readOnly = true)
    public PersonDuplicateCheckResponse check(PersonDuplicateCheckRequest request) {
        List<PersonResponse> candidates = personRepository.findAll(
                        specification(
                                request.clanId(), request.branchId(), request.name(), request.generationNo(),
                                request.generationWord(), request.birthDate()
                        ),
                        PageRequest.of(0, MAX_CANDIDATES)
                )
                .map(PersonMapper::toResponse)
                .getContent();
        boolean duplicated = !candidates.isEmpty();
        return new PersonDuplicateCheckResponse(
                duplicated,
                candidates.size(),
                candidates,
                duplicated ? "发现疑似重复人物，请确认后再入谱" : "未发现疑似重复人物"
        );
    }

    @Transactional(readOnly = true)
    public boolean exists(Long clanId, PersonCreateRequest request) {
        return personRepository.count(specification(
                clanId,
                request.branchId(),
                request.name(),
                request.generationNo(),
                request.generationWord(),
                request.birthDate()
        )) > 0;
    }

    private Specification<PersonEntity> specification(
            Long clanId,
            Long branchId,
            String name,
            Integer generationNo,
            String generationWord,
            LocalDate birthDate
    ) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("clanId"), clanId));
            predicates.add(criteriaBuilder.isNull(root.get("deletedAt")));
            predicates.add(criteriaBuilder.equal(
                    criteriaBuilder.lower(root.get("name")),
                    name.trim().toLowerCase()
            ));
            if (branchId != null) predicates.add(criteriaBuilder.equal(root.get("branchId"), branchId));
            if (generationNo != null) predicates.add(criteriaBuilder.equal(root.get("generationNo"), generationNo));
            if (generationWord != null && !generationWord.isBlank()) {
                predicates.add(criteriaBuilder.equal(root.get("generationWord"), generationWord.trim()));
            }
            if (birthDate != null) predicates.add(criteriaBuilder.equal(root.get("birthDate"), birthDate));
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }
}
