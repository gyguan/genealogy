package com.genealogy.culture.dto;

import java.util.List;
import java.util.Objects;

public final class MigrationEventSearchCriteria {

    private final String keyword;
    private final List<Long> branchIds;
    private final String fromLocation;
    private final String toLocation;
    private final String migrationTimeText;
    private final Long founderPersonId;
    private final List<String> dataStatuses;
    private final String privacyLevel;
    private final String sort;

    public MigrationEventSearchCriteria(
            String keyword,
            Long branchId,
            String fromLocation,
            String toLocation,
            String migrationTimeText,
            Long founderPersonId,
            String dataStatus,
            String privacyLevel,
            String sort
    ) {
        this(keyword, single(branchId), fromLocation, toLocation, migrationTimeText, founderPersonId,
                single(dataStatus), privacyLevel, sort);
    }

    private MigrationEventSearchCriteria(
            String keyword,
            List<Long> branchIds,
            String fromLocation,
            String toLocation,
            String migrationTimeText,
            Long founderPersonId,
            List<String> dataStatuses,
            String privacyLevel,
            String sort
    ) {
        this.keyword = keyword;
        this.branchIds = copy(branchIds);
        this.fromLocation = fromLocation;
        this.toLocation = toLocation;
        this.migrationTimeText = migrationTimeText;
        this.founderPersonId = founderPersonId;
        this.dataStatuses = copy(dataStatuses);
        this.privacyLevel = privacyLevel;
        this.sort = sort;
    }

    public static MigrationEventSearchCriteria multi(
            String keyword,
            List<Long> branchIds,
            String fromLocation,
            String toLocation,
            String migrationTimeText,
            Long founderPersonId,
            List<String> dataStatuses,
            String privacyLevel,
            String sort
    ) {
        return new MigrationEventSearchCriteria(keyword, branchIds, fromLocation, toLocation, migrationTimeText,
                founderPersonId, dataStatuses, privacyLevel, sort);
    }

    private static <T> List<T> single(T value) {
        return value == null ? List.of() : List.of(value);
    }

    private static <T> List<T> copy(List<T> values) {
        return values == null ? List.of() : values.stream().filter(Objects::nonNull).toList();
    }

    public String keyword() { return keyword; }
    public List<Long> branchIds() { return branchIds; }
    public String fromLocation() { return fromLocation; }
    public String toLocation() { return toLocation; }
    public String migrationTimeText() { return migrationTimeText; }
    public Long founderPersonId() { return founderPersonId; }
    public List<String> dataStatuses() { return dataStatuses; }
    public String privacyLevel() { return privacyLevel; }
    public String sort() { return sort; }

    public Long branchId() { return branchIds.isEmpty() ? null : branchIds.get(0); }
    public String dataStatus() { return dataStatuses.isEmpty() ? null : dataStatuses.get(0); }
}
