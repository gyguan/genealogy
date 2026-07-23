package com.genealogy.person.event.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
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

    private static final String PERSON_VIEW = "person:view";
    private static final String PERSON_UPDATE = "person:update";
    private static final String STATUS_OFFICIAL = "official";

    private final PersonRepository personRepository;
    private final PersonEventRepository personEventRepository;
    private final AuthorizationApplicationService authorizationApplicationService;

    public PersonEventApplicationService(
            PersonRepository personRepository,
            PersonEventRepository personEventRepository,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.personRepository = personRepository;
        this.personEventRepository = personEventRepository;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Transactional(readOnly = true)
    public List<PersonEventResponse> listByPerson(Long personId, Long actorId) {
        PersonEntity person = requirePerson(personId);
        authorizationApplicationService.requireBranchPermission(
                person.getClanId(), actorId, person.getBranchId(), PERSON_VIEW
        );
        return loadEvents(personId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReplacePersonEventsRequest.PersonEventItem> snapshotItems(Long personId) {
        return loadEvents(personId).stream()
                .map(this::toSnapshotItem)
                .toList();
    }

    @Transactional
    public List<PersonEventResponse> replaceByPerson(
            Long personId,
            ReplacePersonEventsRequest request,
            Long actorId
    ) {
        PersonEntity person = requirePerson(personId);
        authorizationApplicationService.requireBranchPermission(
                person.getClanId(), actorId, person.getBranchId(), PERSON_UPDATE
        );
        if (STATUS_OFFICIAL.equals(person.getDataStatus())) {
            throw new BusinessException(
                    "PERSON_EVENT_REVIEW_REQUIRED",
                    "正式人物关键事件变更必须随人物资料提交审核"
            );
        }
        return replaceInternal(
                personId,
                person.getClanId(),
                person.getDataStatus(),
                request.events(),
                actorId,
                LocalDateTime.now()
        ).stream().map(this::toResponse).toList();
    }

    @Transactional
    public void replaceFromRevision(
            Long personId,
            Long clanId,
            String dataStatus,
            List<ReplacePersonEventsRequest.PersonEventItem> events,
            Long actorId,
            LocalDateTime applyTime
    ) {
        replaceInternal(personId, clanId, dataStatus, events, actorId, applyTime);
    }

    private List<PersonEventEntity> replaceInternal(
            Long personId,
            Long clanId,
            String dataStatus,
            List<ReplacePersonEventsRequest.PersonEventItem> events,
            Long actorId,
            LocalDateTime now
    ) {
        List<ReplacePersonEventsRequest.PersonEventItem> normalized = normalizeAndValidate(
                new ReplacePersonEventsRequest(events)
        );
        List<PersonEventEntity> existing = loadEvents(personId);
        existing.forEach(event -> {
            event.setDeletedAt(now);
            event.setUpdatedAt(now);
        });
        if (!existing.isEmpty()) {
            personEventRepository.saveAll(existing);
        }

        List<PersonEventEntity> replacements = new ArrayList<>(normalized.size());
        for (int index = 0; index < normalized.size(); index++) {
            ReplacePersonEventsRequest.PersonEventItem item = normalized.get(index);
            PersonEventEntity entity = new PersonEventEntity();
            entity.setClanId(clanId);
            entity.setPersonId(personId);
            entity.setEventType(trimToNull(item.eventType()));
            entity.setEventTitle(item.eventTitle().trim());
            entity.setEventDate(item.eventDate());
            entity.setEventDatePrecision(trimToNull(item.eventDatePrecision()));
            entity.setEventPlace(trimToNull(item.eventPlace()));
            entity.setEventDescription(trimToNull(item.eventDescription()));
            entity.setSortOrder(index);
            entity.setDataStatus(dataStatus);
            entity.setCreatedBy(actorId);
            entity.setCreatedAt(now);
            entity.setUpdatedAt(now);
            replacements.add(entity);
        }

        return personEventRepository.saveAll(replacements).stream()
                .sorted(eventComparator())
                .toList();
    }

    private List<ReplacePersonEventsRequest.PersonEventItem> normalizeAndValidate(
            ReplacePersonEventsRequest request
    ) {
        List<ReplacePersonEventsRequest.PersonEventItem> normalized = new ArrayList<>(request.events());
        for (ReplacePersonEventsRequest.PersonEventItem item : normalized) {
            if (item.eventTitle() == null || item.eventTitle().isBlank()) {
                throw new BusinessException("PERSON_EVENT_TITLE_REQUIRED", "关键事件标题不能为空");
            }
            if (item.eventDate() != null && item.eventDate().isAfter(LocalDate.now())) {
                throw new BusinessException("PERSON_EVENT_DATE_IN_FUTURE", "关键事件日期不能晚于今天");
            }
        }
        normalized.sort(Comparator
                .comparing((ReplacePersonEventsRequest.PersonEventItem item) ->
                        item.sortOrder() == null ? Integer.MAX_VALUE : item.sortOrder())
                .thenComparing(ReplacePersonEventsRequest.PersonEventItem::eventDate,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(item -> item.eventTitle().trim()));
        return normalized;
    }

    private List<PersonEventEntity> loadEvents(Long personId) {
        return personEventRepository
                .findByPersonIdAndDeletedAtIsNullOrderBySortOrderAscEventDateAscIdAsc(personId);
    }

    private Comparator<PersonEventEntity> eventComparator() {
        return Comparator
                .comparing(PersonEventEntity::getSortOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(PersonEventEntity::getEventDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(PersonEventEntity::getId, Comparator.nullsLast(Comparator.naturalOrder()));
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

    private ReplacePersonEventsRequest.PersonEventItem toSnapshotItem(PersonEventEntity entity) {
        return new ReplacePersonEventsRequest.PersonEventItem(
                entity.getEventType(),
                entity.getEventTitle(),
                entity.getEventDate(),
                entity.getEventDatePrecision(),
                entity.getEventPlace(),
                entity.getEventDescription(),
                entity.getSortOrder()
        );
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
