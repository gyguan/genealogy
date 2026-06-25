package com.genealogy.common.api;

import java.util.List;

public record PageResponse<T>(
        List<T> records,
        long total,
        int pageNo,
        int pageSize,
        int totalPages
) {

    public static <T> PageResponse<T> of(List<T> records, long total, int pageNo, int pageSize) {
        int totalPages = pageSize <= 0 ? 0 : (int) Math.ceil((double) total / pageSize);
        return new PageResponse<>(records, total, pageNo, pageSize, totalPages);
    }
}
