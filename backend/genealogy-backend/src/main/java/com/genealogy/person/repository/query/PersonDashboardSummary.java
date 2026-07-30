package com.genealogy.person.repository.query;

/** Strongly typed completeness and coverage counters for the home dashboard. */
public record PersonDashboardSummary(
        long peopleTotal,
        long generationMaintained,
        long vitalDatesMaintained,
        long biographyMaintained,
        long keyInfoMissing,
        long coveredBranches
) {
}
