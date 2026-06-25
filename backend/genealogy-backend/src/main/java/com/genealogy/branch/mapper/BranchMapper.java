package com.genealogy.branch.mapper;

import com.genealogy.branch.dto.BranchCreateRequest;
import com.genealogy.branch.dto.BranchResponse;
import com.genealogy.branch.dto.BranchUpdateRequest;
import com.genealogy.branch.entity.BranchEntity;

public final class BranchMapper {

    private BranchMapper() {
    }

    public static BranchEntity toEntity(Long clanId, BranchCreateRequest request) {
        BranchEntity entity = new BranchEntity();
        entity.setClanId(clanId);
        entity.setParentId(request.parentId());
        entity.setBranchName(request.branchName().trim());
        entity.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        entity.setFounderPersonId(request.founderPersonId());
        entity.setMigrationFrom(trimToNull(request.migrationFrom()));
        entity.setMigrationTo(trimToNull(request.migrationTo()));
        entity.setManagerMemberId(request.managerMemberId());
        entity.setDescription(trimToNull(request.description()));
        return entity;
    }

    public static void updateEntity(BranchEntity entity, BranchUpdateRequest request) {
        entity.setParentId(request.parentId());
        entity.setBranchName(request.branchName().trim());
        entity.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        entity.setFounderPersonId(request.founderPersonId());
        entity.setMigrationFrom(trimToNull(request.migrationFrom()));
        entity.setMigrationTo(trimToNull(request.migrationTo()));
        entity.setManagerMemberId(request.managerMemberId());
        entity.setDescription(trimToNull(request.description()));
        entity.setStatus(trimToNull(request.status()));
    }

    public static BranchResponse toResponse(BranchEntity entity) {
        return new BranchResponse(
                entity.getId(),
                entity.getClanId(),
                entity.getParentId(),
                entity.getBranchName(),
                entity.getBranchPath(),
                entity.getLevel(),
                entity.getSortOrder(),
                entity.getFounderPersonId(),
                entity.getMigrationFrom(),
                entity.getMigrationTo(),
                entity.getManagerMemberId(),
                entity.getDescription(),
                entity.getStatus(),
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
