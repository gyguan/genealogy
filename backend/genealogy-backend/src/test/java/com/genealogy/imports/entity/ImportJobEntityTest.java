package com.genealogy.imports.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ImportJobEntityTest {

    @Test
    void legacyCombinedSetterShouldSplitImmediately() {
        ImportJobEntity job = new ImportJobEntity();

        job.setImportType("person_xlsx");

        assertThat(job.getImportType()).isEqualTo("person");
        assertThat(job.getFileFormat()).isEqualTo("xlsx");
    }

    @Test
    void persistenceNormalizationShouldInferFormatFromFilename() {
        ImportJobEntity job = new ImportJobEntity();
        job.setImportType("person");
        job.setOriginalFilename("people.xlsx");

        job.normalizeDescriptor();

        assertThat(job.getImportType()).isEqualTo("person");
        assertThat(job.getFileFormat()).isEqualTo("xlsx");
    }
}
