package com.genealogy.tree.repository;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.stream.LongStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TreeQueryBatcherTest {

    @Test
    void shouldPartitionLargeIdentifierSetWithoutLossOrReordering() {
        LinkedHashSet<Long> ids = LongStream.rangeClosed(1, 1_205)
                .boxed()
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));

        List<List<Long>> batches = TreeQueryBatcher.partition(ids, 500);

        assertEquals(List.of(500, 500, 205), batches.stream().map(List::size).toList());
        assertEquals(ids.stream().toList(), batches.stream().flatMap(List::stream).toList());
    }

    @Test
    void shouldReturnNoBatchForEmptyInput() {
        assertTrue(TreeQueryBatcher.partition(List.of(), 500).isEmpty());
    }

    @Test
    void shouldRejectNonPositiveBatchSize() {
        assertThrows(IllegalArgumentException.class, () -> TreeQueryBatcher.partition(List.of(1L), 0));
    }
}
