package com.genealogy.tree.dto;

public record TreeNodeResponse(
        Long personId,
        String name,
        String gender,
        Integer generationNo,
        String generationWord,
        Long branchId
) {
}
