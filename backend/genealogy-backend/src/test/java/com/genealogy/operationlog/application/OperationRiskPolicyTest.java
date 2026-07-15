package com.genealogy.operationlog.application;

import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

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

    @ParameterizedTest
    @ValueSource(strings = {
            "member_grant_create",
            "member_grant_update",
            "member_grant_revoke",
            "member_status_update"
    })
    void classifiesPermissionChangesFromStableActionTypes(String actionType) {
        OperationRiskContext context = OperationRiskPolicy.resolve(actionType, null);

        assertThat(context.riskLevel()).isEqualTo("high");
        assertThat(context.eventType()).isEqualTo("permission_change");
        assertThat(context.dispositionStatus()).isEqualTo("resolved");
    }

    @Test
    void attachmentAccessRequiresExplicitSensitivityContext() {
        assertThat(OperationRiskPolicy.resolve("source_attachment_preview", null)).isNull();
        assertThat(OperationRiskPolicy.resolve("source_attachment_download", null)).isNull();

        OperationRiskContext context = OperationRiskPolicy.resolve(
                "source_attachment_download",
                OperationRiskPolicy.sensitiveAccess(false, true, 88L)
        );
        assertThat(context.riskLevel()).isEqualTo("high");
        assertThat(context.eventType()).isEqualTo("sensitive_access");
        assertThat(context.branchId()).isEqualTo(88L);
    }

    @Test
    void explicitContextOverridesCompatibilityMappingAndKeepsBranchSnapshot() {
        OperationRiskContext context = OperationRiskPolicy.resolve(
                "member_grant_create",
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
