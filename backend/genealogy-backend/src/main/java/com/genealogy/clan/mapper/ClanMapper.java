package com.genealogy.clan.mapper;

import com.genealogy.clan.dto.ClanCreateRequest;
import com.genealogy.clan.dto.ClanResponse;
import com.genealogy.clan.dto.ClanUpdateRequest;
import com.genealogy.clan.entity.ClanEntity;

public final class ClanMapper {

    private ClanMapper() {
    }

    public static ClanEntity toEntity(ClanCreateRequest request) {
        ClanEntity entity = new ClanEntity();
        entity.setClanCode(trimToNull(request.clanCode()));
        entity.setClanName(request.clanName().trim());
        entity.setSurname(request.surname().trim());
        entity.setHallName(trimToNull(request.hallName()));
        entity.setCommandery(trimToNull(request.commandery()));
        entity.setOriginPlace(trimToNull(request.originPlace()));
        entity.setDescription(trimToNull(request.description()));
        return entity;
    }

    public static void updateEntity(ClanEntity entity, ClanUpdateRequest request) {
        entity.setClanCode(trimToNull(request.clanCode()));
        entity.setClanName(request.clanName().trim());
        entity.setSurname(request.surname().trim());
        entity.setHallName(trimToNull(request.hallName()));
        entity.setCommandery(trimToNull(request.commandery()));
        entity.setOriginPlace(trimToNull(request.originPlace()));
        entity.setDescription(trimToNull(request.description()));
        entity.setStatus(trimToNull(request.status()));
    }

    public static ClanResponse toResponse(ClanEntity entity) {
        return new ClanResponse(
                entity.getId(),
                entity.getClanCode(),
                entity.getClanName(),
                entity.getSurname(),
                entity.getHallName(),
                entity.getCommandery(),
                entity.getAncestorPersonId(),
                entity.getOriginPlace(),
                entity.getDescription(),
                entity.getStatus(),
                entity.getCreatedBy(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
