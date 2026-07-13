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
import java.util.Set;

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

    public ImportApplicationService(
            ImportJobRepository importJobRepository,
            ImportJobErrorRepository importJobErrorRepository,
            ImportJobRowRepository importJobRowRepository,
            PersonRepository personRepository,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.importJobRepository = importJobRepository;
        this.importJobErrorRepository = importJobErrorRepository;
        this.importJobRowRepository = importJobRowRepository;
        this.personRepository = personRepository;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Transactional(readOnly = true)
    public ImportPreviewResponse previewPersons(Long clanId, Long branchId, MultipartFile file, FieldMapping mapping, boolean autoMapping, Long actorId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("IMPORT_FILE_EMPTY", "导入文件不能为空");
        }
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, branchId);
        ImportReadResult importData = readImport(file);
        FieldMapping effectiveMapping = autoMapping ? mapping.withDetected(importData.detectedMapping()) : mapping;
        List<ImportPreviewRowResponse> previewRows = importData.rows().stream()
                .map(row -> previewRow(clanId, branchId, effectiveMapping, row))
                .toList();
        int validCount = (int) previewRows.stream().filter(row -> row.errorMessage() == null || row.errorMessage().isBlank()).count();
        int duplicateCount = (int) previewRows.stream().filter(ImportPreviewRowResponse::duplicated).count();
        int errorCount = (int) previewRows.stream().filter(row -> row.errorMessage() != null && !row.errorMessage().isBlank()).count();
        return new ImportPreviewResponse(previewRows.size(), validCount, duplicateCount, errorCount, previewRows);
    }

    @Transactional
    public ImportJobResponse importPersonsCsv(Long clanId, Long branchId, MultipartFile file, FieldMapping mapping, boolean autoMapping, boolean confirmDuplicates, Long actorId) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("IMPORT_FILE_EMPTY", "导入文件不能为空");
        }
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, branchId);

        String filename = file.getOriginalFilename() == null ? "persons.csv" : file.getOriginalFilename();
        boolean xlsx = filename.toLowerCase(Locale.ROOT).endsWith(".xlsx");
        ImportReadResult importData = readImport(file);
        FieldMapping effectiveMapping = autoMapping ? mapping.withDetected(importData.detectedMapping()) : mapping;
        List<ImportPreviewRowResponse> previewRows = importData.rows().stream()
                .map(row -> previewRow(clanId, branchId, effectiveMapping, row))
                .toList();
        boolean hasDuplicate = previewRows.stream().anyMatch(ImportPreviewRowResponse::duplicated);
        if (hasDuplicate && !confirmDuplicates) {
            throw new BusinessException("IMPORT_DUPLICATE_CONFIRM_REQUIRED", "导入文件存在疑似重复人物，请先预览并确认后再导入");
        }

        ImportJobEntity job = createJob(clanId, branchId, filename, xlsx ? "person_xlsx" : "person_csv", actorId);
        int total = 0;
        int success = 0;
        int failure = 0;
        List<ImportJobErrorEntity> errors = new ArrayList<>();
        List<ImportJobRowEntity> jobRows = new ArrayList<>();

        for (ImportRow row : importData.rows()) {
            total++;
            ImportJobRowEntity jobRow = newJobRow(job.getId(), row);
            try {
                ImportPreviewRowResponse preview = previewRow(clanId, branchId, effectiveMapping, row);
                jobRow.setNormalizedData(normalizedData(preview));
                if (preview.errorMessage() != null && !preview.errorMessage().isBlank()) {
                    throw new BusinessException("IMPORT_ROW_INVALID", preview.errorMessage());
                }
                PersonEntity savedPerson = personRepository.save(
                        toPerson(clanId, branchId, actorId, effectiveMapping, row.cells())
                );
                jobRow.setDraftPersonId(savedPerson == null ? null : savedPerson.getId());
                jobRow.setRowStatus(ImportJobRowEntity.STATUS_DRAFT_CREATED);
                success++;
            } catch (RuntimeException ex) {
                failure++;
                String message = errorMessage(ex);
                jobRow.setRowStatus(ImportJobRowEntity.STATUS_INVALID);
                jobRow.setErrorCode(errorCode(ex));
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
        job.setErrorSummary(failure == 0 ? null : "存在 " + failure + " 行导入失败，请修正后再提交审核");
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
            return filename.toLowerCase(Locale.ROOT).endsWith(".xlsx") ? readXlsxRows(file) : readCsvRows(file);
        } catch (IOException ex) {
            throw new BusinessException("IMPORT_FILE_READ_FAILED", "导入文件读取失败");
        }
    }

    private ImportReadResult readCsvRows(MultipartFile file) throws IOException {
        List<ImportRow> importRows = new ArrayList<>();
        FieldMapping detectedMapping = null;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            int rowNo = 0;
            while ((line = reader.readLine()) != null) {
                rowNo++;
                List<String> cells = parseCsv(line);
                if (rowNo == 1 && looksLikeHeader(cells)) {
                    detectedMapping = detectMapping(cells);
                    continue;
                }
                if (line.isBlank()) continue;
                importRows.add(new ImportRow(rowNo, cells, line));
            }
        }
        return new ImportReadResult(importRows, detectedMapping);
    }

    private ImportReadResult readXlsxRows(MultipartFile file) throws IOException {
        List<ImportRow> importRows = new ArrayList<>();
        FieldMapping detectedMapping = null;
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
                if (rowNo == 1 && looksLikeHeader(cells)) {
                    detectedMapping = detectMapping(cells);
                    continue;
                }
                if (cells.stream().allMatch(String::isBlank)) continue;
                importRows.add(new ImportRow(rowNo, cells, rawData));
            }
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("IMPORT_XLSX_PARSE_FAILED", "Excel 解析失败，请确认文件格式为 .xlsx");
        }
        return new ImportReadResult(importRows, detectedMapping);
    }

    private ImportJobEntity createJob(Long clanId, Long branchId, String filename, String importType, Long actorId) {
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

    private ImportPreviewRowResponse previewRow(Long clanId, Long defaultBranchId, FieldMapping mapping, ImportRow row) {
        try {
            String name = cell(row.cells(), mapping.nameIndex());
            if (name.isBlank()) {
                return new ImportPreviewRowResponse(row.rowNo(), "", "", null, "", null, "", null, false, 0, "姓名不能为空", row.rawData());
            }
            String gender = defaultIfBlank(cell(row.cells(), mapping.genderIndex()), "unknown");
            Integer generationNo = parseInteger(cell(row.cells(), mapping.generationNoIndex()));
            String generationWord = cell(row.cells(), mapping.generationWordIndex());
            Long branchId = parseLong(cell(row.cells(), mapping.branchIdIndex()), defaultBranchId);
            LocalDate birthDate = parseDate(cell(row.cells(), mapping.birthDateIndex()));
            Boolean living = parseBoolean(cell(row.cells(), mapping.isLivingIndex()), true);
            int duplicateCount = countDuplicates(clanId, branchId, name, generationNo, generationWord, birthDate);
            return new ImportPreviewRowResponse(row.rowNo(), name, gender, generationNo, generationWord, branchId, birthDate == null ? null : birthDate.toString(), living, duplicateCount > 0, duplicateCount, null, row.rawData());
        } catch (RuntimeException ex) {
            return new ImportPreviewRowResponse(row.rowNo(), "", "", null, "", null, "", null, false, 0, ex.getMessage(), row.rawData());
        }
    }

    private int countDuplicates(Long clanId, Long branchId, String name, Integer generationNo, String generationWord, LocalDate birthDate) {
        Specification<PersonEntity> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("clanId"), clanId));
            predicates.add(criteriaBuilder.isNull(root.get("deletedAt")));
            predicates.add(criteriaBuilder.equal(criteriaBuilder.lower(root.get("name")), name.trim().toLowerCase(Locale.ROOT)));
            if (branchId != null) predicates.add(criteriaBuilder.equal(root.get("branchId"), branchId));
            if (generationNo != null) predicates.add(criteriaBuilder.equal(root.get("generationNo"), generationNo));
            if (generationWord != null && !generationWord.isBlank()) predicates.add(criteriaBuilder.equal(root.get("generationWord"), generationWord.trim()));
            if (birthDate != null) predicates.add(criteriaBuilder.equal(root.get("birthDate"), birthDate));
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
        return (int) personRepository.count(spec);
    }

    private PersonEntity toPerson(Long clanId, Long defaultBranchId, Long actorId, FieldMapping mapping, List<String> cells) {
        String name = cell(cells, mapping.nameIndex());
        if (name.isBlank()) {
            throw new BusinessException("IMPORT_PERSON_NAME_REQUIRED", "姓名不能为空");
        }
        PersonEntity person = new PersonEntity();
        person.setClanId(clanId);
        person.setBranchId(parseLong(cell(cells, mapping.branchIdIndex()), defaultBranchId));
        person.setName(name);
        person.setGender(defaultIfBlank(cell(cells, mapping.genderIndex()), "unknown"));
        person.setGenerationNo(parseInteger(cell(cells, mapping.generationNoIndex())));
        person.setGenerationWord(cell(cells, mapping.generationWordIndex()));
        person.setBirthDate(parseDate(cell(cells, mapping.birthDateIndex())));
        person.setIsLiving(parseBoolean(cell(cells, mapping.isLivingIndex()), true));
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
        List<String> cells = new ArrayList<>();
        int max = Math.max(7, row.getLastCellNum());
        for (int i = 0; i < max; i++) {
            Cell cell = row.getCell(i, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
            cells.add(cell == null ? "" : formatter.formatCellValue(cell).trim());
        }
        return cells;
    }

    private boolean looksLikeHeader(List<String> cells) {
        return cells.stream().map(this::normalizeHeader).anyMatch(value -> headerField(value) != null);
    }

    private FieldMapping detectMapping(List<String> headerCells) {
        int nameIndex = -1;
        int genderIndex = -1;
        int generationNoIndex = -1;
        int generationWordIndex = -1;
        int branchIdIndex = -1;
        int birthDateIndex = -1;
        int isLivingIndex = -1;
        for (int i = 0; i < headerCells.size(); i++) {
            String field = headerField(normalizeHeader(headerCells.get(i)));
            if (field == null) continue;
            switch (field) {
                case "name" -> nameIndex = firstIndex(nameIndex, i);
                case "gender" -> genderIndex = firstIndex(genderIndex, i);
                case "generationNo" -> generationNoIndex = firstIndex(generationNoIndex, i);
                case "generationWord" -> generationWordIndex = firstIndex(generationWordIndex, i);
                case "branchId" -> branchIdIndex = firstIndex(branchIdIndex, i);
                case "birthDate" -> birthDateIndex = firstIndex(birthDateIndex, i);
                case "isLiving" -> isLivingIndex = firstIndex(isLivingIndex, i);
                default -> { }
            }
        }
        return new FieldMapping(nameIndex, genderIndex, generationNoIndex, generationWordIndex, branchIdIndex, birthDateIndex, isLivingIndex);
    }

    private int firstIndex(int current, int candidate) {
        return current >= 0 ? current : candidate;
    }

    private String headerField(String normalized) {
        if (Set.of("name", "personname", "姓名", "名字", "名讳").contains(normalized)) return "name";
        if (Set.of("gender", "sex", "性别").contains(normalized)) return "gender";
        if (Set.of("generation", "generationno", "generationnumber", "genno", "代次", "世代", "第几代").contains(normalized)) return "generationNo";
        if (Set.of("generationword", "generationname", "字辈", "字派", "派语", "行辈").contains(normalized)) return "generationWord";
        if (Set.of("branchid", "branch", "支派id", "分支id", "房支id").contains(normalized)) return "branchId";
        if (Set.of("birthdate", "birthday", "出生日期", "出生时间", "生辰").contains(normalized)) return "birthDate";
        if (Set.of("isliving", "living", "alive", "是否在世", "在世", "健在").contains(normalized)) return "isLiving";
        return null;
    }

    private String normalizeHeader(String value) {
        if (value == null) return "";
        return value.trim()
                .toLowerCase(Locale.ROOT)
                .replace("\ufeff", "")
                .replace(" ", "")
                .replace("_", "")
                .replace("-", "")
                .replace("/", "")
                .replace(":", "")
                .replace("：", "");
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
        return index >= 0 && index < cells.size() ? cells.get(index).trim() : "";
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
        String normalized = value.trim().toLowerCase(Locale.ROOT);
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

    public record FieldMapping(int nameIndex, int genderIndex, int generationNoIndex, int generationWordIndex, int branchIdIndex, int birthDateIndex, int isLivingIndex) {
        public static FieldMapping defaults() {
            return new FieldMapping(0, 1, 2, 3, 4, 5, 6);
        }

        public FieldMapping withDetected(FieldMapping detected) {
            if (detected == null) {
                return this;
            }
            return new FieldMapping(
                    detectedOrFallback(detected.nameIndex(), nameIndex),
                    detectedOrFallback(detected.genderIndex(), genderIndex),
                    detectedOrFallback(detected.generationNoIndex(), generationNoIndex),
                    detectedOrFallback(detected.generationWordIndex(), generationWordIndex),
                    detectedOrFallback(detected.branchIdIndex(), branchIdIndex),
                    detectedOrFallback(detected.birthDateIndex(), birthDateIndex),
                    detectedOrFallback(detected.isLivingIndex(), isLivingIndex)
            );
        }

        private static int detectedOrFallback(int detectedIndex, int fallbackIndex) {
            return detectedIndex >= 0 ? detectedIndex : fallbackIndex;
        }
    }

    private record ImportReadResult(List<ImportRow> rows, FieldMapping detectedMapping) {}

    private record ImportRow(int rowNo, List<String> cells, String rawData) {}
}
