package com.genealogy.person.event.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record PersonEventResponse(
        Long id,
        Long clanId,
        Long personId,
        String eventType,
        String eventTitle,
        LocalDate eventDate,
        String eventDatePrecision,
        String eventPlace,
        String eventDescription,
        String sourceType,
        Long sourceId,
        Integer sortOrder,
        String dataStatus,
        Long createdBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
