package com.genealogy.imports.domain;

import com.genealogy.common.exception.BusinessException;

import java.util.Locale;

public enum ImportExecutionState {
    QUEUED,
    RUNNING,
    PAUSED,
    RETRY_WAIT,
    COMPLETED,
    PARTIAL_FAILED,
    FAILED,
    CANCELLED,
    PARTIAL_CANCELLED,
    DEAD_LETTER;

    public static ImportExecutionState from(String value) {
        try {
            return ImportExecutionState.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (RuntimeException exception) {
            throw new BusinessException("IMPORT_EXECUTION_STATE_INVALID", "导入任务执行状态不合法");
        }
    }

    public boolean terminal() {
        return switch (this) {
            case COMPLETED, PARTIAL_FAILED, FAILED, CANCELLED, PARTIAL_CANCELLED, DEAD_LETTER -> true;
            default -> false;
        };
    }

    public boolean claimable() {
        return this == QUEUED || this == RUNNING || this == RETRY_WAIT;
    }

    public boolean retryable() {
        return this == PARTIAL_FAILED || this == FAILED || this == DEAD_LETTER;
    }
}
