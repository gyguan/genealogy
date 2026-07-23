package com.genealogy.person.event.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record ReplacePersonEventsRequest(
        @Valid List<PersonEventItem> events
) {
    public ReplacePersonEventsRequest {
        events = events == null ? List.of() : List.copyOf(events);
    }

    public record PersonEventItem(
            @Size(max = 64) String eventType,
            @NotBlank @Size(max = 200) String eventTitle,
            @PastOrPresent LocalDate eventDate,
            @Size(max = 32) String eventDatePrecision,
            @Size(max = 255) String eventPlace,
            @Size(max = 4000) String eventDescription,
            @PositiveOrZero Integer sortOrder
    ) {
    }
}