package com.genealogy.source.repository.query;
public class SourceTypeCountRow {
    private String sourceType;
    private Long count;
    public SourceTypeCountRow() { }
    public String sourceType() { return sourceType; }
    public long count() { return count == null ? 0L : count; }
    public void setSourceType(String sourceType) { this.sourceType = sourceType; }
    public void setCount(Long count) { this.count = count; }
}
