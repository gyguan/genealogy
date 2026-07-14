package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class SourceImportFilePolicyService {

    public void validate(Long branchId, MultipartFile file) {
        if (branchId == null) {
            throw new BusinessException("IMPORT_BRANCH_REQUIRED", "请先选择导入批次管理支派");
        }
        if (file == null || file.isEmpty()) {
            throw new BusinessException("IMPORT_FILE_EMPTY", "导入文件不能为空");
        }
        FileFormat format = resolveFormat(file.getOriginalFilename());
        validateHeaders(readHeaders(file, format));
    }

    FileFormat resolveFormat(String originalFilename) {
        String filename = originalFilename == null ? "" : originalFilename.trim().toLowerCase(Locale.ROOT);
        if (filename.endsWith(".csv")) return FileFormat.CSV;
        if (filename.endsWith(".xlsx")) return FileFormat.XLSX;
        throw new BusinessException("IMPORT_FILE_TYPE_UNSUPPORTED", "来源资料导入只支持系统提供的 CSV 或 XLSX 模板");
    }

    private List<String> readHeaders(MultipartFile file, FileFormat format) {
        try {
            return format == FileFormat.XLSX ? readXlsxHeaders(file) : readCsvHeaders(file);
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException("IMPORT_HEADER_READ_FAILED", "无法读取来源资料导入文件表头");
        }
    }

    private List<String> readCsvHeaders(MultipartFile file) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line = reader.readLine();
            return line == null ? List.of() : parseCsvLine(line);
        }
    }

    private List<String> readXlsxHeaders(MultipartFile file) throws Exception {
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) return List.of();
            Row row = sheet.getRow(sheet.getFirstRowNum());
            if (row == null) return List.of();
            DataFormatter formatter = new DataFormatter();
            int lastCell = Math.max(0, row.getLastCellNum());
            List<String> headers = new ArrayList<>(lastCell);
            for (int index = 0; index < lastCell; index++) {
                Cell cell = row.getCell(index, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                headers.add(cell == null ? "" : formatter.formatCellValue(cell));
            }
            return headers;
        }
    }

    private void validateHeaders(List<String> headers) {
        List<String> actual = SourceImportTemplateDefinition.normalizeHeaders(headers);
        if (actual.isEmpty() || actual.stream().allMatch(String::isBlank)) {
            throw new BusinessException("IMPORT_SOURCE_TEMPLATE_HEADER_REQUIRED", "上传文件缺少来源资料导入模板表头，请重新下载模板填写后上传");
        }
        if (!SourceImportTemplateDefinition.HEADERS.equals(actual)) {
            throw new BusinessException(
                    "IMPORT_SOURCE_TEMPLATE_HEADER_MISMATCH",
                    "上传文件与来源资料导入模板不一致。标准表头："
                            + SourceImportTemplateDefinition.expectedHeaderText()
                            + "；当前表头：" + String.join("、", actual)
            );
        }
    }

    List<String> parseCsvLine(String line) {
        List<String> cells = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        for (int index = 0; index < line.length(); index++) {
            char character = line.charAt(index);
            if (character == '"') {
                if (quoted && index + 1 < line.length() && line.charAt(index + 1) == '"') {
                    current.append('"');
                    index++;
                } else {
                    quoted = !quoted;
                }
            } else if (character == ',' && !quoted) {
                cells.add(current.toString());
                current.setLength(0);
            } else {
                current.append(character);
            }
        }
        if (quoted) throw new BusinessException("IMPORT_HEADER_READ_FAILED", "CSV 模板表头格式不正确");
        cells.add(current.toString());
        return cells;
    }

    enum FileFormat { CSV, XLSX }
}
