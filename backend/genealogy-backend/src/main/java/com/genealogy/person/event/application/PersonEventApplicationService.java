package com.genealogy.person.event.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.event.dto.PersonEventResponse;
import com.genealogy.person.event.dto.ReplacePersonEventsRequest;
import com.genealogy.person.event.entity.PersonEventEntity;
import com.genealogy.person.event.repository.PersonEventRepository;
import com.genealogy.person.repository.PersonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
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
        requirePerson(personId);
        return personEventRepository.findByPersonIdAndDeletedAtIsNullOrderByEventDateAscSortOrderAscIdAsc(personId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<PersonEventResponse> replaceByPerson(Long personId, ReplacePersonEventsRequest request) {
        PersonEntity person = requirePerson(personId);
        LocalDateTime now = LocalDateTime.now();

        List<PersonEventEntity> existing = personEventRepository
                .findByPersonIdAndDeletedAtIsNullOrderByEventDateAscSortOrderAscIdAsc(personId);
        existing.forEach(event -> {
            event.setDeletedAt(now);
            event.setUpdatedAt(now);
        });
        if (!existing.isEmpty()) {
            personEventRepository.saveAll(existing);
        }

        List<ReplacePersonEventsRequest.PersonEventItem> normalized = new ArrayList<>(request.events());
        normalized.sort(Comparator
                .comparing(ReplacePersonEventsRequest.PersonEventItem::eventDate,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(item -> item.sortOrder() == null ? Integer.MAX_VALUE : item.sortOrder())
                .thenComparing(ReplacePersonEventsRequest.PersonEventItem::eventTitle));

        List<PersonEventEntity> replacements = new ArrayList<>(normalized.size());
        for (int index = 0; index < normalized.size(); index++) {
            ReplacePersonEventsRequest.PersonEventItem item = normalized.get(index);
            if (item.eventDate() != null && item.eventDate().isAfter(LocalDate.now())) {
                throw new IllegalArgumentException("Person event date cannot be later than today");
            }
            PersonEventEntity entity = new PersonEventEntity();
            entity.setClanId(person.getClanId());
            entity.setPersonId(personId);
            entity.setEventType(trimToNull(item.eventType()));
            entity.setEventTitle(item.eventTitle().trim());
            entity.setEventDate(item.eventDate());
            entity.setEventDatePrecision(trimToNull(item.eventDatePrecision()));
            entity.setEventPlace(trimToNull(item.eventPlace()));
            entity.setEventDescription(trimToNull(item.eventDescription()));
            entity.setSortOrder(item.sortOrder() == null ? index : item.sortOrder());
            entity.setDataStatus(person.getDataStatus());
            entity.setCreatedBy(person.getCreatedBy());
            entity.setCreatedAt(now);
            entity.setUpdatedAt(now);
            replacements.add(entity);
        }

        return personEventRepository.saveAll(replacements).stream()
                .sorted(Comparator
                        .comparing(PersonEventEntity::getEventDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(PersonEventEntity::getSortOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(PersonEventEntity::getId))
                .map(this::toResponse)
                .toList();
    }

    private PersonEntity requirePerson(Long personId) {
        return personRepository.findByIdAndDeletedAtIsNull(personId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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