package com.genealogy.clan.dto;

import java.time.LocalDateTime;

public record ClanResponse(
        Long id,
        String clanCode,
        String clanName,
        String surname,
        String hallName,
        String commandery,
        Long ancestorPersonId,
        String originPlace,
        String description,
        String status,
        Long createdBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
