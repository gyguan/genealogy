package com.genealogy.common.domain;

import com.genealogy.common.exception.BusinessException;

import java.util.Locale;

/**
 * Shared direct-delete invariant for governed business objects.
 *
 * <p>Only draft objects may be deleted directly. Other lifecycle states must
 * remain visible to their review, archive, or correction workflows.</p>
 */
public final class DraftDeletePolicy {

    public static final String STATUS_DRAFT = "draft";

    private DraftDeletePolicy() {
    }

    public static void requireDraft(String status, String errorCode, String message) {
        if (!STATUS_DRAFT.equals(normalize(status))) {
            throw new BusinessException(errorCode, message);
        }
    }

    public static boolean isDraft(String status) {
        return STATUS_DRAFT.equals(normalize(status));
    }

    private static String normalize(String status) {
        return status == null ? "" : status.trim().toLowerCase(Locale.ROOT);
    }
}
