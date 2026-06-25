package com.genealogy.tree.dto;

import java.util.List;

public record TreeGraphResponse(
        Long rootPersonId,
        List<TreeNodeResponse> nodes,
        List<TreeEdgeResponse> edges
) {
}
