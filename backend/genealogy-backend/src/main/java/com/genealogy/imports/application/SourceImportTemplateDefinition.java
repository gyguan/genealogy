package com.genealogy.imports.application;

import java.util.List;
import java.util.Map;

public final class SourceImportTemplateDefinition {

    private SourceImportTemplateDefinition() {}

    public static final int SOURCE_NAME_INDEX = 0;
    public static final int SOURCE_TYPE_INDEX = 1;
    public static final int PROVIDER_NAME_INDEX = 2;
    public static final int BOOK_TITLE_INDEX = 3;
    public static final int VOLUME_NO_INDEX = 4;
    public static final int PAGE_NO_INDEX = 5;
    public static final int SOURCE_DATE_INDEX = 6;
    public static final int COLLECTION_LOCATION_INDEX = 7;
    public static final int SOURCE_DESCRIPTION_INDEX = 8;
    public static final int EXCERPT_INDEX = 9;
    public static final int CONFIDENCE_LEVEL_INDEX = 10;
    public static final int PRIVACY_LEVEL_INDEX = 11;
    public static final int SENSITIVE_LEVEL_INDEX = 12;

    public static final List<String> HEADERS = List.of(
            "资料名称", "资料类型", "作者/编纂者", "书名/题名", "卷号", "页码",
            "形成时间", "馆藏位置", "来源说明", "摘录内容", "可信度", "可见范围", "敏感级别"
    );

    public static final List<String> SAMPLE_ROW = List.of(
            "黄氏宗谱卷一", "谱书", "黄氏族人", "黄氏宗谱", "卷一", "12",
            "民国十年", "县档案馆", "示例来源资料", "德字辈记载", "中", "宗族内", "普通"
    );

    public static final Map<String, String> SOURCE_TYPES = Map.of(
            "谱书", "genealogy_book",
            "地方志", "local_chronicle",
            "墓碑", "tombstone",
            "照片", "photo",
            "口述", "oral_history",
            "档案", "archive",
            "其他", "other"
    );

    public static final Map<String, String> CONFIDENCE_LEVELS = Map.of(
            "高", "high",
            "中", "medium",
            "低", "low",
            "未知", "unknown"
    );

    public static final Map<String, String> PRIVACY_LEVELS = Map.of(
            "公开", "public",
            "宗族内", "clan_only",
            "支派内", "branch_only",
            "亲属可见", "relatives_only",
            "私密", "private",
            "封存", "sealed"
    );

    public static final Map<String, String> SENSITIVE_LEVELS = Map.of(
            "普通", "normal",
            "敏感", "sensitive",
            "高度敏感", "highly_sensitive"
    );

    public static List<String> normalizeHeaders(List<String> headers) {
        return headers.stream()
                .map(value -> value == null ? "" : value.replace("\ufeff", "").trim())
                .toList();
    }

    public static String expectedHeaderText() {
        return String.join("、", HEADERS);
    }
}
