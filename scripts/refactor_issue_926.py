from pathlib import Path

root = Path(__file__).resolve().parents[1]
base = root / "backend/genealogy-backend/src/main/java/com/genealogy/tree/application"
source_path = base / "TreeApplicationService.java"
engine_path = base / "TreeGraphEngine.java"
lineage_path = base / "LineageTraversalService.java"
branch_path = base / "BranchGraphService.java"

source = source_path.read_text(encoding="utf-8")
engine = source.replace("public class TreeApplicationService", "class TreeGraphEngine", 1)
engine = engine.replace("public TreeApplicationService(", "TreeGraphEngine(", 1)
engine_path.write_text(engine, encoding="utf-8")

facade = '''package com.genealogy.tree.application;

import com.genealogy.tree.dto.TreeGraphResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Compatibility facade that owns transaction boundaries and delegates graph algorithms
 * to focused components.
 */
@Service
public class TreeApplicationService {
    private final TreeGraphEngine engine;

    public TreeApplicationService(TreeGraphEngine engine) {
        this.engine = engine;
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse personLineage(
            Long personId, String direction, List<String> relationScopes, String dataView,
            Integer maxDepth, Integer maxNodes, Integer maxEdges, Long actorId
    ) {
        return engine.personLineage(personId, direction, relationScopes, dataView,
                maxDepth, maxNodes, maxEdges, actorId);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse family(
            Long personId, List<String> relationScopes, String dataView,
            Integer maxNodes, Integer maxEdges, Long actorId
    ) {
        return engine.family(personId, relationScopes, dataView, maxNodes, maxEdges, actorId);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse descendants(
            Long rootPersonId, Integer maxDepth, List<String> relationScopes, String dataView,
            Integer maxNodes, Integer maxEdges, Long actorId
    ) {
        return engine.descendants(rootPersonId, maxDepth, relationScopes, dataView,
                maxNodes, maxEdges, actorId);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse ancestors(
            Long personId, Integer maxDepth, List<String> relationScopes, String dataView,
            Integer maxNodes, Integer maxEdges, Long actorId
    ) {
        return engine.ancestors(personId, maxDepth, relationScopes, dataView,
                maxNodes, maxEdges, actorId);
    }

    @Transactional(readOnly = true)
    public TreeGraphResponse branchLineage(
            Long clanId, Long branchId, boolean includeSubBranches,
            List<String> relationScopes, String dataView, Integer maxDepth,
            Integer maxNodes, Integer maxEdges, Long actorId
    ) {
        return engine.branchLineage(clanId, branchId, includeSubBranches, relationScopes,
                dataView, maxDepth, maxNodes, maxEdges, actorId);
    }
}
'''
source_path.write_text(facade, encoding="utf-8")

for path in (lineage_path, branch_path):
    text = path.read_text(encoding="utf-8")
    text = text.replace("TreeApplicationService legacyEngine", "TreeGraphEngine graphEngine")
    text = text.replace("TreeApplicationService legacyEngine,", "TreeGraphEngine graphEngine,")
    text = text.replace("this.legacyEngine = legacyEngine;", "this.graphEngine = graphEngine;")
    text = text.replace("legacyEngine.", "graphEngine.")
    path.write_text(text, encoding="utf-8")

Path(__file__).unlink()
workflow = root / ".github/workflows/issue-926-refactor.yml"
if workflow.exists():
    workflow.unlink()
