package com.genealogy.imports.application;

import com.genealogy.imports.domain.ImportTypeRegistry;
import com.genealogy.imports.domain.RelationshipImportTypeDefinition;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RelationshipImportTemplateApplicationServiceTest {

    private final RelationshipImportTemplateApplicationService service =
            new RelationshipImportTemplateApplicationService(
                    new ImportTypeRegistry(List.of(new RelationshipImportTypeDefinition()))
            );

    @Test
    void csvAndXlsxShouldUseTheSameStrictTemplate() throws Exception {
        String csv = new String(service.buildCsvTemplate(), StandardCharsets.UTF_8);
        assertThat(csv).startsWith("\ufeff" + String.join(",", RelationshipImportTemplateDefinition.HEADERS));
        assertThat(csv).contains("P0001,P0002,父子,族谱记载");

        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(service.buildXlsxTemplate()))) {
            DataFormatter formatter = new DataFormatter();
            assertThat(formatter.formatCellValue(workbook.getSheetAt(0).getRow(0).getCell(0))).isEqualTo("关系主体编码");
            assertThat(formatter.formatCellValue(workbook.getSheetAt(0).getRow(1).getCell(2))).isEqualTo("父子");
        }
    }
}
