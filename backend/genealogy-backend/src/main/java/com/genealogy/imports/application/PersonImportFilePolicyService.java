package com.genealogy.imports.application;

import com.genealogy.common.exception.BusinessException;
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
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class PersonImportFilePolicyService {

    private static final Set<String> BRANCH_HEADER_ALIASES = Set.of(
            "branchid",
            "branch",
            "支派id",
            "支派编号",
            "支派"
    );

    public void validate(Long branchId, MultipartFile file) {
        if (branchId == null) {
            throw new BusinessException("IMPORT_BRANCH_REQUIRED", "请先选择目标支派，再导入人物");
        }
        if (file == null || file.isEmpty()) {
            return;
        }
        List<String> headers = readHeaders(file);
        boolean containsBranchColumn = headers.stream()
                .map(this::normalizeHeader)
                .anyMatch(BRANCH_HEADER_ALIASES::contains);
        if (containsBranchColumn) {
            throw new BusinessException(
                    "IMPORT_BRANCH_COLUMN_FORBIDDEN",
                    "导入文件不能填写支派ID或支派列，请在页面中选择目标支派"
            );
        }
    }

    private List<String> readHeaders(MultipartFile file) {
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        try {
            return filename.endsWith(".xlsx") ? readXlsxHeaders(file) : readCsvHeaders(file);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("IMPORT_HEADER_READ_FAILED", "无法读取导入文件表头");
        }
    }

    private List<String> readCsvHeaders(MultipartFile file) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line = reader.readLine();
            if (line == null) {
                return List.of();
            }
            return Arrays.stream(line.replace("\ufeff", "").split(",", -1))
                    .map(value -> value.replace("\"", "").trim())
                    .toList();
        }
    }

    private List<String> readXlsxHeaders(MultipartFile file) throws Exception {
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) {
                return List.of();
            }
            Row row = sheet.getRow(sheet.getFirstRowNum());
            if (row == null) {
                return List.of();
            }
            DataFormatter formatter = new DataFormatter();
            int lastCell = Math.max(0, row.getLastCellNum());
            return java.util.stream.IntStream.range(0, lastCell)
                    .mapToObj(index -> formatter.formatCellValue(row.getCell(index)).trim())
                    .toList();
        }
    }

    private String normalizeHeader(String value) {
        return String.valueOf(value == null ? "" : value)
                .trim()
                .toLowerCase(Locale.ROOT)
                .replace("\ufeff", "")
                .replace(" ", "")
                .replace("_", "")
                .replace("-", "");
    }
}
