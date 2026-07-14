package com.genealogy.culture.domain;

public enum CulturePrivacyLevel implements CultureValue {
    PUBLIC("public"),
    CLAN_ONLY("clan_only"),
    BRANCH_ONLY("branch_only"),
    RELATIVES_ONLY("relatives_only"),
    PRIVATE("private"),
    SEALED("sealed");

    private final String value;

    CulturePrivacyLevel(String value) {
        this.value = value;
    }

    @Override
    public String value() {
        return value;
    }

    public static CulturePrivacyLevel fromValue(String value) {
        return CultureValue.fromValue(CulturePrivacyLevel.class, value);
    }
}
