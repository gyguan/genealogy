package com.genealogy.member.application;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class MemberPermissionLoggingArchitectureTest {

    private static final Path APPLICATION = Path.of("src/main/java/com/genealogy/member/application");

    @Test
    void grantAndMembershipChangesMustEmitRuntimeSummaries() throws IOException {
        String aspect = Files.readString(APPLICATION.resolve("MemberPermissionRuntimeLoggingAspect.java"));

        assertThat(aspect)
                .contains("createGrant")
                .contains("updateGrant")
                .contains("revokeGrant")
                .contains("updateMemberStatus")
                .contains("event=member_permission_changed")
                .contains("event=member_permission_change_rejected")
                .contains("actorId={}")
                .contains("clanId={}")
                .contains("targetType={}")
                .contains("targetId={}")
                .contains("costMs={}")
                .doesNotContain("reason={}")
                .doesNotContain("displayName={}");
    }

    @Test
    void detailedGrantAndStatusChangesMustRemainPersistentlyAudited() throws IOException {
        String service = Files.readString(APPLICATION.resolve("MemberPermissionApplicationService.java"));

        assertThat(service)
                .contains("\"member_grant_create\"")
                .contains("\"member_grant_update\"")
                .contains("\"member_grant_revoke\"")
                .contains("\"member_status_update\"")
                .contains("operationLogApplicationService.record");
    }
}
