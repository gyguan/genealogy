package com.genealogy.imports.application;

import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class ImportFileScalePolicyTest {

    private final ImportFileScalePolicy policy = new ImportFileScalePolicy();

    @Test
    void csvStopsAtThresholdWithoutInventingRowCount() {
        MockMultipartFile small = csv("name\nA\nB\n");
        MockMultipartFile large = csv("name\nA\nB\nC\n");

        assertThat(policy.evaluate(small, 3)).isEqualTo(ImportFileScalePolicy.Decision.SMALL);
        assertThat(policy.evaluate(large, 3)).isEqualTo(ImportFileScalePolicy.Decision.LARGE);
    }

    @Test
    void xlsxUsesStreamingRowProbeForSmallAndLargeFiles() throws Exception {
        assertThat(policy.evaluate(xlsx(2), 3)).isEqualTo(ImportFileScalePolicy.Decision.SMALL);
        assertThat(policy.evaluate(xlsx(3), 3)).isEqualTo(ImportFileScalePolicy.Decision.LARGE);
    }

    private MockMultipartFile csv(String content) {
        return new MockMultipartFile("file", "persons.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8));
    }

    private MockMultipartFile xlsx(int dataRows) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("persons");
            sheet.createRow(0).createCell(0).setCellValue("name");
            for (int i = 1; i <= dataRows; i++) sheet.createRow(i).createCell(0).setCellValue("person-" + i);
            workbook.write(output);
            return new MockMultipartFile(
                    "file", "persons.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    output.toByteArray()
            );
        }
    }
}
