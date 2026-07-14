package com.genealogy.tree.dto;

import java.util.List;

public record TreeGraphResponse(
        String rootNodeId,
        Long rootPersonId,
        String direction,
        String dataView,
        List<TreeNodeResponse> nodes,
        List<TreeEdgeResponse> edges,
        TreeGraphMeta meta,
        List<TreeGraphWarning> warnings
) {

    public TreeGraphResponse {
        nodes = nodes == null ? List.of() : List.copyOf(nodes);
        edges = edges == null ? List.of() : List.copyOf(edges);
        warnings = warnings == null ? List.of() : List.copyOf(warnings);
    }

    public TreeGraphResponse(
            Long rootPersonId,
            List<TreeNodeResponse> nodes,
            List<TreeEdgeResponse> edges
    ) {
        this(
                rootPersonId == null ? null : "person-" + rootPersonId,
                rootPersonId,
                "both",
                "official",
                nodes,
                edges,
                null,
                List.of()
        );
    }
}
