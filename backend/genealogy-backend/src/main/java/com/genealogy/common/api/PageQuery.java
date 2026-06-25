package com.genealogy.common.api;

public record PageQuery(
        Integer pageNo,
        Integer pageSize
) {

    public int normalizedPageNo() {
        return pageNo == null || pageNo < 1 ? 1 : pageNo;
    }

    public int normalizedPageSize() {
        return pageSize == null || pageSize < 1 ? 20 : Math.min(pageSize, 200);
    }
}
