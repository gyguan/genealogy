package com.genealogy.culture.domain;

public enum CultureConfidenceLevel implements CultureValue {
    HIGH("high"),
    MEDIUM("medium"),
    LOW("low"),
    UNKNOWN("unknown");

    private final String value;

    CultureConfidenceLevel(String value) {
        this.value = value;
    }

    @Override
    public String value() {
        return value;
    }

    public static CultureConfidenceLevel fromValue(String value) {
        return CultureValue.fromValue(CultureConfidenceLevel.class, value);
    }
}
