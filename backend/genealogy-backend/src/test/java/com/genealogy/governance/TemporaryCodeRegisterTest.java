package com.genealogy.governance;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class TemporaryCodeRegisterTest {

    private static final Path REGISTER = Path.of("config/temporary-code-register.yaml");
    private static final Pattern ITEM = Pattern.compile("(?m)^  - id: (T\\d+)$");

    @Test
    void retainedCompatibilityCodeMustHaveOwnerIssueExitConditionAndRemovalDate() throws IOException {
        String content = Files.readString(REGISTER);
        Matcher matcher = ITEM.matcher(content);
        int itemCount = 0;
        while (matcher.find()) itemCount++;

        assertThat(itemCount).isGreaterThanOrEqualTo(1);
        assertThat(content)
                .doesNotContain("trackingIssue: null")
                .doesNotContain("owner: unknown")
                .contains("trackingIssue:")
                .contains("owner:")
                .contains("exitCondition:")
                .contains("plannedRemoval:");

        long trackedIssues = content.lines().filter(line -> line.trim().matches("trackingIssue: \\d+")).count();
        long owners = content.lines().filter(line -> line.trim().startsWith("owner: ")).count();
        long exits = content.lines().filter(line -> line.trim().startsWith("exitCondition: ")).count();
        long removals = content.lines().filter(line -> line.trim().matches("plannedRemoval: \\d{4}-\\d{2}-\\d{2}")).count();

        assertThat(trackedIssues).isEqualTo(itemCount);
        assertThat(owners).isEqualTo(itemCount);
        assertThat(exits).isEqualTo(itemCount);
        assertThat(removals).isEqualTo(itemCount);
    }
}
