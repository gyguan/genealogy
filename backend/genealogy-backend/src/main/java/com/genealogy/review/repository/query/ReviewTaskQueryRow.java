package com.genealogy.review.repository.query;

import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;

/** Flattened join row converted to the existing repository pair contract. */
public class ReviewTaskQueryRow {
    private Long taskId; private Long taskClanId; private Long revisionId; private String taskTraceId;
    private Integer reviewLevel; private Long reviewerId; private String reviewerRole; private Long branchId;
    private String taskStatus; private String reviewComment; private java.time.LocalDateTime reviewedAt; private java.time.LocalDateTime taskCreatedAt;
    private Long recordId; private Long recordClanId; private String recordTraceId; private String targetType; private Long targetId;
    private String changeType; private String oldPayload; private String newPayload; private String diffSummary; private Long submitterId;
    private java.time.LocalDateTime submitTime; private String recordStatus; private java.time.LocalDateTime approvedAt; private String rejectedReason;
    public CheckTaskEntity task() { CheckTaskEntity e=new CheckTaskEntity(); e.setId(taskId); e.setClanId(taskClanId); e.setRevisionId(revisionId); e.setTraceId(parseUuid(taskTraceId)); e.setReviewLevel(reviewLevel); e.setReviewerId(reviewerId); e.setReviewerRole(reviewerRole); e.setBranchId(branchId); e.setStatus(taskStatus); e.setReviewComment(reviewComment); e.setReviewedAt(reviewedAt); e.setCreatedAt(taskCreatedAt); return e; }
    public AuditRecordEntity record() { AuditRecordEntity e=new AuditRecordEntity(); e.setId(recordId); e.setClanId(recordClanId); e.setTraceId(parseUuid(recordTraceId)); e.setTargetType(targetType); e.setTargetId(targetId); e.setChangeType(changeType); e.setOldPayload(oldPayload); e.setNewPayload(newPayload); e.setDiffSummary(diffSummary); e.setSubmitterId(submitterId); e.setSubmitTime(submitTime); e.setStatus(recordStatus); e.setApprovedAt(approvedAt); e.setRejectedReason(rejectedReason); return e; }
    public void setTaskId(Long v){taskId=v;} public void setTaskClanId(Long v){taskClanId=v;} public void setRevisionId(Long v){revisionId=v;} public void setTaskTraceId(String v){taskTraceId=v;} public void setReviewLevel(Integer v){reviewLevel=v;} public void setReviewerId(Long v){reviewerId=v;} public void setReviewerRole(String v){reviewerRole=v;} public void setBranchId(Long v){branchId=v;} public void setTaskStatus(String v){taskStatus=v;} public void setReviewComment(String v){reviewComment=v;} public void setReviewedAt(java.time.LocalDateTime v){reviewedAt=v;} public void setTaskCreatedAt(java.time.LocalDateTime v){taskCreatedAt=v;}
    public void setRecordId(Long v){recordId=v;} public void setRecordClanId(Long v){recordClanId=v;} public void setRecordTraceId(String v){recordTraceId=v;} public void setTargetType(String v){targetType=v;} public void setTargetId(Long v){targetId=v;} public void setChangeType(String v){changeType=v;} public void setOldPayload(String v){oldPayload=v;} public void setNewPayload(String v){newPayload=v;} public void setDiffSummary(String v){diffSummary=v;} public void setSubmitterId(Long v){submitterId=v;} public void setSubmitTime(java.time.LocalDateTime v){submitTime=v;} public void setRecordStatus(String v){recordStatus=v;} public void setApprovedAt(java.time.LocalDateTime v){approvedAt=v;} public void setRejectedReason(String v){rejectedReason=v;}
    private static java.util.UUID parseUuid(String value) { return value == null ? null : java.util.UUID.fromString(value); }
}
