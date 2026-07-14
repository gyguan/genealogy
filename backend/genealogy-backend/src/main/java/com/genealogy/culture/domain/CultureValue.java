package com.genealogy.culture.domain;

import java.util.Arrays;

/**
 * Stable external value contract for culture-domain enums.
 */
public interface CultureValue {

    String value();

    static <E extends Enum<E> & CultureValue> E fromValue(Class<E> enumType, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(enumType.getSimpleName() + " value must not be blank");
        }
        return Arrays.stream(enumType.getEnumConstants())
                .filter(candidate -> candidate.value().equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unsupported " + enumType.getSimpleName() + " value: " + value));
    }
}
