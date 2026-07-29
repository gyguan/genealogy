package com.genealogy.imports.domain;

import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImportExecutionStateTest {

    @ParameterizedTest
    @EnumSource(value = ImportExecutionState.class, names = {
            "COMPLETED", "PARTIAL_FAILED", "FAILED", "CANCELLED", "PARTIAL_CANCELLED", "DEAD_LETTER"
    })
    void terminalStatesAreExplicit(ImportExecutionState state) {
        assertThat(state.terminal()).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = ImportExecutionState.class, names = {"QUEUED", "RUNNING", "RETRY_WAIT"})
    void onlyRecoverableQueueStatesAreClaimable(ImportExecutionState state) {
        assertThat(state.claimable()).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = ImportExecutionState.class, names = {"PARTIAL_FAILED", "FAILED", "DEAD_LETTER"})
    void failureStatesAreRetryable(ImportExecutionState state) {
        assertThat(state.retryable()).isTrue();
    }

    @Test
    void invalidFreeFormStateIsRejectedWithStableCode() {
        assertThatThrownBy(() -> ImportExecutionState.from("unknown"))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo("IMPORT_EXECUTION_STATE_INVALID");
    }
}
