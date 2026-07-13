package com.genealogy.importexport.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.AnnotatedGenericBeanDefinition;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.context.annotation.AnnotationBeanNameGenerator;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class CsvImportControllerNamingTest {

    private final AnnotationBeanNameGenerator beanNameGenerator = AnnotationBeanNameGenerator.INSTANCE;

    @Test
    void importControllersUseDistinctDefaultBeanNames() {
        String importJobControllerBeanName = beanName(com.genealogy.imports.controller.ImportController.class);
        String csvImportControllerBeanName = beanName(CsvImportController.class);

        assertThat(importJobControllerBeanName).isEqualTo("importController");
        assertThat(csvImportControllerBeanName).isEqualTo("csvImportController");
        assertThat(csvImportControllerBeanName).isNotEqualTo(importJobControllerBeanName);
    }

    @Test
    void personImportRoutesHaveSingleOwners() {
        Set<String> taskGetRoutes = getRoutes(com.genealogy.imports.controller.ImportController.class);
        Set<String> compatibilityGetRoutes = getRoutes(CsvImportController.class);
        Set<String> taskPostRoutes = postRoutes(com.genealogy.imports.controller.ImportController.class);
        Set<String> compatibilityPostRoutes = postRoutes(CsvImportController.class);

        assertThat(taskGetRoutes).contains("/imports/templates/persons.csv");
        assertThat(compatibilityGetRoutes).doesNotContain("/imports/templates/persons.csv");

        assertThat(taskPostRoutes).contains(
                "/clans/{clanId}/imports/persons/preview",
                "/clans/{clanId}/imports/persons.csv"
        );
        assertThat(compatibilityPostRoutes).contains("/clans/{clanId}/imports/persons");
        assertThat(taskPostRoutes).doesNotContain("/clans/{clanId}/imports/persons");
        assertThat(taskPostRoutes).doesNotContainAnyElementsOf(compatibilityPostRoutes);
    }

    private String beanName(Class<?> controllerType) {
        return beanNameGenerator.generateBeanName(
                new AnnotatedGenericBeanDefinition(controllerType),
                new DefaultListableBeanFactory()
        );
    }

    private Set<String> getRoutes(Class<?> controllerType) {
        return Arrays.stream(controllerType.getDeclaredMethods())
                .flatMap(this::getRoutes)
                .collect(Collectors.toSet());
    }

    private Stream<String> getRoutes(Method method) {
        GetMapping mapping = method.getAnnotation(GetMapping.class);
        return mapping == null ? Stream.empty() : Stream.concat(Arrays.stream(mapping.value()), Arrays.stream(mapping.path()));
    }

    private Set<String> postRoutes(Class<?> controllerType) {
        return Arrays.stream(controllerType.getDeclaredMethods())
                .flatMap(this::postRoutes)
                .collect(Collectors.toSet());
    }

    private Stream<String> postRoutes(Method method) {
        PostMapping mapping = method.getAnnotation(PostMapping.class);
        return mapping == null ? Stream.empty() : Stream.concat(Arrays.stream(mapping.value()), Arrays.stream(mapping.path()));
    }
}
