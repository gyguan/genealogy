package com.genealogy.review.application;

import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.event.dto.ReplacePersonEventsRequest;

import java.util.List;

public record PersonRevisionSnapshot(
        PersonEntity person,
        List<ReplacePersonEventsRequest.PersonEventItem> events
) {
    public PersonRevisionSnapshot {
        events = events == null ? List.of() : List.copyOf(events);
    }
}
