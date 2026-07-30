package com.genealogy.person.repository.query;

import com.genealogy.person.entity.PersonEntity;

import java.util.List;

/** Bounded Person read model used to assemble the home dashboard. */
public record PersonDashboardData(
        PersonDashboardSummary summary,
        List<PersonDashboardBucket> buckets,
        List<PersonDashboardDailyCount> createdDaily,
        List<PersonEntity> recentPeople
) {
    public PersonDashboardData {
        buckets = buckets == null ? List.of() : List.copyOf(buckets);
        createdDaily = createdDaily == null ? List.of() : List.copyOf(createdDaily);
        recentPeople = recentPeople == null ? List.of() : List.copyOf(recentPeople);
    }
}
