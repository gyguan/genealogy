package com.genealogy.architecture;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class ZeroJpaUsageTest {

    private static final Set<String> FORBIDDEN_SOURCE_TOKENS = Set.of(
            "jakarta.persistence",
            "org.springframework.data.jpa",
            "JpaRepository",
            "JpaSpecificationExecutor",
            "EntityManager",
            "TestEntityManager",
            "@DataJpaTest",
            "org.hibernate"
    );

    @Test
    void productionAndTestsMustNotUseJpaOrHibernate() throws IOException {
        List<String> violations = new ArrayList<>();
        scanJava(Path.of("src/main/java"), violations);
        scanJava(Path.of("src/test/java"), violations);
        scanText(Path.of("pom.xml"), List.of("spring-boot-starter-data-jpa", "hibernate-core"), violations);
        scanText(Path.of("src/main/resources/application.yml"), List.of("spring.jpa", "hibernate.ddl-auto"), violations);
        scanYamlDirectory(Path.of("src/test/resources"), violations);

        assertThat(violations)
                .as("JPA/Hibernate references must be zero:\n%s", String.join("\n", violations))
                .isEmpty();
    }

    private static void scanJava(Path root, List<String> violations) throws IOException {
        if (!Files.exists(root)) {
            return;
        }
        try (Stream<Path> paths = Files.walk(root)) {
            paths.filter(path -> path.toString().endsWith(".java"))
                    .filter(path -> !path.endsWith("ZeroJpaUsageTest.java"))
                    .forEach(path -> scan(path, FORBIDDEN_SOURCE_TOKENS, violations));
        }
    }

    private static void scanYamlDirectory(Path root, List<String> violations) throws IOException {
        if (!Files.exists(root)) {
            return;
        }
        try (Stream<Path> paths = Files.walk(root)) {
            paths.filter(path -> {
                        String name = path.getFileName().toString().toLowerCase(Locale.ROOT);
                        return name.endsWith(".yml") || name.endsWith(".yaml") || name.endsWith(".properties");
                    })
                    .forEach(path -> scan(path, Set.of("spring.jpa", "hibernate.ddl-auto"), violations));
        }
    }

    private static void scanText(Path path, List<String> tokens, List<String> violations) {
        if (Files.exists(path)) {
            scan(path, Set.copyOf(tokens), violations);
        }
    }

    private static void scan(Path path, Set<String> tokens, List<String> violations) {
        try {
            List<String> lines = Files.readAllLines(path);
            for (int index = 0; index < lines.size(); index++) {
                String line = lines.get(index);
                for (String token : tokens) {
                    if (line.contains(token)) {
                        violations.add(path + ":" + (index + 1) + " [" + token + "] " + line.trim());
                    }
                }
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to scan " + path, exception);
        }
    }
}
