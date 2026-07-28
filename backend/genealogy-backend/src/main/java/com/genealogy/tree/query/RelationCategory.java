package com.genealogy.tree.query;

import com.genealogy.common.exception.BusinessException;

import java.util.Arrays;

public enum RelationCategory {
    BLOOD("blood"),
    RITUAL("ritual"),
    MARRIAGE("marriage"),
    STATUS("status");

    private final String apiValue;

    RelationCategory(String apiValue) {
        this.apiValue = apiValue;
    }

    public String apiValue() {
        return apiValue;
    }

    public static RelationCategory fromApiValue(String value) {
        String normalized = value == null ? "" : value.trim().toLowerCase();
        return Arrays.stream(values())
                .filter(category -> category.apiValue.equals(normalized))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        "TREE_RELATION_SCOPE_INVALID",
                        "关系范围无效，支持 blood、ritual、marriage、status"
                ));
    }
}
