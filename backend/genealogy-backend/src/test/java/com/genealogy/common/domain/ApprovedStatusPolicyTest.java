package com.genealogy.common.domain;

import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ApprovedStatusPolicyTest {

    @Test
    void acceptsOnlyExplicitApprovedStatuses() {
        assertTrue(ApprovedStatusPolicy.isApproved("official"));
        assertTrue(ApprovedStatusPolicy.isApproved(" APPROVED "));
        assertTrue(ApprovedStatusPolicy.isApproved("active"));
        assertFalse(ApprovedStatusPolicy.isApproved(null));
        assertFalse(ApprovedStatusPolicy.isApproved(""));
        assertFalse(ApprovedStatusPolicy.isApproved("draft"));
        assertFalse(ApprovedStatusPolicy.isApproved("pending_review"));
    }

    @Test
    void rejectsUnapprovedDependencyWithStableCode() {
        BusinessException error = assertThrows(BusinessException.class,
      () -> ApprovedStatusPolicy.requireApproved("draft", "DEPENDENCY_NOT_OFFICIAL", "依赖对象未审核通过"));
        org.junit.jupiter.api.Assertions.assertEquals("DEPENDENCY_NOT_OFFICIAL", error.getCode());
    }
}
