package com.genealogy.person.event.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.person.event.dto.PersonEventResponse;
import com.genealogy.person.event.entity.PersonEventEntity;
import com.genealogy.person.event.repository.PersonEventRepository;
import com.genealogy.person.repository.PersonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PersonEventApplicationService {

    private final PersonRepository personRepository;
    private final PersonEventRepository personEventRepository;

    public PersonEventApplicationService(PersonRepository personRepository, PersonEventRepository personEventRepository) {
        this.personRepository = personRepository;
        this.personEventRepository = personEventRepository;
    }

    @Transactional(readOnly = true)
    public List<PersonEventResponse> listByPerson(Long personId) {
        personRepository.findByIdAndDeletedAtIsNull(personId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
        return personEventRepository.findByPersonIdAndDeletedAtIsNullOrderByEventDateAscSortOrderAscIdAsc(personId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private PersonEventResponse toResponse(PersonEventEntity entity) {
        return new PersonEventResponse(
                entity.getId(),
                entity.getClanId(),
                entity.getPersonId(),
                entity.getEventType(),
                entity.getEventTitle(),
                entity.getEventDate(),
                entity.getEventDatePrecision(),
                entity.getEventPlace(),
                entity.getEventDescription(),
                entity.getSourceType(),
                entity.getSourceId(),
                entity.getSortOrder(),
                entity.getDataStatus(),
                entity.getCreatedBy(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
