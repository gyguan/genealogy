package com.genealogy.access.application;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class UnifiedAccessDecisionArchitectureTest {

    private static final Path MAIN = Path.of("src/main/java/com/genealogy/access");

    @Test
    void decisionMustCarryPermissionScopeAndDisclosureTogether() throws IOException {
        String decision = Files.readString(MAIN.resolve("domain/AccessDecision.java"));
        String service = Files.readString(MAIN.resolve("application/UnifiedAccessDecisionService.java"));

        assertThat(decision)
                .contains("boolean allowed")
                .contains("String reasonCode")
                .contains("DataScope dataScope")
                .contains("PrivacyDisclosure disclosure");
        assertThat(service)
                .contains("decidePerson")
                .contains("decideTree")
                .contains("decideSource")
                .contains("decideMember")
                .contains("authorization.isActiveClanMember")
                .contains("authorization.isCrossClanAdmin")
                .contains("authorization.can");
    }

    @Test
    void stableReasonsMustNotRevealObjectExistence() throws IOException {
        String service = Files.readString(MAIN.resolve("application/UnifiedAccessDecisionService.java"));

        assertThat(service)
                .contains("ACCESS_AUTHENTICATION_REQUIRED")
                .contains("ACCESS_SCOPE_FORBIDDEN")
                .contains("ACCESS_PERMISSION_FORBIDDEN")
                .doesNotContain("NOT_FOUND");
    }
}
