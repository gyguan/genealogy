package com.genealogy.tree.dto;

public record TreeEvidenceSummary(
        int bindingCount,
        int officialBindingCount,
        String confidenceLevel,
        boolean missingOfficialEvidence
) {
    public static TreeEvidenceSummary empty() {
        return new TreeEvidenceSummary(0, 0, "unknown", true);
    }
}
