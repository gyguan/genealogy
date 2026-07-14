package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.dto.ImportRowErrorResponse;
import com.genealogy.imports.dto.SourceImportPreviewResponse;
import com.genealogy.imports.dto.SourceImportPreviewRowResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobErrorEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class SourceImportApplicationService {

    private static final String STATUS_COMPLETED = "completed";
    private static final String STATUS_PARTIAL = "partial_completed";
    private static final String STATUS_FAILED = "failed";
    private static final String SOURCE_CREATE = "source:create";

    private final ImportJobRepository importJobRepository;
    private final ImportJobErrorRepository importJobErrorRepository;
    private final ImportJobRowRepository importJobRowRepository;
    private final SourceRepository sourceRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final SourceImportFilePolicyService filePolicyService;
    private final OperationLogApplicationService operationLogApplicationService;

    public SourceImportApplicationService(
            ImportJobRepository importJobRepository,
            ImportJobErrorRepository importJobErrorRepository,
            ImportJobRowRepository importJobRowRepository,
            SourceRepository sourceRepository,
            AuthorizationApplicationService authorizationApplicationService,
            SourceImportFilePolicyService filePolicyService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.importJobRepository = importJobRepository;
        this.importJobErrorRepository = importJobErrorRepository;
        this.importJobRowRepository = importJobRowRepository;
        this.sourceRepository = sourceRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.filePolicyService = filePolicyService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    @Transactional(readOnly = true)
    public SourceImportPreviewResponse preview(Long clanId, Long branchId, MultipartFile file, Long actorId) {
        filePolicyService.validate(branchId, file);
        authorizationApplicationService.requirePermission(clanId, actorId, SOURCE_CREATE);
        ImportReadResult data = readImport(file);
        List<SourceImportPreviewRowResponse> rows = new ArrayList<>();
        Set<String> seen = new java.util.HashSet<>();
        for (ImportRow row : data.rows()) {
            rows.add(previewRow(clanId, row, seen));
        }
        int valid = (int) rows.stream().filter(item -> isBlank(item.errorMessage())).count();
        int duplicates = (int) rows.stream().filter(item -> Boolean.TRUE.equals(item.duplicated())).count();
        int errors = rows.size() - valid;
        return new SourceImportPreviewResponse(rows.size(), valid, duplicates, errors, rows);
    }

    @Transactional
    public ImportJobResponse importSources(Long clanId, Long branchId, MultipartFile file, Long actorId) {
        filePolicyService.validate(branchId, file);
        authorizationApplicationService.requirePermission(clanId, actorId, SOURCE_CREATE);
        ImportReadResult data = readImport(file);
        String filename = file.getOriginalFilename() == null ? "sources.csv" : file.getOriginalFilename();
        String format = filename.toLowerCase(Locale.ROOT).endsWith(".xlsx")
                ? ImportJobEntity.FORMAT_XLSX
                : ImportJobEntity.FORMAT_CSV;
        ImportJobEntity job = createJob(clanId, branchId, filename, format, actorId);
        int success = 0;
        int failure = 0;
        Set<String> seen = new java.util.HashSet<>();
        List<ImportJobRowEntity> jobRows = new ArrayList<>();
        List<ImportJobErrorEntity> errors = new ArrayList<>();

        for (ImportRow row : data.rows()) {
            ImportJobRowEntity jobRow = newJobRow(job.getId(), row);
            try {
                ParsedSource parsed = parseRow(row.cells());
                ensureNotDuplicated(clanId, parsed, seen);
                SourceEntity draft = createDraft(clanId, parsed, actorId);
                jobRow.setNormalizedData(normalizedData(parsed));
                jobRow.setDraftTargetType(ImportJobEntity.TYPE_SOURCE);
                jobRow.setDraftTargetId(draft.getId());
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
        if (!jobRows.isEmpty()) importJobRowRepository.saveAll(jobRows);
        if (!errors.isEmpty()) importJobErrorRepository.saveAll(errors);

        job.setTotalCount(jobRows.size());
        job.setSuccessCount(success);
        job.setFailureCount(failure);
        job.setStatus(legacyStatus(success, failure));
        job.setProcessingStatus(failure == 0
                ? ImportJobEntity.PROCESSING_READY_FOR_REVIEW
                : ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        job.setErrorSummary(failure == 0 ? null : "存在 " + failure + " 行来源资料导入失败，请修正后再提交审核");
        job.setUpdatedAt(LocalDateTime.now());
        ImportJobEntity saved = importJobRepository.save(job);
        operationLogApplicationService.record(
                clanId, actorId, "source_import", "import_job", saved.getId(),
                "来源资料导入批次创建完成",
                "branchId=" + branchId + ", total=" + jobRows.size() + ", success=" + success + ", failure=" + failure
        );
        return toResponse(saved, errors);
    }

    ParsedSource parseRow(List<String> cells) {
        ensureNoExtraColumns(cells);
        String sourceName = requiredCell(cells, SourceImportTemplateDefinition.SOURCE_NAME_INDEX, "资料名称不能为空");
        String sourceTypeText = requiredCell(cells, SourceImportTemplateDefinition.SOURCE_TYPE_INDEX, "资料类型不能为空");
        String sourceType = lookup(SourceImportTemplateDefinition.SOURCE_TYPES, sourceTypeText, "IMPORT_SOURCE_TYPE_INVALID", "资料类型必须为谱书、地方志、墓碑、照片、口述、档案或其他");
        String providerName = cell(cells, SourceImportTemplateDefinition.PROVIDER_NAME_INDEX);
        String bookTitle = cell(cells, SourceImportTemplateDefinition.BOOK_TITLE_INDEX);
        String volumeNo = cell(cells, SourceImportTemplateDefinition.VOLUME_NO_INDEX);
        String pageNo = cell(cells, SourceImportTemplateDefinition.PAGE_NO_INDEX);
        String sourceDate = cell(cells, SourceImportTemplateDefinition.SOURCE_DATE_INDEX);
        String collectionLocation = cell(cells, SourceImportTemplateDefinition.COLLECTION_LOCATION_INDEX);
        String sourceDescription = cell(cells, SourceImportTemplateDefinition.SOURCE_DESCRIPTION_INDEX);
        String excerpt = cell(cells, SourceImportTemplateDefinition.EXCERPT_INDEX);
        String confidenceText = defaultCell(cells, SourceImportTemplateDefinition.CONFIDENCE_LEVEL_INDEX, "未知");
        String confidenceLevel = lookup(SourceImportTemplateDefinition.CONFIDENCE_LEVELS, confidenceText, "IMPORT_SOURCE_CONFIDENCE_INVALID", "可信度必须为高、中、低或未知");
        String privacyText = requiredCell(cells, SourceImportTemplateDefinition.PRIVACY_LEVEL_INDEX, "可见范围不能为空");
        String privacyLevel = lookup(SourceImportTemplateDefinition.PRIVACY_LEVELS, privacyText, "IMPORT_SOURCE_PRIVACY_INVALID", "可见范围必须为公开、宗族内、支派内、亲属可见、私密或封存");
        String sensitiveText = defaultCell(cells, SourceImportTemplateDefinition.SENSITIVE_LEVEL_INDEX, "普通");
        String sensitiveLevel = lookup(SourceImportTemplateDefinition.SENSITIVE_LEVELS, sensitiveText, "IMPORT_SOURCE_SENSITIVE_INVALID", "敏感级别必须为普通、敏感或高度敏感");
        return new ParsedSource(sourceName, sourceTypeText, sourceType, providerName, bookTitle, volumeNo, pageNo,
                sourceDate, collectionLocation, sourceDescription, excerpt, confidenceText, confidenceLevel,
                privacyText, privacyLevel, sensitiveText, sensitiveLevel);
    }

    SourceEntity createDraft(Long clanId, ParsedSource parsed, Long actorId) {
        SourceEntity entity = new SourceEntity();
        entity.setClanId(clanId);
        entity.setSourceName(parsed.sourceName());
        entity.setSourceType(parsed.sourceType());
        entity.setProviderName(parsed.providerName());
        entity.setBookTitle(parsed.bookTitle());
        entity.setVolumeNo(parsed.volumeNo());
        entity.setPageNo(parsed.pageNo());
        entity.setSourceDate(parsed.sourceDate());
        entity.setExcerpt(parsed.excerpt());
        entity.setDescription(description(parsed));
        entity.setConfidenceLevel(parsed.confidenceLevel());
        entity.setPrivacyLevel(parsed.privacyLevel());
        entity.setSensitiveLevel(parsed.sensitiveLevel());
        entity.setVerificationStatus("draft");
        entity.setCreatedBy(actorId);
        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        return sourceRepository.save(entity);
    }

    private SourceImportPreviewRowResponse previewRow(Long clanId, ImportRow row, Set<String> seen) {
        try {
            ParsedSource parsed = parseRow(row.cells());
            boolean duplicated = duplicated(clanId, parsed) || !seen.add(duplicateKey(parsed));
            return new SourceImportPreviewRowResponse(
                    row.rowNo(), parsed.sourceName(), parsed.sourceTypeText(), parsed.providerName(), parsed.bookTitle(),
                    parsed.sourceDate(), parsed.privacyText(), duplicated, duplicated ? "存在重复来源资料" : null, row.rawData()
            );
        } catch (RuntimeException exception) {
            return new SourceImportPreviewRowResponse(row.rowNo(), cell(row.cells(), 0), cell(row.cells(), 1), cell(row.cells(), 2),
                    cell(row.cells(), 3), cell(row.cells(), 6), cell(row.cells(), 11), false, errorMessage(exception), row.rawData());
        }
    }

    void ensureNotDuplicated(Long clanId, ParsedSource parsed, Set<String> seen) {
        if (!seen.add(duplicateKey(parsed)) || duplicated(clanId, parsed)) {
            throw new BusinessException("IMPORT_SOURCE_DUPLICATED", "存在重复来源资料");
        }
    }

    boolean duplicated(Long clanId, ParsedSource parsed) {
        String key = duplicateKey(parsed);
        return sourceRepository.findByClanId(clanId, org.springframework.data.domain.Pageable.unpaged()).stream()
                .anyMatch(source -> key.equals(duplicateKey(source)));
    }

    private String duplicateKey(SourceEntity source) {
        return normalize(source.getSourceName()) + "|" + normalize(source.getSourceType()) + "|"
                + normalize(source.getBookTitle()) + "|" + normalize(source.getSourceDate());
    }

    private String duplicateKey(ParsedSource parsed) {
        return normalize(parsed.sourceName()) + "|" + normalize(parsed.sourceType()) + "|"
                + normalize(parsed.bookTitle()) + "|" + normalize(parsed.sourceDate());
    }

    private String description(ParsedSource parsed) {
        List<String> parts = new ArrayList<>();
        if (!isBlank(parsed.sourceDescription())) parts.add(parsed.sourceDescription());
        if (!isBlank(parsed.collectionLocation())) parts.add("馆藏位置：" + parsed.collectionLocation());
        return String.join("；", parts);
    }

    ImportReadResult readImport(MultipartFile file) {
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        try {
            return filename.endsWith(".xlsx") ? readXlsxRows(file) : readCsvRows(file);
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException("IMPORT_FILE_READ_FAILED", "来源资料导入文件读取失败");
        }
    }

    private ImportReadResult readCsvRows(MultipartFile file) throws IOException {
        List<ImportRow> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            int rowNo = 0;
            while ((line = reader.readLine()) != null) {
                rowNo++;
                if (rowNo == 1) continue;
                if (line.isBlank()) continue;
                rows.add(new ImportRow(rowNo, parseCsvLine(line), line));
            }
        }
        ensureHasRows(rows);
        return new ImportReadResult(rows);
    }

    private ImportReadResult readXlsxRows(MultipartFile file) throws Exception {
        List<ImportRow> rows = new ArrayList<>();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) throw new BusinessException("IMPORT_FILE_EMPTY", "来源资料导入文件不能为空");
            DataFormatter formatter = new DataFormatter();
            for (int index = sheet.getFirstRowNum() + 1; index <= sheet.getLastRowNum(); index++) {
                Row row = sheet.getRow(index);
                if (row == null) continue;
                List<String> cells = new ArrayList<>();
                int last = Math.max(SourceImportTemplateDefinition.HEADERS.size(), row.getLastCellNum());
                for (int cellIndex = 0; cellIndex < last; cellIndex++) {
                    Cell cell = row.getCell(cellIndex, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    cells.add(cell == null ? "" : formatter.formatCellValue(cell));
                }
                if (cells.stream().allMatch(String::isBlank)) continue;
                rows.add(new ImportRow(index + 1, cells, String.join(",", cells)));
            }
        }
        ensureHasRows(rows);
        return new ImportReadResult(rows);
    }

    private void ensureHasRows(List<ImportRow> rows) {
        if (rows.isEmpty()) {
            throw new BusinessException("IMPORT_SOURCE_ROW_EMPTY", "来源资料导入文件没有可导入的数据行");
        }
    }

    private ImportJobEntity createJob(Long clanId, Long branchId, String filename, String format, Long actorId) {
        ImportJobEntity job = new ImportJobEntity();
        job.setClanId(clanId);
        job.setBranchId(branchId);
        job.setImportType(ImportJobEntity.TYPE_SOURCE);
        job.setFileFormat(format);
        job.setOriginalFilename(filename);
        job.setTotalCount(0);
        job.setSuccessCount(0);
        job.setFailureCount(0);
        job.setStatus("running");
        job.setProcessingStatus(ImportJobEntity.PROCESSING_PROCESSING);
        job.setReviewStatus(ImportJobEntity.REVIEW_NOT_SUBMITTED);
        job.setReviewRound(0);
        job.setCreatedBy(actorId);
        LocalDateTime now = LocalDateTime.now();
        job.setCreatedAt(now);
        job.setUpdatedAt(now);
        return importJobRepository.save(job);
    }

    private ImportJobRowEntity newJobRow(Long jobId, ImportRow row) {
        ImportJobRowEntity entity = new ImportJobRowEntity();
        entity.setJobId(jobId);
        entity.setRowNo(row.rowNo());
        entity.setRawData(row.rawData());
        entity.setRowStatus(ImportJobRowEntity.STATUS_INVALID);
        entity.setRetryCount(0);
        entity.setVersion(0L);
        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        return entity;
    }

    private ImportJobErrorEntity error(Long jobId, Integer rowNo, String message, String rawData) {
        ImportJobErrorEntity entity = new ImportJobErrorEntity();
        entity.setJobId(jobId);
        entity.setRowNo(rowNo);
        entity.setErrorMessage(message);
        entity.setRawData(rawData);
        entity.setCreatedAt(LocalDateTime.now());
        return entity;
    }

    private ImportJobResponse toResponse(ImportJobEntity job, List<ImportJobErrorEntity> errors) {
        List<ImportRowErrorResponse> errorResponses = errors.stream()
                .map(error -> new ImportRowErrorResponse(error.getRowNo(), error.getErrorMessage(), error.getRawData()))
                .toList();
        return new ImportJobResponse(job.getId(), job.getClanId(), job.getBranchId(), job.getImportType(), job.getFileFormat(),
                null, job.getOriginalFilename(), job.getTotalCount(), job.getSuccessCount(), job.getFailureCount(),
                job.getStatus(), job.getErrorSummary(), job.getCreatedAt(), errorResponses,
                job.getProcessingStatus(), job.getReviewStatus(), job.getReviewRound(), job.getLatestReviewTaskId());
    }

    Map<String, Object> normalizedData(ParsedSource parsed) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("sourceName", parsed.sourceName());
        data.put("sourceType", parsed.sourceTypeText());
        data.put("providerName", parsed.providerName());
        data.put("bookTitle", parsed.bookTitle());
        data.put("volumeNo", parsed.volumeNo());
        data.put("pageNo", parsed.pageNo());
        data.put("sourceDate", parsed.sourceDate());
        data.put("collectionLocation", parsed.collectionLocation());
        data.put("sourceDescription", parsed.sourceDescription());
        data.put("excerpt", parsed.excerpt());
        data.put("confidenceLevel", parsed.confidenceText());
        data.put("privacyLevel", parsed.privacyText());
        data.put("sensitiveLevel", parsed.sensitiveText());
        return data;
    }

    private void ensureNoExtraColumns(List<String> cells) {
        if (cells.size() > SourceImportTemplateDefinition.HEADERS.size()
                && cells.subList(SourceImportTemplateDefinition.HEADERS.size(), cells.size()).stream().anyMatch(value -> !isBlank(value))) {
            throw new BusinessException("IMPORT_SOURCE_TEMPLATE_COLUMN_EXTRA", "来源资料导入文件包含模板外字段");
        }
    }

    private String requiredCell(List<String> cells, int index, String message) {
        String value = cell(cells, index);
        if (isBlank(value)) throw new BusinessException("IMPORT_SOURCE_FIELD_REQUIRED", message);
        return value;
    }

    private String defaultCell(List<String> cells, int index, String defaultValue) {
        String value = cell(cells, index);
        return isBlank(value) ? defaultValue : value;
    }

    private String cell(List<String> cells, int index) {
        if (index < 0 || index >= cells.size() || cells.get(index) == null) return "";
        return cells.get(index).trim();
    }

    private String lookup(Map<String, String> dict, String displayValue, String code, String message) {
        String normalized = dict.get(displayValue.trim());
        if (normalized == null) throw new BusinessException(code, message);
        return normalized;
    }

    private String legacyStatus(int success, int failure) {
        if (failure == 0) return STATUS_COMPLETED;
        return success > 0 ? STATUS_PARTIAL : STATUS_FAILED;
    }

    private String errorCode(RuntimeException exception) {
        return exception instanceof BusinessException business ? business.getCode() : "IMPORT_SOURCE_ROW_INVALID";
    }

    private String errorMessage(RuntimeException exception) {
        return exception.getMessage() == null ? "来源资料导入行处理失败" : exception.getMessage();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private List<String> parseCsvLine(String line) {
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
        if (quoted) throw new BusinessException("IMPORT_FILE_READ_FAILED", "CSV 数据行格式不正确");
        cells.add(current.toString());
        return cells;
    }

    record ImportReadResult(List<ImportRow> rows) {}
    record ImportRow(Integer rowNo, List<String> cells, String rawData) {}
    record ParsedSource(
            String sourceName,
            String sourceTypeText,
            String sourceType,
            String providerName,
            String bookTitle,
            String volumeNo,
            String pageNo,
            String sourceDate,
            String collectionLocation,
            String sourceDescription,
            String excerpt,
            String confidenceText,
            String confidenceLevel,
            String privacyText,
            String privacyLevel,
            String sensitiveText,
            String sensitiveLevel
    ) {}
}
