package com.genealogy.review.domain;

/** Commands accepted by the review lifecycle. */
public enum ReviewAction {
    APPROVE,
    REJECT,
    CANCEL,
    APPLY
}
