package com.genealogy.source.domain;

import com.genealogy.common.exception.BusinessException;

import java.util.Arrays;
import java.util.Locale;

public enum SourceBindingTargetType {
    PERSON("person"),
    RELATIONSHIP("relationship"),
    BRANCH("branch"),
    CLAN("clan"),
    GENERATION_WORD("generation_word");

    private final String apiValue;

    SourceBindingTargetType(String apiValue) {
        this.apiValue = apiValue;
    }

    public String apiValue() {
        return apiValue;
    }

    public static SourceBindingTargetType fromApi(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException("SOURCE_TARGET_TYPE_INVALID", "来源绑定对象类型不合法");
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(item -> item.apiValue.equals(normalized))
                .findFirst()
                .orElseThrow(() -> new BusinessException("SOURCE_TARGET_TYPE_INVALID", "来源绑定对象类型不合法"));
    }
}
