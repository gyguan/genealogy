package com.genealogy.person.dto;

import java.util.List;
import java.util.Objects;

public record PersonSearchQuery(
        Long clanId,
        Long branchId,
        String keyword,
        String name,
        List<String> genders,
        List<Integer> generationNos,
        List<String> generationWords,
        List<String> dataStatuses,
        String sort
) {

    public static final String DEFAULT_SORT = "updatedAt,desc";

    public PersonSearchQuery {
        keyword = trimToNull(keyword);
        name = trimToNull(name);
        genders = normalizeStrings(genders);
        generationNos = normalizeNumbers(generationNos);
        generationWords = normalizeStrings(generationWords);
        dataStatuses = normalizeStrings(dataStatuses);
        sort = normalizeSort(sort);
    }

    /**
     * Keeps callers using the original single-value contract source compatible.
     */
    public PersonSearchQuery(
            Long clanId,
            Long branchId,
            String keyword,
            String name,
            String gender,
            Integer generationNo,
            String generationWord,
            String dataStatus
    ) {
        this(
                clanId,
                branchId,
                keyword,
                name,
                singleton(gender),
                generationNo == null ? List.of() : List.of(generationNo),
                singleton(generationWord),
                singleton(dataStatus),
                DEFAULT_SORT
        );
    }

    private static List<String> normalizeStrings(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        return values.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .distinct()
                .toList();
    }

    private static List<Integer> normalizeNumbers(List<Integer> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        return values.stream()
                .filter(Objects::nonNull)
                .filter(value -> value > 0)
                .distinct()
                .toList();
    }

    private static List<String> singleton(String value) {
        String normalized = trimToNull(value);
        return normalized == null ? List.of() : List.of(normalized);
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String normalizeSort(String value) {
        String normalized = trimToNull(value);
        if ("name,asc".equals(normalized) || "generationNo,asc".equals(normalized)) {
            return normalized;
        }
        return DEFAULT_SORT;
    }
}