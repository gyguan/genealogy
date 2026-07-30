package com.genealogy.person.repository.query;

import java.time.LocalDate;

/** Number of official people created on a calendar day. */
public record PersonDashboardDailyCount(LocalDate day, long count) {
}
