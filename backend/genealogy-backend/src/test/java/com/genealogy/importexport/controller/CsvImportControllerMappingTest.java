package com.genealogy.importexport.controller;

import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.PostMapping;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class CsvImportControllerMappingTest {

    @Test
    void personImportMappingsDoNotOverlapWithImportJobController() {
        Set<String> importJobMappings = postMappings(com.genealogy.imports.controller.ImportController.class);
        Set<String> csvImportMappings = postMappings(CsvImportController.class);

        assertThat(csvImportMappings).contains("/clans/{clanId}/imports/persons");
        assertThat(csvImportMappings).doesNotContain(
                "/clans/{clanId}/imports/persons/preview",
                "/clans/{clanId}/imports/persons.csv"
        );
        assertThat(importJobMappings).contains(
                "/clans/{clanId}/imports/persons/preview",
                "/clans/{clanId}/imports/persons.csv"
        );
        assertThat(csvImportMappings).doesNotContainAnyElementsOf(importJobMappings);
    }

    private Set<String> postMappings(Class<?> controllerType) {
        return Arrays.stream(controllerType.getDeclaredMethods())
                .map(method -> method.getAnnotation(PostMapping.class))
                .filter(annotation -> annotation != null)
                .flatMap(annotation -> Arrays.stream(annotation.value()))
                .collect(Collectors.toSet());
    }
}
