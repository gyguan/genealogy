package com.genealogy.person.repository.query;

import com.genealogy.person.dto.PersonSearchQuery;

import java.util.List;
import java.util.Objects;

/** Framework-neutral, normalized search contract consumed by Person SQL mappers. */
public final class PersonSearchCriteria {

    public static final String SORT_UPDATED_DESC = "updated_desc";
    public static final String SORT_NAME_ASC = "name_asc";
    public static final String SORT_GENERATION_ASC = "generation_asc";

    private final Long clanId;
    private final Long branchId;
    private final String keyword;
    private final String name;
    private final List<String> genders;
    private final List<Integer> generationNos;
    private final List<String> generationWords;
    private final List<String> dataStatuses;
    private final String sortKey;

    private PersonSearchCriteria(
            Long clanId,
            Long branchId,
            String keyword,
            String name,
            List<String> genders,
            List<Integer> generationNos,
            List<String> generationWords,
            List<String> dataStatuses,
            String sortKey
    ) {
        this.clanId = Objects.requireNonNull(clanId, "clanId");
        this.branchId = branchId;
        this.keyword = keyword;
        this.name = name;
        this.genders = List.copyOf(genders == null ? List.of() : genders);
        this.generationNos = List.copyOf(generationNos == null ? List.of() : generationNos);
        this.generationWords = List.copyOf(generationWords == null ? List.of() : generationWords);
        this.dataStatuses = List.copyOf(dataStatuses == null ? List.of() : dataStatuses);
        this.sortKey = sortKey;
    }

    public static PersonSearchCriteria from(PersonSearchQuery query) {
        Objects.requireNonNull(query, "query");
        return new PersonSearchCriteria(
                query.clanId(),
                query.branchId(),
                text(query.keyword()),
                text(query.name()),
                strings(query.genders(), false),
                query.generationNos(),
                strings(query.generationWords(), false),
                strings(query.dataStatuses(), false),
                switch (query.sort()) {
                    case "name,asc" -> SORT_NAME_ASC;
                    case "generationNo,asc" -> SORT_GENERATION_ASC;
                    default -> SORT_UPDATED_DESC;
                }
        );
    }

    private static String text(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static List<String> strings(List<String> values, boolean ignoredLowerCase) {
        if (values == null || values.isEmpty()) return List.of();
        return values.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .distinct()
                .toList();
    }

    public Long getClanId() { return clanId; }
    public Long getBranchId() { return branchId; }
    public String getKeyword() { return keyword; }
    public String getName() { return name; }
    public List<String> getGenders() { return genders; }
    public List<Integer> getGenerationNos() { return generationNos; }
    public List<String> getGenerationWords() { return generationWords; }
    public List<String> getDataStatuses() { return dataStatuses; }
    public String getSortKey() { return sortKey; }
}
