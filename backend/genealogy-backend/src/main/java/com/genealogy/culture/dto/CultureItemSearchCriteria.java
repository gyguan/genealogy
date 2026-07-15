package com.genealogy.culture.dto;

import java.util.List;
import java.util.Objects;

public final class CultureItemSearchCriteria {

    private final String keyword;
    private final List<String> categories;
    private final List<Long> branchIds;
    private final List<String> dataStatuses;
    private final List<String> privacyLevels;
    private final List<Boolean> hasSourceValues;
    private final List<Boolean> featuredOnHomeValues;
    private final String sort;

    public CultureItemSearchCriteria(
            String keyword,
            String category,
            Long branchId,
            String dataStatus,
            String privacyLevel,
            Boolean hasSource,
            Boolean featuredOnHome,
            String sort
    ) {
        this(keyword, single(category), single(branchId), single(dataStatus), single(privacyLevel),
                single(hasSource), single(featuredOnHome), sort);
    }

    private CultureItemSearchCriteria(
            String keyword,
            List<String> categories,
            List<Long> branchIds,
            List<String> dataStatuses,
            List<String> privacyLevels,
            List<Boolean> hasSourceValues,
            List<Boolean> featuredOnHomeValues,
            String sort
    ) {
        this.keyword = keyword;
        this.categories = copy(categories);
        this.branchIds = copy(branchIds);
        this.dataStatuses = copy(dataStatuses);
        this.privacyLevels = copy(privacyLevels);
        this.hasSourceValues = copy(hasSourceValues);
        this.featuredOnHomeValues = copy(featuredOnHomeValues);
        this.sort = sort;
    }

    public static CultureItemSearchCriteria multi(
            String keyword,
            List<String> categories,
            List<Long> branchIds,
            List<String> dataStatuses,
            List<String> privacyLevels,
            List<Boolean> hasSourceValues,
            List<Boolean> featuredOnHomeValues,
            String sort
    ) {
        return new CultureItemSearchCriteria(keyword, categories, branchIds, dataStatuses, privacyLevels,
                hasSourceValues, featuredOnHomeValues, sort);
    }

    private static <T> List<T> single(T value) {
        return value == null ? List.of() : List.of(value);
    }

    private static <T> List<T> copy(List<T> values) {
        return values == null ? List.of() : values.stream().filter(Objects::nonNull).toList();
    }

    public String keyword() { return keyword; }
    public List<String> categories() { return categories; }
    public List<Long> branchIds() { return branchIds; }
    public List<String> dataStatuses() { return dataStatuses; }
    public List<String> privacyLevels() { return privacyLevels; }
    public List<Boolean> hasSourceValues() { return hasSourceValues; }
    public List<Boolean> featuredOnHomeValues() { return featuredOnHomeValues; }
    public String sort() { return sort; }

    public String category() { return categories.isEmpty() ? null : categories.get(0); }
    public Long branchId() { return branchIds.isEmpty() ? null : branchIds.get(0); }
    public String dataStatus() { return dataStatuses.isEmpty() ? null : dataStatuses.get(0); }
    public String privacyLevel() { return privacyLevels.isEmpty() ? null : privacyLevels.get(0); }
    public Boolean hasSource() { return hasSourceValues.isEmpty() ? null : hasSourceValues.get(0); }
    public Boolean featuredOnHome() { return featuredOnHomeValues.isEmpty() ? null : featuredOnHomeValues.get(0); }
}
