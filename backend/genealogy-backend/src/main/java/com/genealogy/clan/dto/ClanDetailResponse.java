package com.genealogy.clan.dto;

import java.time.LocalDateTime;

public record ClanDetailResponse(
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
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
