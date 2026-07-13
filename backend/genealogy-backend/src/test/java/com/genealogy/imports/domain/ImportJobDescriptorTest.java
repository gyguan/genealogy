package com.genealogy.imports.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImportJobDescriptorTest {

    @Test
    void shouldSplitLegacyCsvValue() {
        ImportJobDescriptor descriptor = ImportJobDescriptor.resolve("person_csv", null, null);

        assertThat(descriptor.importType()).isEqualTo("person");
        assertThat(descriptor.fileFormat()).isEqualTo("csv");
        assertThat(descriptor.legacyImportType()).isEqualTo("person_csv");
    }

    @Test
    void shouldSplitLegacyXlsxFilterWithoutDefaultingOtherFields() {
        ImportJobDescriptor descriptor = ImportJobDescriptor.fromFilter("person_xlsx", null);

        assertThat(descriptor.importType()).isEqualTo("person");
        assertThat(descriptor.fileFormat()).isEqualTo("xlsx");
    }

    @Test
    void shouldAllowFormatOnlyFilter() {
        ImportJobDescriptor descriptor = ImportJobDescriptor.fromFilter(null, "xlsx");

        assertThat(descriptor.importType()).isBlank();
        assertThat(descriptor.fileFormat()).isEqualTo("xlsx");
    }

    @Test
    void shouldInferFormatFromFilenameForPersistedDescriptor() {
        ImportJobDescriptor descriptor = ImportJobDescriptor.resolve("person", null, "people.xlsx");

        assertThat(descriptor.importType()).isEqualTo("person");
        assertThat(descriptor.fileFormat()).isEqualTo("xlsx");
    }

    @Test
    void shouldRejectUnsupportedFormat() {
        assertThatThrownBy(() -> ImportJobDescriptor.fromFilter("person", "pdf"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unsupported import file format");
    }
}
