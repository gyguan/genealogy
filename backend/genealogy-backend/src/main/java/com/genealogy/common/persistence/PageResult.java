package com.genealogy.common.persistence;

import java.util.List;
import java.util.function.Function;

/**
 * Framework-neutral repository page result. Infrastructure paging types must
 * not escape into application or API layers.
 */
public record PageResult<T>(List<T> records, long total) {

    public PageResult {
        records = records == null ? List.of() : List.copyOf(records);
        if (total < 0) {
            throw new IllegalArgumentException("total must be greater than or equal to 0");
        }
    }

    public <R> PageResult<R> map(Function<? super T, R> converter) {
        List<R> mapped = records.stream().map(converter).toList();
        return new PageResult<>(mapped, total);
    }
}
