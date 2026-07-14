from pathlib import Path

application = Path('backend/genealogy-backend/src/main/resources/application.yml')
text = application.read_text()
old = '''  flyway:
    enabled: false
    locations: classpath:db/migration
'''
new = '''  flyway:
    enabled: false
    locations: classpath:db/migration
    # Historical duplicate versions require targeted validation in FlywayLegacyHistoryGuard.
    validate-on-migrate: false
'''
if old not in text:
    raise SystemExit('flyway configuration marker not found')
application.write_text(text.replace(old, new, 1))

Path('backend/genealogy-backend/src/main/java/com/genealogy/config/FlywayLegacyHistoryGuard.java').write_text('''package com.genealogy.config;

import org.flywaydb.core.api.MigrationInfo;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Objects;
import java.util.Set;

@Configuration
public class FlywayLegacyHistoryGuard {

    private static final Set<String> ALLOWED_LEGACY_VERSIONS = Set.of(
            "3", "4", "5", "22", "20260713184500"
    );

    @Bean
    FlywayMigrationStrategy guardedFlywayMigrationStrategy() {
        return flyway -> {
            for (MigrationInfo info : flyway.info().all()) {
                validateSnapshot(
                        info.getVersion() == null ? null : info.getVersion().toString(),
                        info.getState().name(),
                        info.getInstalledChecksum(),
                        info.getChecksum()
                );
            }
            flyway.migrate();
        };
    }

    static void validateSnapshot(
            String version,
            String state,
            Integer installedChecksum,
            Integer resolvedChecksum
    ) {
        String normalizedState = state == null ? "UNKNOWN" : state;
        if (normalizedState.contains("FAILED") || normalizedState.startsWith("FUTURE")) {
            throw new IllegalStateException("Flyway history contains unsafe migration state: version="
                    + version + ", state=" + normalizedState);
        }

        boolean missing = normalizedState.startsWith("MISSING");
        boolean checksumMismatch = installedChecksum != null
                && resolvedChecksum != null
                && !Objects.equals(installedChecksum, resolvedChecksum);
        if ((missing || checksumMismatch) && !ALLOWED_LEGACY_VERSIONS.contains(version)) {
            throw new IllegalStateException("Unexpected Flyway migration drift: version=" + version
                    + ", state=" + normalizedState);
        }
    }
}
''')

Path('backend/genealogy-backend/src/test/java/com/genealogy/config/FlywayLegacyHistoryGuardTest.java').write_text('''package com.genealogy.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FlywayLegacyHistoryGuardTest {

    @Test
    void allowsKnownLegacyChecksumMismatch() {
        assertDoesNotThrow(() -> FlywayLegacyHistoryGuard.validateSnapshot("3", "SUCCESS", 1, 2));
    }

    @Test
    void allowsKnownLegacyMissingMigration() {
        assertDoesNotThrow(() -> FlywayLegacyHistoryGuard.validateSnapshot(
                "20260713184500", "MISSING_SUCCESS", 1, null));
    }

    @Test
    void rejectsUnexpectedChecksumMismatch() {
        assertThrows(IllegalStateException.class,
                () -> FlywayLegacyHistoryGuard.validateSnapshot("6", "SUCCESS", 1, 2));
    }

    @Test
    void rejectsUnexpectedMissingOrFailedMigration() {
        assertThrows(IllegalStateException.class,
                () -> FlywayLegacyHistoryGuard.validateSnapshot("8", "MISSING_SUCCESS", 1, null));
        assertThrows(IllegalStateException.class,
                () -> FlywayLegacyHistoryGuard.validateSnapshot("3", "FAILED", 1, 1));
    }
}
''')
