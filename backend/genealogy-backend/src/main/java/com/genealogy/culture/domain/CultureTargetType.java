package com.genealogy.culture.domain;

/**
 * Culture objects reserved for source binding, revision/review and tracking contracts.
 * Runtime support is delivered by the follow-up culture issues.
 */
public enum CultureTargetType implements CultureValue {
    CULTURE_ITEM("culture_item"),
    MIGRATION_EVENT("migration_event"),
    CULTURE_SITE("culture_site");

    private final String value;

    CultureTargetType(String value) {
        this.value = value;
    }

    @Override
    public String value() {
        return value;
    }

    public static CultureTargetType fromValue(String value) {
        return CultureValue.fromValue(CultureTargetType.class, value);
    }
}
