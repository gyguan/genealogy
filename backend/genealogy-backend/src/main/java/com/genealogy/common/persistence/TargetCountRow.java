package com.genealogy.common.persistence;

/** Strongly typed aggregate row used by MyBatis target-count queries. */
public class TargetCountRow implements TargetCountProjection {
    private Long targetId;
    private Long count;
    public TargetCountRow() { }
    public Long targetId() { return targetId; }
    public long count() { return count == null ? 0L : count; }
    public void setTargetId(Long targetId) { this.targetId = targetId; }
    public void setCount(Long count) { this.count = count; }
    @Override public Long getTargetId() { return targetId; }
    @Override public long getCount() { return count(); }
}
