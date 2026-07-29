package com.genealogy.common.logging;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class SensitiveLoggingArchitectureTest {

    private static final Pattern LOGGER_CALL = Pattern.compile("\\b(?:log|logger)\\.(?:trace|debug|info|warn|error)\\s*\\(");
    private static final Pattern SENSITIVE_ARGUMENT = Pattern.compile(
            "\\b(?:authorization|password|passwordHash|sessionToken|csrfToken|cookie|rawData|fileContent|storagePath)\\b",
            Pattern.CASE_INSENSITIVE
    );

    @Test
    void productionLoggerCallsMustNotIncludeSensitiveArguments() throws IOException {
        Path sourceRoot = Path.of("src/main/java");
        List<String> violations = new ArrayList<>();
        try (var files = Files.walk(sourceRoot)) {
            files.filter(path -> path.toString().endsWith(".java"))
                    .forEach(path -> inspect(path, violations));
        }

        assertThat(violations)
                .as("Logger calls must not include credentials, raw imports or physical storage paths")
                .isEmpty();
    }

    private void inspect(Path path, List<String> violations) {
        try {
            List<String> lines = Files.readAllLines(path);
            StringBuilder statement = new StringBuilder();
            int startLine = 0;
            boolean collecting = false;
            for (int index = 0; index < lines.size(); index++) {
                String line = lines.get(index);
                if (!collecting && LOGGER_CALL.matcher(line).find()) {
                    collecting = true;
                    startLine = index + 1;
                    statement.setLength(0);
                }
                if (collecting) {
                    statement.append(line).append('\n');
                    if (line.contains(");")) {
                        String loggerStatement = statement.toString();
                        if (SENSITIVE_ARGUMENT.matcher(loggerStatement).find()) {
                            violations.add(path + ":" + startLine + " -> " + compact(loggerStatement));
                        }
                        collecting = false;
                    }
                }
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to inspect " + path, exception);
        }
    }

    private String compact(String value) {
        return value.replace('\n', ' ').replaceAll("\\s+", " ").trim().toLowerCase(Locale.ROOT);
    }
}
