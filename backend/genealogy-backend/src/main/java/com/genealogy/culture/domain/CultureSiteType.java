package com.genealogy.culture.domain;

public enum CultureSiteType implements CultureValue {
    ANCESTRAL_HALL("ancestral_hall"),
    ANCESTRAL_HOME("ancestral_home"),
    CEMETERY("cemetery"),
    MEMORIAL("memorial"),
    OTHER("other");

    private final String value;

    CultureSiteType(String value) {
        this.value = value;
    }

    @Override
    public String value() {
        return value;
    }

    public static CultureSiteType fromValue(String value) {
        return CultureValue.fromValue(CultureSiteType.class, value);
    }
}
