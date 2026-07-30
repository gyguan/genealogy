package com.genealogy.person.repository.query;

/** Strongly typed dashboard distribution row replacing JPA Object[] projections. */
public record PersonDashboardBucket(String dimension, String key, Long count) {
}
