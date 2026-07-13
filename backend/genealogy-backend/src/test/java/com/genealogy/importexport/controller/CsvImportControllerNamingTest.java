package com.genealogy.importexport.controller;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationBeanNameGenerator;
import org.springframework.core.type.StandardAnnotationMetadata;

import static org.assertj.core.api.Assertions.assertThat;

class CsvImportControllerNamingTest {

    private final AnnotationBeanNameGenerator beanNameGenerator = AnnotationBeanNameGenerator.INSTANCE;

    @Test
    void importControllersUseDistinctDefaultBeanNames() {
        String importJobControllerBeanName = beanNameGenerator.generateBeanName(
                new StandardAnnotationMetadata(com.genealogy.imports.controller.ImportController.class),
                null
        );
        String csvImportControllerBeanName = beanNameGenerator.generateBeanName(
                new StandardAnnotationMetadata(CsvImportController.class),
                null
        );

        assertThat(importJobControllerBeanName).isEqualTo("importController");
        assertThat(csvImportControllerBeanName).isEqualTo("csvImportController");
        assertThat(csvImportControllerBeanName).isNotEqualTo(importJobControllerBeanName);
    }
}
