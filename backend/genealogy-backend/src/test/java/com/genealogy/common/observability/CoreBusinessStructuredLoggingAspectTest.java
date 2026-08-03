package com.genealogy.common.observability;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class CoreBusinessStructuredLoggingAspectTest {

    private static final Path SOURCE = Path.of(
            "src/main/java/com/genealogy/common/observability/CoreBusinessStructuredLoggingAspect.java"
    );

    @Test
    void coversCoreWriteDomainsWithoutRepositoryOrMapperPointcuts() throws IOException {
        String source = Files.readString(SOURCE);

        assertThat(source)
                .contains("MemberPermissionApplicationService.createGrant")
                .contains("com.genealogy.review.application")
                .contains("com.genealogy.imports.application")
                .contains("com.genealogy.person.application")
                .contains("com.genealogy.relationship.application")
                .contains("com.genealogy.branch.application")
                .contains("export*(..)")
                .contains("Attachment*ApplicationService.delete*(..)")
                .doesNotContain("repository..")
                .doesNotContain("mapper..");
    }

    @Test
    void onlyAllowsSafeScalarIdentifiersAndNeverSerializesArguments() throws IOException {
        String source = Files.readString(SOURCE);

        assertThat(source)
                .contains("SAFE_PARAMETER_NAMES")
                .contains("isSafeScalar")
                .doesNotContain("password")
                .doesNotContain("token")
                .doesNotContain("cookie")
                .doesNotContain("email")
                .doesNotContain("phone")
                .doesNotContain("rawData")
                .doesNotContain("Arrays.toString")
                .doesNotContain("joinPoint.getArgs().toString");
    }

    @Test
    void usesRequiredSeverityAndStructuredFieldContract() throws IOException {
        String source = Files.readString(SOURCE);

        assertThat(source)
                .contains("log.info(message)")
                .contains("log.warn(message)")
                .contains("log.error(message)")
                .contains("event=")
                .contains("result=")
                .contains("durationMs=");
    }
}
