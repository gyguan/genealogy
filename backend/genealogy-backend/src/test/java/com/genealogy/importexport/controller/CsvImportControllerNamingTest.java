package com.genealogy.importexport.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.AnnotatedGenericBeanDefinition;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.context.annotation.AnnotationBeanNameGenerator;

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

    private String beanName(Class<?> controllerType) {
        return beanNameGenerator.generateBeanName(
                new AnnotatedGenericBeanDefinition(controllerType),
                new DefaultListableBeanFactory()
        );
    }
}
