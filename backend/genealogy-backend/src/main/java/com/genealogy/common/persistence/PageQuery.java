package com.genealogy.common.persistence;

/**
 * Framework-neutral one-based paging request used at repository boundaries.
 */
public record PageQuery(int pageNo, int pageSize) {

    public PageQuery {
        if (pageNo < 1) {
            throw new IllegalArgumentException("pageNo must be greater than or equal to 1");
        }
        if (pageSize < 1) {
            throw new IllegalArgumentException("pageSize must be greater than or equal to 1");
        }
    }
}
