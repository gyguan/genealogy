package com.genealogy.culture.domain;

public enum CultureDataStatus implements CultureValue {
    DRAFT("draft"),
    PENDING_REVIEW("pending_review"),
    OFFICIAL("official"),
    REJECTED("rejected"),
    ARCHIVED("archived");

    private final String value;

    CultureDataStatus(String value) {
        this.value = value;
    }

    @Override
    public String value() {
        return value;
    }

    public static CultureDataStatus fromValue(String value) {
        return CultureValue.fromValue(CultureDataStatus.class, value);
    }
}
