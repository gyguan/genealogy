package com.genealogy.culture.dto;

import java.util.List;
import java.util.Objects;

public final class CultureSiteSearchCriteria {

    private final String keyword;
    private final List<String> siteTypes;
    private final List<Long> branchIds;
    private final String addressText;
    private final String foundedPeriod;
    private final String currentStatus;
    private final Long relatedPersonId;
    private final List<String> dataStatuses;
    private final String privacyLevel;
    private final Boolean featuredOnHome;
    private final String sort;

    public CultureSiteSearchCriteria(
            String keyword,
            String siteType,
            Long branchId,
            String addressText,
            String foundedPeriod,
            String currentStatus,
            Long relatedPersonId,
            String dataStatus,
            String privacyLevel,
            Boolean featuredOnHome,
            String sort
    ) {
        this(keyword, single(siteType), single(branchId), addressText, foundedPeriod, currentStatus, relatedPersonId,
                single(dataStatus), privacyLevel, featuredOnHome, sort);
    }

    private CultureSiteSearchCriteria(
            String keyword,
            List<String> siteTypes,
            List<Long> branchIds,
            String addressText,
            String foundedPeriod,
            String currentStatus,
            Long relatedPersonId,
            List<String> dataStatuses,
            String privacyLevel,
            Boolean featuredOnHome,
            String sort
    ) {
        this.keyword = keyword;
        this.siteTypes = copy(siteTypes);
        this.branchIds = copy(branchIds);
        this.addressText = addressText;
        this.foundedPeriod = foundedPeriod;
        this.currentStatus = currentStatus;
        this.relatedPersonId = relatedPersonId;
        this.dataStatuses = copy(dataStatuses);
        this.privacyLevel = privacyLevel;
        this.featuredOnHome = featuredOnHome;
        this.sort = sort;
    }

    public static CultureSiteSearchCriteria multi(
            String keyword,
            List<String> siteTypes,
            List<Long> branchIds,
            String addressText,
            String foundedPeriod,
            String currentStatus,
            Long relatedPersonId,
            List<String> dataStatuses,
            String privacyLevel,
            Boolean featuredOnHome,
            String sort
    ) {
        return new CultureSiteSearchCriteria(keyword, siteTypes, branchIds, addressText, foundedPeriod, currentStatus,
                relatedPersonId, dataStatuses, privacyLevel, featuredOnHome, sort);
    }

    private static <T> List<T> single(T value) {
        return value == null ? List.of() : List.of(value);
    }

    private static <T> List<T> copy(List<T> values) {
        return values == null ? List.of() : values.stream().filter(Objects::nonNull).toList();
    }

    public String keyword() { return keyword; }
    public List<String> siteTypes() { return siteTypes; }
    public List<Long> branchIds() { return branchIds; }
    public String addressText() { return addressText; }
    public String foundedPeriod() { return foundedPeriod; }
    public String currentStatus() { return currentStatus; }
    public Long relatedPersonId() { return relatedPersonId; }
    public List<String> dataStatuses() { return dataStatuses; }
    public String privacyLevel() { return privacyLevel; }
    public Boolean featuredOnHome() { return featuredOnHome; }
    public String sort() { return sort; }

    public String siteType() { return siteTypes.isEmpty() ? null : siteTypes.get(0); }
    public Long branchId() { return branchIds.isEmpty() ? null : branchIds.get(0); }
    public String dataStatus() { return dataStatuses.isEmpty() ? null : dataStatuses.get(0); }
}
