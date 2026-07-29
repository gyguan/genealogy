package com.genealogy.access.domain;

/**
 * Maximum field disclosure allowed after scope filtering.
 */
public enum PrivacyDisclosure {
    NONE,
    MINIMAL,
    MASKED,
    FULL;

    public boolean allowsSensitiveFields() {
        return this == FULL;
    }
}
