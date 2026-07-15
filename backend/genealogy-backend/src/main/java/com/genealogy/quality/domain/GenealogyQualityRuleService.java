package com.genealogy.quality.domain;

import com.genealogy.tree.dto.TreeEdgeResponse;
import com.genealogy.tree.dto.TreeNodeResponse;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class GenealogyQualityRuleService {

    public List<String> personAnomalyCodes(
            TreeNodeResponse node,
            boolean missingOfficialEvidence,
            boolean isolated
    ) {
        Set<String> codes = new LinkedHashSet<>();
        if (node.generationNo() == null || isBlank(node.generationWord())) {
            codes.add("generation_mismatch");
        }
        if (missingOfficialEvidence) {
            codes.add("missing_source");
        }
        if (isolated) {
            codes.add("isolated_person");
        }
        return List.copyOf(codes);
    }

    public List<String> relationshipAnomalyCodes(
            TreeEdgeResponse edge,
            TreeNodeResponse from,
            TreeNodeResponse to,
            boolean possibleDuplicate,
            boolean missingOfficialEvidence
    ) {
        Set<String> codes = new LinkedHashSet<>();
        if (possibleDuplicate) {
            codes.add("possible_duplicate");
        }
        if (missingOfficialEvidence) {
            codes.add("missing_source");
        }
        if (edge.fromNodeId().equals(edge.toNodeId())) {
            codes.add("relationship_conflict");
        }
        if (isLineage(edge)
                && from != null
                && to != null
                && from.generationNo() != null
                && to.generationNo() != null
                && to.generationNo() <= from.generationNo()) {
            codes.add("generation_mismatch");
        }
        return List.copyOf(codes);
    }

    public String highestRisk(List<String> codes) {
        if (codes.contains("relationship_conflict")) {
            return "high";
        }
        if (codes.contains("possible_duplicate") || codes.contains("generation_mismatch")) {
            return "medium";
        }
        if (codes.contains("missing_source") || codes.contains("isolated_person")) {
            return "low";
        }
        return "none";
    }

    private boolean isLineage(TreeEdgeResponse edge) {
        return Boolean.TRUE.equals(edge.isLineageRelation())
                || "parent_child".equals(edge.relationType())
                || "ritual".equals(edge.relationCategory());
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
