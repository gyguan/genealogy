package com.genealogy.imports.domain;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.entity.ImportJobEntity;

import java.time.LocalDateTime;
import java.util.Objects;

/** Validates that a worker still owns a live lease before it mutates execution progress. */
public class ImportJobLeaseGuard {

    public void requireCurrentOwner(ImportJobEntity job, String owner, LocalDateTime now) {
        if (job == null) {
            throw new BusinessException("IMPORT_JOB_NOT_FOUND", "导入任务不存在");
        }
        if (owner == null || owner.isBlank() || !Objects.equals(owner, job.getLeaseOwner())) {
            throw new BusinessException("IMPORT_JOB_LEASE_OWNER_MISMATCH", "当前 Worker 不再持有任务租约");
        }
        if (job.getLeaseExpiresAt() == null || !job.getLeaseExpiresAt().isAfter(now)) {
            throw new BusinessException("IMPORT_JOB_LEASE_EXPIRED", "导入任务租约已过期");
        }
        if (!ImportJobEntity.EXECUTION_RUNNING.equals(job.getExecutionStatus())) {
            throw new BusinessException("IMPORT_JOB_LEASE_STATE_INVALID", "当前任务状态不允许提交 Worker 执行结果");
        }
    }
}
