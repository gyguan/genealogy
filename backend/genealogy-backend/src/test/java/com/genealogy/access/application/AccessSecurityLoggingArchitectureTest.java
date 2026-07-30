package com.genealogy.access.application;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class AccessSecurityLoggingArchitectureTest {

    @Test
    void deniedAccessAndSensitiveFullDisclosureMustUseStableEvents() throws IOException {
        String source = Files.readString(Path.of(
                "src/main/java/com/genealogy/access/application/UnifiedAccessDecisionService.java"
        ));

        assertThat(source)
                .contains("event=access_decision_denied")
                .contains("event=privacy_full_disclosure")
                .contains("actorId={}")
                .contains("clanId={}")
                .contains("branchId={}")
                .contains("resourceType={}")
                .contains("resourceId={}")
                .contains("reasonCode={}")
                .contains("dataScope={}")
                .contains("operationLogApplicationService.record")
                .contains("\"privacy_full_disclosure\"")
                .doesNotContain("phone={}")
                .doesNotContain("email={}")
                .doesNotContain("attachmentPath={}");
    }

    @Test
    void ordinaryAllowedDecisionsMustNotGenerateInfoLogs() throws IOException {
        String source = Files.readString(Path.of(
                "src/main/java/com/genealogy/access/application/UnifiedAccessDecisionService.java"
        ));

        assertThat(source)
                .doesNotContain("event=access_decision_allowed")
                .contains("disclosure == PrivacyDisclosure.FULL && containsSensitiveData(resource)");
    }
}
