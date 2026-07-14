package com.genealogy.imports.application;

import java.util.List;
import java.util.Map;

public final class RelationshipImportTemplateDefinition {

    public static final int FROM_PERSON_CODE_INDEX = 0;
    public static final int TO_PERSON_CODE_INDEX = 1;
    public static final int RELATIONSHIP_TYPE_INDEX = 2;
    public static final int DESCRIPTION_INDEX = 3;

    public static final List<String> HEADERS = List.of(
            "关系主体编码",
            "关系对象编码",
            "关系类型",
            "说明"
    );

    public static final List<String> SAMPLE_ROW = List.of(
            "P0001",
            "P0002",
            "父子",
            "族谱记载"
    );

    public static final Map<String, RelationshipKind> RELATIONSHIP_KINDS = Map.of(
            "父子", new RelationshipKind("parent_child", "biological_father", "blood", true, true),
            "母子", new RelationshipKind("parent_child", "biological_mother", "blood", true, true),
            "配偶", new RelationshipKind("spouse", "spouse", "marriage", false, false)
    );

    private RelationshipImportTemplateDefinition() {
    }

    public static String normalizeHeader(String value) {
        return value == null ? "" : value.replace("\ufeff", "").trim();
    }

    public static List<String> normalizeHeaders(List<String> headers) {
        return headers.stream().map(RelationshipImportTemplateDefinition::normalizeHeader).toList();
    }

    public static String expectedHeaderText() {
        return String.join("、", HEADERS);
    }

    public record RelationshipKind(
            String relationType,
            String relationLabel,
            String relationCategory,
            boolean lineageRelation,
            boolean biological
    ) {
    }
}
