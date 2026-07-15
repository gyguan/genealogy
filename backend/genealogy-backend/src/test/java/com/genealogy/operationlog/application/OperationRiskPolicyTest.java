package com.genealogy.operationlog.application;

import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OperationRiskPolicyTest {

    @Test
    void classifiesOnlyStableActionCodesWithoutReadingSummaryText() {
        OperationRiskContext export = OperationRiskPolicy.resolve("operation_log_export", null);
        OperationRiskContext unknown = OperationRiskPolicy.resolve("custom_action", null);

        assertThat(export.riskLevel()).isEqualTo("high");
        assertThat(export.eventType()).isEqualTo("bulk_export");
        assertThat(export.dispositionStatus()).isEqualTo("resolved");
        assertThat(unknown).isNull();
    }

    @Test
    void explicitContextOverridesCompatibilityMappingAndKeepsBranchSnapshot() {
        OperationRiskContext context = OperationRiskPolicy.resolve(
                "source_attachment_preview",
                OperationRiskPolicy.permissionChange(true, 88L)
        );

        assertThat(context.riskLevel()).isEqualTo("critical");
        assertThat(context.eventType()).isEqualTo("permission_change");
        assertThat(context.branchId()).isEqualTo(88L);
    }

    @Test
    void invalidExplicitContextIsRejectedBeforePersistence() {
        assertThatThrownBy(() -> OperationRiskPolicy.resolve(
                "member_grant_create",
                OperationRiskContext.of("urgent", "permission_change", "open", null)
        )).isInstanceOf(BusinessException.class)
                .hasMessageContaining("风险等级");
    }
}
