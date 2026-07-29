package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Component
public class PersonImportParser {

    public ReadResult read(MultipartFile file) {
        String filename = file.getOriginalFilename() == null ? "persons.csv" : file.getOriginalFilename();
        try {
            List<ImportRow> rows = filename.toLowerCase(Locale.ROOT).endsWith(".xlsx")
                    ? readXlsxRows(file)
                    : readCsvRows(file);
            return new ReadResult(filename, filename.toLowerCase(Locale.ROOT).endsWith(".xlsx"), rows);
        } catch (IOException exception) {
            throw new BusinessException("IMPORT_FILE_READ_FAILED", "导入文件读取失败");
        }
    }

    public ParsedPersonRow parse(Long branchId, ImportRow row) {
        List<String> cells = row.cells();
        ensureNoExtraColumns(cells);
        String name = cell(cells, PersonImportTemplateDefinition.NAME_INDEX);
        if (name.isBlank()) {
            throw new BusinessException("IMPORT_PERSON_NAME_REQUIRED", "姓名不能为空");
        }
        return new ParsedPersonRow(
                branchId,
                name,
                parseGender(cell(cells, PersonImportTemplateDefinition.GENDER_INDEX)),
                parseGenerationNo(cell(cells, PersonImportTemplateDefinition.GENERATION_NO_INDEX)),
                cell(cells, PersonImportTemplateDefinition.GENERATION_WORD_INDEX),
                parseDate(cell(cells, PersonImportTemplateDefinition.BIRTH_DATE_INDEX)),
                parseLiving(cell(cells, PersonImportTemplateDefinition.IS_LIVING_INDEX))
        );
    }

    private List<ImportRow> readCsvRows(MultipartFile file) throws IOException {
        List<ImportRow> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)
        )) {
            reader.readLine();
            String line;
            int rowNo = 1;
            while ((line = reader.readLine()) != null) {
                rowNo++;
                if (!line.isBlank()) rows.add(new ImportRow(rowNo, parseCsv(line), line));
            }
        }
        return rows;
    }

    private List<ImportRow> readXlsxRows(MultipartFile file) throws IOException {
        List<ImportRow> rows = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) throw new BusinessException("IMPORT_XLSX_EMPTY", "Excel 工作表不能为空");
            int headerRowIndex = sheet.getFirstRowNum();
            for (Row row : sheet) {
                if (row.getRowNum() == headerRowIndex) continue;
                List<String> cells = rowToCells(row, formatter);
                if (cells.stream().allMatch(String::isBlank)) continue;
                rows.add(new ImportRow(row.getRowNum() + 1, cells, String.join(",", cells)));
            }
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException("IMPORT_XLSX_PARSE_FAILED", "Excel 解析失败，请确认文件格式为 .xlsx");
        }
        return rows;
    }

    private List<String> rowToCells(Row row, DataFormatter formatter) {
        int max = Math.max(PersonImportTemplateDefinition.HEADERS.size(), row.getLastCellNum());
        List<String> cells = new ArrayList<>(max);
        for (int index = 0; index < max; index++) {
            Cell cell = row.getCell(index, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
            cells.add(cell == null ? "" : formatter.formatCellValue(cell).trim());
        }
        return cells;
    }

    private List<String> parseCsv(String line) {
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
                cells.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(character);
            }
        }
        if (quoted) throw new BusinessException("IMPORT_ROW_CSV_INVALID", "CSV 数据行格式不正确");
        cells.add(current.toString().trim());
        return cells;
    }

    private void ensureNoExtraColumns(List<String> cells) {
        if (cells.size() <= PersonImportTemplateDefinition.HEADERS.size()) return;
        boolean hasExtraValue = cells.subList(PersonImportTemplateDefinition.HEADERS.size(), cells.size())
                .stream().anyMatch(value -> value != null && !value.isBlank());
        if (hasExtraValue) {
            throw new BusinessException("IMPORT_ROW_EXTRA_COLUMNS", "数据行包含人物导入模板之外的字段");
        }
    }

    private String cell(List<String> cells, int index) {
        return index >= 0 && index < cells.size() ? cells.get(index).trim() : "";
    }

    private String parseGender(String value) {
        String gender = PersonImportTemplateDefinition.GENDER_CODES.get(value == null ? "" : value.trim());
        if (gender == null) throw new BusinessException("IMPORT_GENDER_INVALID", "性别必须填写男、女或未知");
        return gender;
    }

    private Integer parseGenerationNo(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            int generationNo = Integer.parseInt(value.trim());
            if (generationNo <= 0) throw new BusinessException("IMPORT_GENERATION_INVALID", "代次必须是正整数");
            return generationNo;
        } catch (NumberFormatException exception) {
            throw new BusinessException("IMPORT_GENERATION_INVALID", "代次必须是正整数");
        }
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (RuntimeException exception) {
            throw new BusinessException("IMPORT_DATE_INVALID", "出生日期格式必须是 yyyy-MM-dd");
        }
    }

    private Boolean parseLiving(String value) {
        Boolean living = PersonImportTemplateDefinition.LIVING_VALUES.get(value == null ? "" : value.trim());
        if (living == null) throw new BusinessException("IMPORT_LIVING_INVALID", "是否在世必须填写是或否");
        return living;
    }

    public record ReadResult(String filename, boolean xlsx, List<ImportRow> rows) {
        public ReadResult {
            rows = List.copyOf(rows);
        }
    }

    public record ImportRow(int rowNo, List<String> cells, String rawData) {
        public ImportRow {
            cells = List.copyOf(cells);
        }
    }

    public record ParsedPersonRow(
            Long branchId,
            String name,
            String gender,
            Integer generationNo,
            String generationWord,
            LocalDate birthDate,
            Boolean isLiving
    ) {
    }
}
