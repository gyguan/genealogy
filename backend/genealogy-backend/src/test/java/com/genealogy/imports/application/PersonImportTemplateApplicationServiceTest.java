package com.genealogy.imports.application;

import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PersonImportTemplateApplicationServiceTest {

    private final PersonImportTemplateApplicationService service = new PersonImportTemplateApplicationService();

    @Test
    void csvTemplateShouldUseStrictBusinessHeadersAndChineseValues() {
        String content = new String(service.buildCsvTemplate(), StandardCharsets.UTF_8);

        assertThat(content).startsWith("\ufeff" + String.join(",", PersonImportTemplateDefinition.HEADERS));
        assertThat(content).contains("张三,男,5,德,1980-01-01,是");
        assertThat(content).doesNotContain("branchId", "支派ID", "personCode", "人物ID", "male", "true");
    }

    @Test
    void xlsxTemplateShouldUseTheSameHeadersAndChineseValues() throws Exception {
        try (Workbook workbook = WorkbookFactory.create(
                new ByteArrayInputStream(service.buildXlsxTemplate())
        )) {
            DataFormatter formatter = new DataFormatter();
            Row header = workbook.getSheetAt(0).getRow(0);
            Row sample = workbook.getSheetAt(0).getRow(1);

            assertThat(values(header, formatter)).isEqualTo(PersonImportTemplateDefinition.HEADERS);
            assertThat(values(sample, formatter)).isEqualTo(PersonImportTemplateDefinition.SAMPLE_ROW);
        }
    }

    private List<String> values(Row row, DataFormatter formatter) {
        List<String> values = new ArrayList<>();
        for (int index = 0; index < PersonImportTemplateDefinition.HEADERS.size(); index++) {
            values.add(formatter.formatCellValue(row.getCell(index)));
        }
        return values;
    }
}
