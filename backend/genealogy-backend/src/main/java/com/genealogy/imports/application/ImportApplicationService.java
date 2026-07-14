package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.dto.ImportPreviewResponse;
import com.genealogy.imports.dto.ImportPreviewRowResponse;
import com.genealogy.imports.dto.ImportRowErrorResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobErrorEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import jakarta.persistence.criteria.Predicate;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.data.jpa.domain.Specification;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class ImportApplicationService {

    private static final String LEGACY_STATUS_RUNNING = "running";
    private static final String LEGACY_STATUS_COMPLETED = "completed";
    private static final String LEGACY_STATUS_PARTIAL_COMPLETED = "partial_completed";
    private static final String LEGACY_STATUS_FAILED = "failed";

    private final ImportJobRepository importJobRepository;
    private final ImportJobErrorRepository importJobErrorRepository;
    private final ImportJobRowRepository importJobRowRepository;
    private final PersonRepository personRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final PersonImportFilePolicyService personImportFilePolicyService;

    public ImportApplicationService(
            ImportJobRepository importJobRepository,
            ImportJobErrorRepository importJobErrorRepository,
            ImportJobRowRepository importJobRowRepository,
            PersonRepository personRepository,
            AuthorizationApplicationService authorizationApplicationService,
            PersonImportFilePolicyService personImportFilePolicyService
    ) {
        this.importJobRepository = importJobRepository;
        this.importJobErrorRepository = importJobErrorRepository;
        this.importJobRowRepository = importJobRowRepository;
        this.personRepository = personRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.personImportFilePolicyService = personImportFilePolicyService;
    }

    @Transactional(readOnly = true)
    public ImportPreviewResponse previewPersons(
            Long clanId,
            Long branchId,
            MultipartFile file,
            Long actorId
    ) {
        personImportFilePolicyService.validate(branchId, file);
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, branchId);
        ImportReadResult importData = readImport(file);
        List<ImportPreviewRowResponse> previewRows = importData.rows().stream()
                .map(row -> previewRow(clanId, branchId, row))
                .toList();
        int validCount = (int) previewRows.stream()
                .filter(row -> row.errorMessage() == null || row.errorMessage().isBlank())
                .count();
        int duplicateCount = (int) previewRows.stream()
                .filter(ImportPreviewRowResponse::duplicated)
                .count();
        int errorCount = (int) previewRows.stream()
                .filter(row -> row.errorMessage() != null && !row.errorMessage().isBlank())
                .count();
        return new ImportPreviewResponse(previewRows.size(), validCount, duplicateCount, errorCount, previewRows);
    }

    @Transactional
    public ImportJobResponse importPersonsCsv(
            Long clanId,
            Long branchId,
            MultipartFile file,
            boolean confirmDuplicates,
            Long actorId
    ) {
        personImportFilePolicyService.validate(branchId, file);
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, branchId);

        String filename = file.getOriginalFilename() == null ? "persons.csv" : file.getOriginalFilename();
        boolean xlsx = filename.toLowerCase(Locale.ROOT).endsWith(".xlsx");
        ImportReadResult importData = readImport(file);
        List<ImportPreviewRowResponse> previewRows = importData.rows().stream()
                .map(row -> previewRow(clanId, branchId, row))
                .toList();
        boolean hasDuplicate = previewRows.stream().anyMatch(ImportPreviewRowResponse::duplicated);
        if (hasDuplicate && !confirmDuplicates) {
            throw new BusinessException(
                    "IMPORT_DUPLICATE_CONFIRM_REQUIRED",
                    "导入文件存在疑似重复人物，请先预览并确认后再导入"
            );
        }

        ImportJobEntity job = createJob(
                clanId,
                branchId,
                filename,
                xlsx ? "person_xlsx" : "person_csv",
                actorId
        );
        int total = 0;
        int success = 0;
        int failure = 0;
        List<ImportJobErrorEntity> errors = new ArrayList<>();
        List<ImportJobRowEntity> jobRows = new ArrayList<>();

        for (ImportRow row : importData.rows()) {
            total++;
            ImportJobRowEntity jobRow = newJobRow(job.getId(), row);
            try {
                ImportPreviewRowResponse preview = previewRow(clanId, branchId, row);
                jobRow.setNormalizedData(normalizedData(preview));
                if (preview.errorMessage() != null && !preview.errorMessage().isBlank()) {
                    throw new BusinessException("IMPORT_ROW_INVALID", preview.errorMessage());
                }
                PersonEntity savedPerson = personRepository.save(
                        toPerson(clanId, branchId, actorId, row.cells())
                );
                jobRow.setDraftPersonId(savedPerson == null ? null : savedPerson.getId());
                jobRow.setDraftTargetType(ImportJobEntity.TYPE_PERSON);
                jobRow.setDraftTargetId(savedPerson == null ? null : savedPerson.getId());
                jobRow.setRowStatus(ImportJobRowEntity.STATUS_DRAFT_CREATED);
                success++;
            } catch (RuntimeException exception) {
                failure++;
                String message = errorMessage(exception);
                jobRow.setRowStatus(ImportJobRowEntity.STATUS_INVALID);
                jobRow.setErrorCode(errorCode(exception));
                jobRow.setErrorMessage(message);
                errors.add(error(job.getId(), row.rowNo(), message, row.rawData()));
            }
            jobRow.setUpdatedAt(LocalDateTime.now());
            jobRows.add(jobRow);
        }

        if (!jobRows.isEmpty()) {
            importJobRowRepository.saveAll(jobRows);
        }
        if (!errors.isEmpty()) {
            importJobErrorRepository.saveAll(errors);
        }

        job.setTotalCount(total);
        job.setSuccessCount(success);
        job.setFailureCount(failure);
        job.setStatus(legacyStatus(success, failure));
        job.setProcessingStatus(failure == 0
                ? ImportJobEntity.PROCESSING_READY_FOR_REVIEW
                : ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        job.setErrorSummary(failure == 0
                ? null
                : "存在 " + failure + " 行导入失败，请修正后再提交审核");
        job.setUpdatedAt(LocalDateTime.now());
        return toResponse(importJobRepository.save(job), errors);
    }

    @Transactional(readOnly = true)
    public List<ImportJobResponse> listJobs(Long clanId) {
        return importJobRepository.findByClanIdOrderByCreatedAtDesc(clanId)
                .stream()
                .map(job -> toResponse(job, importJobErrorRepository.findByJobIdOrderByRowNoAsc(job.getId())))
                .toList();
    }

    private ImportReadResult readImport(MultipartFile file) {
        String filename = file.getOriginalFilename() == null ? "persons.csv" : file.getOriginalFilename();
        try {
            return filename.toLowerCase(Locale.ROOT).endsWith(".xlsx")
                    ? readXlsxRows(file)
                    : readCsvRows(file);
        } catch (IOException exception) {
            throw new BusinessException("IMPORT_FILE_READ_FAILED", "导入文件读取失败");
        }
    }

    private ImportReadResult readCsvRows(MultipartFile file) throws IOException {
        List<ImportRow> importRows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)
        )) {
            String line = reader.readLine();
            int rowNo = 1;
            while ((line = reader.readLine()) != null) {
                rowNo++;
                if (line.isBlank()) {
                    continue;
                }
                List<String> cells = parseCsv(line);
                importRows.add(new ImportRow(rowNo, cells, line));
            }
        }
        return new ImportReadResult(importRows);
    }

    private ImportReadResult readXlsxRows(MultipartFile file) throws IOException {
        List<ImportRow> importRows = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) {
                throw new BusinessException("IMPORT_XLSX_EMPTY", "Excel 工作表不能为空");
            }
            int headerRowIndex = sheet.getFirstRowNum();
            for (Row row : sheet) {
                if (row.getRowNum() == headerRowIndex) {
                    continue;
                }
                List<String> cells = rowToCells(row, formatter);
                if (cells.stream().allMatch(String::isBlank)) {
                    continue;
                }
                importRows.add(new ImportRow(
                        row.getRowNum() + 1,
                        cells,
                        String.join(",", cells)
                ));
            }
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException("IMPORT_XLSX_PARSE_FAILED", "Excel 解析失败，请确认文件格式为 .xlsx");
        }
        return new ImportReadResult(importRows);
    }

    private ImportJobEntity createJob(
            Long clanId,
            Long branchId,
            String filename,
            String importType,
            Long actorId
    ) {
        LocalDateTime now = LocalDateTime.now();
        ImportJobEntity job = new ImportJobEntity();
        job.setClanId(clanId);
        job.setBranchId(branchId);
        job.setImportType(importType);
        job.setOriginalFilename(filename);
        job.setStatus(LEGACY_STATUS_RUNNING);
        job.setProcessingStatus(ImportJobEntity.PROCESSING_PROCESSING);
        job.setReviewStatus(ImportJobEntity.REVIEW_NOT_SUBMITTED);
        job.setReviewRound(0);
        job.setTotalCount(0);
        job.setSuccessCount(0);
        job.setFailureCount(0);
        job.setCreatedBy(actorId);
        job.setCreatedAt(now);
        job.setUpdatedAt(now);
        return importJobRepository.save(job);
    }

    private ImportJobRowEntity newJobRow(Long jobId, ImportRow row) {
        LocalDateTime now = LocalDateTime.now();
        ImportJobRowEntity entity = new ImportJobRowEntity();
        entity.setJobId(jobId);
        entity.setRowNo(row.rowNo());
        entity.setRawData(row.rawData());
        entity.setRowStatus(ImportJobRowEntity.STATUS_INVALID);
        entity.setRetryCount(0);
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        return entity;
    }

    private Map<String, Object> normalizedData(ImportPreviewRowResponse preview) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("name", preview.name());
        data.put("gender", preview.gender());
        data.put("generationNo", preview.generationNo());
        data.put("generationWord", preview.generationWord());
        data.put("branchId", preview.branchId());
        data.put("birthDate", preview.birthDate());
        data.put("isLiving", preview.isLiving());
        data.put("duplicated", preview.duplicated());
        data.put("duplicateCount", preview.duplicateCount());
        return data;
    }

    private String legacyStatus(int success, int failure) {
        if (failure == 0) {
            return LEGACY_STATUS_COMPLETED;
        }
        return success == 0 ? LEGACY_STATUS_FAILED : LEGACY_STATUS_PARTIAL_COMPLETED;
    }

    private String errorCode(RuntimeException exception) {
        if (exception instanceof BusinessException businessException) {
            return businessException.getCode();
        }
        return "IMPORT_ROW_PROCESS_FAILED";
    }

    private String errorMessage(RuntimeException exception) {
        String message = exception.getMessage();
        return message == null || message.isBlank() ? "导入行处理失败" : message;
    }

    private ImportPreviewRowResponse previewRow(Long clanId, Long branchId, ImportRow row) {
        try {
            ParsedPersonRow parsed = parsePersonRow(branchId, row.cells());
            int duplicateCount = countDuplicates(
                    clanId,
                    branchId,
                    parsed.name(),
                    parsed.generationNo(),
                    parsed.generationWord(),
                    parsed.birthDate()
            );
            return new ImportPreviewRowResponse(
                    row.rowNo(),
                    parsed.name(),
                    parsed.gender(),
                    parsed.generationNo(),
                    parsed.generationWord(),
                    branchId,
                    parsed.birthDate() == null ? null : parsed.birthDate().toString(),
                    parsed.isLiving(),
                    duplicateCount > 0,
                    duplicateCount,
                    null,
                    row.rawData()
            );
        } catch (RuntimeException exception) {
            return new ImportPreviewRowResponse(
                    row.rowNo(),
                    "",
                    "",
                    null,
                    "",
                    branchId,
                    "",
                    null,
                    false,
                    0,
                    errorMessage(exception),
                    row.rawData()
            );
        }
    }

    private ParsedPersonRow parsePersonRow(Long branchId, List<String> cells) {
        ensureNoExtraColumns(cells);
        String name = cell(cells, PersonImportTemplateDefinition.NAME_INDEX);
        if (name.isBlank()) {
            throw new BusinessException("IMPORT_PERSON_NAME_REQUIRED", "姓名不能为空");
        }
        String gender = parseGender(cell(cells, PersonImportTemplateDefinition.GENDER_INDEX));
        Integer generationNo = parseGenerationNo(cell(cells, PersonImportTemplateDefinition.GENERATION_NO_INDEX));
        String generationWord = cell(cells, PersonImportTemplateDefinition.GENERATION_WORD_INDEX);
        LocalDate birthDate = parseDate(cell(cells, PersonImportTemplateDefinition.BIRTH_DATE_INDEX));
        Boolean isLiving = parseLiving(cell(cells, PersonImportTemplateDefinition.IS_LIVING_INDEX));
        return new ParsedPersonRow(
                branchId,
                name,
                gender,
                generationNo,
                generationWord,
                birthDate,
                isLiving
        );
    }

    private int countDuplicates(
            Long clanId,
            Long branchId,
            String name,
            Integer generationNo,
            String generationWord,
            LocalDate birthDate
    ) {
        Specification<PersonEntity> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("clanId"), clanId));
            predicates.add(criteriaBuilder.isNull(root.get("deletedAt")));
            predicates.add(criteriaBuilder.equal(
                    criteriaBuilder.lower(root.get("name")),
                    name.trim().toLowerCase(Locale.ROOT)
            ));
            if (branchId != null) {
                predicates.add(criteriaBuilder.equal(root.get("branchId"), branchId));
            }
            if (generationNo != null) {
                predicates.add(criteriaBuilder.equal(root.get("generationNo"), generationNo));
            }
            if (generationWord != null && !generationWord.isBlank()) {
                predicates.add(criteriaBuilder.equal(root.get("generationWord"), generationWord.trim()));
            }
            if (birthDate != null) {
                predicates.add(criteriaBuilder.equal(root.get("birthDate"), birthDate));
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
        return (int) personRepository.count(specification);
    }

    private PersonEntity toPerson(
            Long clanId,
            Long branchId,
            Long actorId,
            List<String> cells
    ) {
        ParsedPersonRow parsed = parsePersonRow(branchId, cells);
        PersonEntity person = new PersonEntity();
        person.setClanId(clanId);
        person.setBranchId(parsed.branchId());
        person.setName(parsed.name());
        person.setGender(parsed.gender());
        person.setGenerationNo(parsed.generationNo());
        person.setGenerationWord(parsed.generationWord());
        person.setBirthDate(parsed.birthDate());
        person.setIsLiving(parsed.isLiving());
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
        if (quoted) {
            throw new BusinessException("IMPORT_ROW_CSV_INVALID", "CSV 数据行格式不正确");
        }
        cells.add(current.toString().trim());
        return cells;
    }

    private void ensureNoExtraColumns(List<String> cells) {
        if (cells.size() <= PersonImportTemplateDefinition.HEADERS.size()) {
            return;
        }
        boolean hasExtraValue = cells.subList(
                        PersonImportTemplateDefinition.HEADERS.size(),
                        cells.size()
                ).stream()
                .anyMatch(value -> value != null && !value.isBlank());
        if (hasExtraValue) {
            throw new BusinessException("IMPORT_ROW_EXTRA_COLUMNS", "数据行包含人物导入模板之外的字段");
        }
    }

    private String cell(List<String> cells, int index) {
        return index >= 0 && index < cells.size() ? cells.get(index).trim() : "";
    }

    private String parseGender(String value) {
        String normalized = value == null ? "" : value.trim();
        String gender = PersonImportTemplateDefinition.GENDER_CODES.get(normalized);
        if (gender == null) {
            throw new BusinessException("IMPORT_GENDER_INVALID", "性别必须填写男、女或未知");
        }
        return gender;
    }

    private Integer parseGenerationNo(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            int generationNo = Integer.parseInt(value.trim());
            if (generationNo <= 0) {
                throw new BusinessException("IMPORT_GENERATION_INVALID", "代次必须是正整数");
            }
            return generationNo;
        } catch (NumberFormatException exception) {
            throw new BusinessException("IMPORT_GENERATION_INVALID", "代次必须是正整数");
        }
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (RuntimeException exception) {
            throw new BusinessException("IMPORT_DATE_INVALID", "出生日期格式必须是 yyyy-MM-dd");
        }
    }

    private Boolean parseLiving(String value) {
        String normalized = value == null ? "" : value.trim();
        Boolean living = PersonImportTemplateDefinition.LIVING_VALUES.get(normalized);
        if (living == null) {
            throw new BusinessException("IMPORT_LIVING_INVALID", "是否在世必须填写是或否");
        }
        return living;
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

    private ImportJobResponse toResponse(
            ImportJobEntity job,
            List<ImportJobErrorEntity> errors
    ) {
        return new ImportJobResponse(
                job.getId(),
                job.getClanId(),
                job.getBranchId(),
                job.getImportType(),
                job.getOriginalFilename(),
                job.getTotalCount(),
                job.getSuccessCount(),
                job.getFailureCount(),
                job.getStatus(),
                job.getErrorSummary(),
                job.getCreatedAt(),
                errors.stream()
                        .map(item -> new ImportRowErrorResponse(
                                item.getRowNo(),
                                item.getErrorMessage(),
                                item.getRawData()
                        ))
                        .toList()
        );
    }

    private record ImportReadResult(List<ImportRow> rows) {
    }

    private record ImportRow(int rowNo, List<String> cells, String rawData) {
    }

    private record ParsedPersonRow(
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
