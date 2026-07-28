package com.genealogy.tree.application;

import com.genealogy.tree.dto.TreeGraphResponse;
import org.springframework.stereotype.Component;

@Component
public class TreeGraphAssembler {

    public GraphSnapshot snapshot(TreeGraphResponse response) {
        return new GraphSnapshot(
                response.rootNodeId(),
                response.rootPersonId(),
                response.direction(),
                response.dataView(),
                response.nodes(),
                response.edges(),
                response.meta(),
                response.warnings()
        );
    }

    public TreeGraphResponse response(GraphSnapshot snapshot) {
        return new TreeGraphResponse(
                snapshot.rootNodeId(),
                snapshot.rootPersonId(),
                snapshot.direction(),
                snapshot.dataView(),
                snapshot.nodes(),
                snapshot.edges(),
                snapshot.meta(),
                snapshot.warnings()
        );
    }
}
