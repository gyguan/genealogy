package com.genealogy.tree.repository;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Keeps PostgreSQL bind parameter lists bounded and deterministic.
 */
final class TreeQueryBatcher {

    static final int DEFAULT_BATCH_SIZE = 500;

    private TreeQueryBatcher() {
    }

    static <T> List<List<T>> partition(Collection<T> values, int batchSize) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        if (batchSize < 1) {
            throw new IllegalArgumentException("batchSize must be positive");
        }
        List<T> ordered = new ArrayList<>(values);
        List<List<T>> batches = new ArrayList<>((ordered.size() + batchSize - 1) / batchSize);
        for (int start = 0; start < ordered.size(); start += batchSize) {
            batches.add(List.copyOf(ordered.subList(start, Math.min(start + batchSize, ordered.size()))));
        }
        return List.copyOf(batches);
    }
}
