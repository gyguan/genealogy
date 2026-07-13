package com.genealogy.imports.domain;

import com.genealogy.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImportTypeRegistryTest {

    @Test
    void shouldResolvePersonCsvAndXlsxDefinitions() {
        ImportTypeRegistry registry = new ImportTypeRegistry(List.of(new PersonImportTypeDefinition()));

        assertThat(registry.require("person", "csv").templateDefinition())
                .isEqualTo("PersonImportTemplateDefinition");
        assertThat(registry.require("person", "xlsx").correctionSchema())
                .isEqualTo("PersonImportRowRetryRequest");
    }

    @Test
    void shouldRejectUnregisteredType() {
        ImportTypeRegistry registry = new ImportTypeRegistry(List.of(new PersonImportTypeDefinition()));

        assertThatThrownBy(() -> registry.require("relationship", "csv"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("暂不支持该导入类型");
    }

    @Test
    void shouldRejectDuplicateRegistrations() {
        assertThatThrownBy(() -> new ImportTypeRegistry(List.of(
                new PersonImportTypeDefinition(),
                new PersonImportTypeDefinition()
        )))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("duplicate import type registration");
    }
}
