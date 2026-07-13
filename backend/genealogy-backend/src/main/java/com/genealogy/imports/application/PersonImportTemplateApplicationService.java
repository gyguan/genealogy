package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.domain.ImportJobDescriptor;
import com.genealogy.imports.domain.ImportTypeRegistry;
import com.genealogy.imports.domain.PersonImportTypeDefinition;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class PersonImportTemplateApplicationService {

    private final ImportTypeRegistry importTypeRegistry;

    /**
     * Compatibility constructor for direct unit-test and utility construction.
     */
    public PersonImportTemplateApplicationService() {
        this(new ImportTypeRegistry(List.of(new PersonImportTypeDefinition())));
    }

    @Autowired
    public PersonImportTemplateApplicationService(ImportTypeRegistry importTypeRegistry) {
        this.importTypeRegistry = importTypeRegistry;
    }

    public byte[] buildCsvTemplate() {
        importTypeRegistry.require(PersonImportTypeDefinition.TYPE, ImportJobDescriptor.FORMAT_CSV);
        String content = "\ufeff"
                + String.join(",", PersonImportTemplateDefinition.HEADERS)
                + "\n"
                + String.join(",", PersonImportTemplateDefinition.SAMPLE_ROW)
                + "\n";
        return content.getBytes(StandardCharsets.UTF_8);
    }

    public byte[] buildXlsxTemplate() {
        importTypeRegistry.require(PersonImportTypeDefinition.TYPE, ImportJobDescriptor.FORMAT_XLSX);
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("人物导入");
            writeRow(sheet.createRow(0), PersonImportTemplateDefinition.HEADERS);
            writeRow(sheet.createRow(1), PersonImportTemplateDefinition.SAMPLE_ROW);
            for (int index = 0; index < PersonImportTemplateDefinition.HEADERS.size(); index++) {
                sheet.autoSizeColumn(index);
            }
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new BusinessException("IMPORT_TEMPLATE_BUILD_FAILED", "人物导入模板生成失败");
        }
    }

    private void writeRow(Row row, java.util.List<String> values) {
        for (int index = 0; index < values.size(); index++) {
            row.createCell(index).setCellValue(values.get(index));
        }
    }
}
