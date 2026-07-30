package com.genealogy.operationlog.entity;

import com.genealogy.operationlog.application.OperationLogEventBridge;
import jakarta.persistence.PostPersist;

/** Publishes only after JPA has persisted the audit entity successfully. */
public class OperationLogEntityListener {

    @PostPersist
    public void afterPersist(OperationLogEntity entity) {
        OperationLogEventBridge.publish(entity);
    }
}
