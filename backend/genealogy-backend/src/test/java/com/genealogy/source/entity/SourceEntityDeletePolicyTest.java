package com.genealogy.source.entity;

import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SourceEntityDeletePolicyTest {

    @Test
    void draftSourceCanBeRemoved() {
        SourceEntity source = new SourceEntity();
        source.setVerificationStatus("draft");

        assertThatCode(source::requireDraftForDirectDelete).doesNotThrowAnyException();
    }

    @Test
    void rejectedSourceCannotBeRemovedDirectly() {
        SourceEntity source = new SourceEntity();
        source.setVerificationStatus("rejected");

        assertThatThrownBy(source::requireDraftForDirectDelete)
                .isInstanceOfSatisfying(BusinessException.class, exception ->
                        assertThat(exception.getCode()).isEqualTo("SOURCE_DELETE_DRAFT_ONLY"))
                .hasMessage("仅草稿来源可直接删除");
    }
}
