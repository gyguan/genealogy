package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.dto.ImportRowErrorResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobErrorEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class ImportApplicationService {

    private final ImportJobRepository importJobRepository;
    private final ImportJobErrorRepository importJobErrorRepository;
    private final PersonRepository personRepository;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ImportApplicationService(
            ImportJobRepository importJobRepository,
            ImportJobErrorRepository importJobErrorRepository,
            PersonRepository personRepository,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.importJobRepository = importJobRepository;
        this.importJobErrorRepository = importJobErrorRepository;
        this.personRepository = personRepository;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Transactional
    public ImportJobResponse importPersonsCsv(Long clanId, Long branchId, MultipartFile file, Long actorId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("IMPORT_FILE_EMPTY", "导入文件不能为空");
        }
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, branchId);

        String filename = file.getOriginalFilename() == null ? "persons.csv" : file.getOriginalFilename();
        boolean xlsx = filename.toLowerCase().endsWith(".xlsx");
        ImportJobEntity job = createJob(clanId, branchId, filename, xlsx ? "person_xlsx" : "person_csv", actorId);

        ImportCounter counter;
        try {
            counter = xlsx ? importXlsx(clanId, branchId, actorId, job, file) : importCsv(clanId, branchId, actorId, job, file);
        } catch (IOException ex) {
            throw new BusinessException("IMPORT_FILE_READ_FAILED", "导入文件读取失败");
        }

        if (!counter.errors().isEmpty()) {
            importJobErrorRepository.saveAll(counter.errors());
        }
        job.setTotalCount(counter.total());
        job.setSuccessCount(counter.success());
        job.setFailureCount(counter.failure());
        job.setStatus(counter.failure() == 0 ? "completed" : counter.success() == 0 ? "failed" : "partial_completed");
        job.setErrorSummary(counter.failure() == 0 ? null : "存在 " + counter.failure() + " 行导入失败，请查看错误明细");
        return toResponse(importJobRepository.save(job), counter.errors());
    }

    @Transactional(readOnly = true)
    public List<ImportJobResponse> listJobs(Long clanId) {
        return importJobRepository.findByClanIdOrderByCreatedAtDesc(clanId)
                .stream()
                .map(job -> toResponse(job, importJobErrorRepository.findByJobIdOrderByRowNoAsc(job.getId())))
                .toList();
    }

    private ImportJobEntity createJob(Long clanId, Long branchId, String filename, String importType, Long actorId) {
        ImportJobEntity job = new ImportJobEntity();
        job.setClanId(clanId);
        job.setBranchId(branchId);
        job.setImportType(importType);
        job.setOriginalFilename(filename);
        job.setStatus("running");
        job.setTotalCount(0);
        job.setSuccessCount(0);
        job.setFailureCount(0);
        job.setCreatedBy(actorId);
        job.setCreatedAt(LocalDateTime.now());
        return importJobRepository.save(job);
    }

    private ImportCounter importCsv(Long clanId, Long branchId, Long actorId, ImportJobEntity job, MultipartFile file) throws IOException {
        int total = 0;
        int success = 0;
        int failure = 0;
        List<ImportJobErrorEntity> errors = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            int rowNo = 0;
            while ((line = reader.readLine()) != null) {
                rowNo++;
                if (rowNo == 1 && looksLikeHeader(line)) continue;
                if (line.isBlank()) continue;
                total++;
                try {
                    personRepository.save(toPerson(clanId, branchId, actorId, parseCsv(line)));
                    success++;
                } catch (RuntimeException ex) {
                    failure++;
                    errors.add(error(job.getId(), rowNo, ex.getMessage(), line));
                }
            }
        }
        return new ImportCounter(total, success, failure, errors);
    }

    private ImportCounter importXlsx(Long clanId, Long branchId, Long actorId, ImportJobEntity job, MultipartFile file) throws IOException {
        int total = 0;
        int success = 0;
        int failure = 0;
        List<ImportJobErrorEntity> errors = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) {
                throw new BusinessException("IMPORT_XLSX_EMPTY", "Excel 工作表不能为空");
            }
            for (Row row : sheet) {
                int rowNo = row.getRowNum() + 1;
                List<String> cells = rowToCells(row, formatter);
                String rawData = String.join(",", cells);
                if (rowNo == 1 && looksLikeHeader(rawData)) continue;
                if (cells.stream().allMatch(String::isBlank)) continue;
                total++;
                try {
                    personRepository.save(toPerson(clanId, branchId, actorId, cells));
                    success++;
                } catch (RuntimeException ex) {
                    failure++;
                    errors.add(error(job.getId(), rowNo, ex.getMessage(), rawData));
                }
            }
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("IMPORT_XLSX_PARSE_FAILED", "Excel 解析失败，请确认文件格式为 .xlsx");
        }
        return new ImportCounter(total, success, failure, errors);
    }

    private List<String> rowToCells(Row row, DataFormatter formatter) {
        List<String> cells = new ArrayList<>();
        int max = Math.max(7, row.getLastCellNum());
        for (int i = 0; i < max; i++) {
            Cell cell = row.getCell(i, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
            cells.add(cell == null ? "" : formatter.formatCellValue(cell).trim());
        }
        return cells;
    }

    private boolean looksLikeHeader(String line) {
        String lower = line.toLowerCase();
        return lower.contains("name") || lower.contains("姓名");
    }

    private PersonEntity toPerson(Long clanId, Long defaultBranchId, Long actorId, List<String> cells) {
        String name = cell(cells, 0);
        if (name.isBlank()) {
            throw new BusinessException("IMPORT_PERSON_NAME_REQUIRED", "姓名不能为空");
        }
        PersonEntity person = new PersonEntity();
        person.setClanId(clanId);
        person.setBranchId(parseLong(cell(cells, 4), defaultBranchId));
        person.setName(name);
        person.setGender(defaultIfBlank(cell(cells, 1), "unknown"));
        person.setGenerationNo(parseInteger(cell(cells, 2)));
        person.setGenerationWord(cell(cells, 3));
        person.setBirthDate(parseDate(cell(cells, 5)));
        person.setIsLiving(parseBoolean(cell(cells, 6), true));
        person.setPrivacyLevel("clan_only");
        person.setDataStatus("draft");
        person.setLineageStatus("normal");
        person.setHasDescendant(false);
        person.setCreatedBy(actorId);
        person.setUpdatedBy(actorId);
        LocalDateTime now = LocalDateTime.now();
        person.setCreatedAt(now);
        person.setUpdatedAt(now);
        return person;
    }

    private List<String> parseCsv(String line) {
        List<String> cells = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quote = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (quote && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    quote = !quote;
                }
            } else if (ch == ',' && !quote) {
                cells.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        cells.add(current.toString().trim());
        return cells;
    }

    private String cell(List<String> cells, int index) {
        return index < cells.size() ? cells.get(index).trim() : "";
    }

    private String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private Integer parseInteger(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            throw new BusinessException("IMPORT_NUMBER_INVALID", "代次必须是数字");
        }
    }

    private Long parseLong(String value, Long fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            throw new BusinessException("IMPORT_BRANCH_INVALID", "支派ID必须是数字");
        }
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (RuntimeException ex) {
            throw new BusinessException("IMPORT_DATE_INVALID", "出生日期格式必须是 yyyy-MM-dd");
        }
    }

    private Boolean parseBoolean(String value, boolean fallback) {
        if (value == null || value.isBlank()) return fallback;
        String normalized = value.trim().toLowerCase();
        return normalized.equals("true") || normalized.equals("1") || normalized.equals("是") || normalized.equals("在世");
    }

    private ImportJobErrorEntity error(Long jobId, int rowNo, String message, String rawData) {
        ImportJobErrorEntity error = new ImportJobErrorEntity();
        error.setJobId(jobId);
        error.setRowNo(rowNo);
        error.setErrorMessage(message);
        error.setRawData(rawData);
        error.setCreatedAt(LocalDateTime.now());
        return error;
    }

    private ImportJobResponse toResponse(ImportJobEntity job, List<ImportJobErrorEntity> errors) {
        return new ImportJobResponse(
                job.getId(), job.getClanId(), job.getBranchId(), job.getImportType(), job.getOriginalFilename(),
                job.getTotalCount(), job.getSuccessCount(), job.getFailureCount(), job.getStatus(), job.getErrorSummary(), job.getCreatedAt(),
                errors.stream().map(item -> new ImportRowErrorResponse(item.getRowNo(), item.getErrorMessage(), item.getRawData())).toList()
        );
    }

    private record ImportCounter(int total, int success, int failure, List<ImportJobErrorEntity> errors) {}
}
