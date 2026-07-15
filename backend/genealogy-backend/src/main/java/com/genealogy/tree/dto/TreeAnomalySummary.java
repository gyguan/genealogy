package com.genealogy.tree.dto;

import java.util.List;

public record TreeAnomalySummary(
        List<String> codes,
        int count,
        String highestRisk
) {
    public TreeAnomalySummary {
        codes = codes == null ? List.of() : List.copyOf(codes);
    }

    public static TreeAnomalySummary empty() {
        return new TreeAnomalySummary(List.of(), 0, "none");
    }
}
