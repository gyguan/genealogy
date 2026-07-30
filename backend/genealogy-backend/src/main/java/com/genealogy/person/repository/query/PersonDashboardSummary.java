package com.genealogy.person.repository.query;

/** Strongly typed completeness and coverage counters for the home dashboard. */
public record PersonDashboardSummary(
        Long peopleTotal,
        Long generationMaintained,
        Long vitalDatesMaintained,
        Long biographyMaintained,
        Long keyInfoMissing,
        Long coveredBranches
) {
}
