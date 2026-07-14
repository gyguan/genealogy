package com.genealogy.tree.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record TreeGraphMeta(
        int requestedDepth,
        int appliedDepth,
        int nodeCount,
        int edgeCount,
        boolean truncated,
        List<String> truncationReasons,
        boolean cycleDetected,
        int duplicateEdgeCount,
        OffsetDateTime generatedAt
) {

    public TreeGraphMeta {
        truncationReasons = truncationReasons == null ? List.of() : List.copyOf(truncationReasons);
    }
}
