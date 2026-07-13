package com.genealogy.imports.application;

import java.util.List;
import java.util.Map;

public final class PersonImportTemplateDefinition {

    public static final int NAME_INDEX = 0;
    public static final int GENDER_INDEX = 1;
    public static final int GENERATION_NO_INDEX = 2;
    public static final int GENERATION_WORD_INDEX = 3;
    public static final int BIRTH_DATE_INDEX = 4;
    public static final int IS_LIVING_INDEX = 5;

    public static final List<String> HEADERS = List.of(
            "姓名",
            "性别",
            "代次",
            "字辈",
            "出生日期",
            "是否在世"
    );

    public static final List<String> SAMPLE_ROW = List.of(
            "张三",
            "男",
            "5",
            "德",
            "1980-01-01",
            "是"
    );

    public static final Map<String, String> GENDER_CODES = Map.of(
            "男", "male",
            "女", "female",
            "未知", "unknown"
    );

    public static final Map<String, Boolean> LIVING_VALUES = Map.of(
            "是", Boolean.TRUE,
            "否", Boolean.FALSE
    );

    private PersonImportTemplateDefinition() {
    }

    public static String normalizeHeader(String value) {
        return value == null ? "" : value.replace("\ufeff", "").trim();
    }

    public static List<String> normalizeHeaders(List<String> headers) {
        return headers.stream().map(PersonImportTemplateDefinition::normalizeHeader).toList();
    }

    public static String expectedHeaderText() {
        return String.join("、", HEADERS);
    }
}
