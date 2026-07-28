package com.genealogy.tree.application;

import com.genealogy.tree.dto.TreeEdgeResponse;
import com.genealogy.tree.dto.TreeGraphMeta;
import com.genealogy.tree.dto.TreeGraphWarning;
import com.genealogy.tree.dto.TreeNodeResponse;

import java.util.List;

public record GraphSnapshot(
        String rootNodeId,
        Long rootPersonId,
        String direction,
        String dataView,
        List<TreeNodeResponse> nodes,
        List<TreeEdgeResponse> edges,
        TreeGraphMeta meta,
        List<TreeGraphWarning> warnings
) {
    public GraphSnapshot {
        nodes = nodes == null ? List.of() : List.copyOf(nodes);
        edges = edges == null ? List.of() : List.copyOf(edges);
        warnings = warnings == null ? List.of() : List.copyOf(warnings);
    }
}
