package com.genealogy.culture.domain;

public enum CultureSensitiveLevel implements CultureValue {
    NORMAL("normal"),
    SENSITIVE("sensitive"),
    HIGHLY_SENSITIVE("highly_sensitive");

    private final String value;

    CultureSensitiveLevel(String value) {
        this.value = value;
    }

    @Override
    public String value() {
        return value;
    }

    public static CultureSensitiveLevel fromValue(String value) {
        return CultureValue.fromValue(CultureSensitiveLevel.class, value);
    }
}
