package com.genealogy.tree.query;

import com.genealogy.common.exception.BusinessException;

import java.util.Arrays;

public enum TreeDirection {
    FAMILY("family"),
    ANCESTORS("ancestors"),
    DESCENDANTS("descendants"),
    BOTH("both");

    private final String apiValue;

    TreeDirection(String apiValue) {
        this.apiValue = apiValue;
    }

    public String apiValue() {
        return apiValue;
    }

    public static TreeDirection fromApiValue(String value) {
        String normalized = value == null || value.isBlank() ? BOTH.apiValue : value.trim().toLowerCase();
        return Arrays.stream(values())
                .filter(direction -> direction.apiValue.equals(normalized))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        "TREE_DIRECTION_INVALID",
                        "世系图谱查询方向无效，支持 family、ancestors、descendants、both"
                ));
    }
}
