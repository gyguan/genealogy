package com.genealogy.relationship.domain;

import com.genealogy.common.exception.BusinessException;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Single source of truth for relationship type/category normalization. */
public final class RelationCategoryPolicy {
    public static final String BLOOD = "blood";
    public static final String RITUAL = "ritual";
    public static final String MARRIAGE = "marriage";
    public static final String STATUS = "status";

    private static final Set<String> VALID_CATEGORIES = Set.of(BLOOD, RITUAL, MARRIAGE, STATUS);
    private static final Map<String, String> CATEGORY_BY_TYPE = Map.ofEntries(
            Map.entry("parent_child", BLOOD),
            Map.entry("spouse", MARRIAGE),
            Map.entry("adoptive", RITUAL),
            Map.entry("successor", RITUAL),
            Map.entry("out_adoption", RITUAL),
            Map.entry("in_adoption", RITUAL),
            Map.entry("dual_successor", RITUAL),
            Map.entry("heir_son", RITUAL),
            Map.entry("no_descendant", STATUS)
    );

    private RelationCategoryPolicy() {
    }

    public static String normalizeType(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException("RELATIONSHIP_TYPE_REQUIRED", "relationship type is required");
        }
        String normalized = token(value);
        normalized = switch (normalized) {
            case "继嗣", "入继" -> "in_adoption";
            case "出继", "出嗣" -> "out_adoption";
            case "承祧" -> "successor";
            case "兼祧" -> "dual_successor";
            case "嗣子" -> "heir_son";
            case "无嗣" -> "no_descendant";
            case "继配", "侧室" -> "spouse";
            default -> normalized;
        };
        if (!CATEGORY_BY_TYPE.containsKey(normalized)) {
            throw new BusinessException("RELATIONSHIP_TYPE_UNSUPPORTED", "unsupported relationship type: " + value);
        }
        return normalized;
    }

    public static String categoryForType(String relationType) {
        return CATEGORY_BY_TYPE.get(normalizeType(relationType));
    }

    public static String normalizeAndValidate(String relationType, String requestedCategory) {
        String type = normalizeType(relationType);
        String expected = CATEGORY_BY_TYPE.get(type);
        String normalized = normalizeCategory(requestedCategory);
        if (normalized != null && !expected.equals(normalized)) {
            throw new BusinessException(
                    "RELATIONSHIP_CATEGORY_TYPE_MISMATCH",
                    "relationship category " + normalized + " is incompatible with type " + type
            );
        }
        return expected;
    }

    public static String normalizeCategory(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = token(value);
        normalized = switch (normalized) {
            case "血缘", "blood_relation" -> BLOOD;
            case "礼法", "宗法", "承嗣", "ritual_relation", "succession" -> RITUAL;
            case "婚配", "marital", "marriage_relation" -> MARRIAGE;
            case "状态", "status_marker" -> STATUS;
            default -> normalized;
        };
        if (!VALID_CATEGORIES.contains(normalized)) {
            throw new BusinessException("RELATIONSHIP_CATEGORY_UNSUPPORTED", "unsupported relationship category: " + value);
        }
        return normalized;
    }

    public static Set<String> validCategories() {
        return VALID_CATEGORIES;
    }

    private static String token(String value) {
        return value.trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
    }
}
