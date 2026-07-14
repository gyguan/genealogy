package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.domain.ImportJobDescriptor;
import com.genealogy.imports.domain.ImportTypeRegistry;
import com.genealogy.imports.domain.SourceImportTypeDefinition;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Service
public class SourceImportTemplateApplicationService {

    private final ImportTypeRegistry importTypeRegistry;

    public SourceImportTemplateApplicationService(ImportTypeRegistry importTypeRegistry) {
        this.importTypeRegistry = importTypeRegistry;
    }

    public byte[] buildCsvTemplate() {
        importTypeRegistry.require(SourceImportTypeDefinition.TYPE, ImportJobDescriptor.FORMAT_CSV);
        String content = "\ufeff"
                + String.join(",", SourceImportTemplateDefinition.HEADERS)
                + "\n"
                + String.join(",", SourceImportTemplateDefinition.SAMPLE_ROW)
                + "\n";
        return content.getBytes(StandardCharsets.UTF_8);
    }

    public byte[] buildXlsxTemplate() {
        importTypeRegistry.require(SourceImportTypeDefinition.TYPE, ImportJobDescriptor.FORMAT_XLSX);
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("来源资料导入");
            writeRow(sheet.createRow(0), SourceImportTemplateDefinition.HEADERS);
            writeRow(sheet.createRow(1), SourceImportTemplateDefinition.SAMPLE_ROW);
            for (int index = 0; index < SourceImportTemplateDefinition.HEADERS.size(); index++) {
                sheet.autoSizeColumn(index);
            }
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new BusinessException("IMPORT_TEMPLATE_BUILD_FAILED", "来源资料导入模板生成失败");
        }
    }

    private void writeRow(Row row, java.util.List<String> values) {
        for (int index = 0; index < values.size(); index++) {
            row.createCell(index).setCellValue(values.get(index));
        }
    }
}
