package com.genealogy.tree.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.person.repository.PersonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TreeQueryContextApplicationService {

    private final PersonRepository personRepository;

    public TreeQueryContextApplicationService(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    @Transactional(readOnly = true)
    public Long requireClanId(Long personId) {
        return personRepository.findByIdAndDeletedAtIsNull(personId)
                .map(person -> person.getClanId())
                .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
    }
}
