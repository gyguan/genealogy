package com.genealogy.tree.application;

import com.genealogy.tree.dto.TreeGraphMeta;
import com.genealogy.tree.dto.TreeGraphResponse;
import com.genealogy.tree.dto.TreeGraphWarning;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TreeGraphAssemblerTest {

    private final TreeGraphAssembler assembler = new TreeGraphAssembler();

    @Test
    void shouldPreserveGraphSemanticsDuringSnapshotRoundTrip() {
        TreeGraphMeta meta = new TreeGraphMeta(5, 3, 2, 1, true, List.of("node_limit"), false, 1, OffsetDateTime.now());
        TreeGraphResponse source = new TreeGraphResponse(
                "person-10", 10L, "both", "official",
                List.of(), List.of(), meta,
                List.of(new TreeGraphWarning("partial_visibility", "部分数据不可见", 1))
        );

        TreeGraphResponse restored = assembler.response(assembler.snapshot(source));

        assertEquals(source.rootNodeId(), restored.rootNodeId());
        assertEquals(source.rootPersonId(), restored.rootPersonId());
        assertEquals(source.direction(), restored.direction());
        assertEquals(source.dataView(), restored.dataView());
        assertEquals(source.nodes(), restored.nodes());
        assertEquals(source.edges(), restored.edges());
        assertEquals(source.meta(), restored.meta());
        assertEquals(source.warnings(), restored.warnings());
    }
}
