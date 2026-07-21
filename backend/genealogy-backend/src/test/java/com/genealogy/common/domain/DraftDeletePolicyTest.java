package com.genealogy.common.domain;

import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DraftDeletePolicyTest {

    @Test
    void draftStatusAllowsDirectDelete() {
        assertThatCode(() -> DraftDeletePolicy.requireDraft(
                " Draft ",
                "OBJECT_DELETE_DRAFT_ONLY",
                "仅草稿对象可直接删除"
        )).doesNotThrowAnyException();
        assertThat(DraftDeletePolicy.isDraft("draft")).isTrue();
    }

    @Test
    void nonDraftStatusRejectsDirectDelete() {
        assertThatThrownBy(() -> DraftDeletePolicy.requireDraft(
                "rejected",
                "OBJECT_DELETE_DRAFT_ONLY",
                "仅草稿对象可直接删除"
        ))
                .isInstanceOf(BusinessException.class)
                .hasMessage("仅草稿对象可直接删除");
        assertThat(DraftDeletePolicy.isDraft("official")).isFalse();
        assertThat(DraftDeletePolicy.isDraft(null)).isFalse();
    }
}
