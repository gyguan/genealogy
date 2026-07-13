package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.dto.ImportRowErrorResponse;
import com.genealogy.imports.dto.RelationshipImportPreviewResponse;
import com.genealogy.imports.dto.RelationshipImportPreviewRowResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobErrorEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobErrorRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.application.RelationshipApplicationService;
import com.genealogy.relationship.dto.RelationshipConflictCheckResponse;
import com.genealogy.relationship.dto.RelationshipCreateRequest;
import com.genealogy.relationship.dto.RelationshipResponse;
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
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class RelationshipImportApplicationService {

    private static final String STATUS_RUNNING = "running";
    private static final String STATUS_COMPLETED = "completed";
    private static final String STATUS_PARTIAL = "partial_completed";
    private static final String STATUS_FAILED = "failed";

    private final ImportJobRepository importJobRepository;
    private final ImportJobErrorRepository importJobErrorRepository;
    private final ImportJobRowRepository importJobRowRepository;
    private final PersonRepository personRepository;
    private final RelationshipApplicationService relationshipApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final RelationshipImportFilePolicyService filePolicyService;
    private final OperationLogApplicationService operationLogApplicationService;

    public RelationshipImportApplicationService(
            ImportJobRepository importJobRepository,
            ImportJobErrorRepository importJobErrorRepository,
            ImportJobRowRepository importJobRowRepository,
            PersonRepository personRepository,
            RelationshipApplicationService relationshipApplicationService,
            AuthorizationApplicationService authorizationApplicationService,
            RelationshipImportFilePolicyService filePolicyService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.importJobRepository = importJobRepository;
        this.importJobErrorRepository = importJobErrorRepository;
        this.importJobRowRepository = importJobRowRepository;
        this.personRepository = personRepository;
        this.relationshipApplicationService = relationshipApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
        this.filePolicyService = filePolicyService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    @Transactional(readOnly = true)
    public RelationshipImportPreviewResponse preview(
            Long clanId,
            Long branchId,
            MultipartFile file,
            Long actorId
    ) {
        filePolicyService.validate(branchId, file);
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, branchId);
        ImportReadResult data = readImport(file);
        PreviewContext context = new PreviewContext();
        List<RelationshipImportPreviewRowResponse> rows = new ArrayList<>();
        for (ImportRow row : data.rows()) {
            rows.add(previewRow(clanId, row, actorId, context));
        }
        int valid = (int) rows.stream().filter(item -> isBlank(item.errorMessage())).count();
        int duplicates = (int) rows.stream().filter(RelationshipImportPreviewRowResponse::duplicated).count();
        int errors = rows.size() - valid;
        return new RelationshipImportPreviewResponse(rows.size(), valid, duplicates, errors, rows);
    }

    @Transactional
    public ImportJobResponse importRelationships(
            Long clanId,
            Long branchId,
            MultipartFile file,
            Long actorId
    ) {
        filePolicyService.validate(branchId, file);
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, branchId);
        String filename = file.getOriginalFilename() == null ? "relationships.csv" : file.getOriginalFilename();
        String format = filename.toLowerCase(Locale.ROOT).endsWith(".xlsx")
                ? ImportJobEntity.FORMAT_XLSX
                : ImportJobEntity.FORMAT_CSV;
        ImportJobEntity job = createJob(clanId, branchId, filename, format, actorId);
        ImportReadResult data = readImport(file);
        int success = 0;
        int failure = 0;
        List<ImportJobRowEntity> jobRows = new ArrayList<>();
        List<ImportJobErrorEntity> errors = new ArrayList<>();

        for (ImportRow row : data.rows()) {
            ImportJobRowEntity jobRow = newJobRow(job.getId(), row);
            try {
                ParsedRelationship parsed = parseAndResolve(clanId, row.cells());
                jobRow.setNormalizedData(normalizedData(parsed));
                RelationshipResponse relationship = relationshipApplicationService.create(
                        clanId,
                        createRequest(parsed),
                        actorId
                );
                jobRow.setDraftTargetType(ImportJobEntity.TYPE_RELATIONSHIP);
                jobRow.setDraftTargetId(relationship.id());
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

        int total = jobRows.size();
        job.setTotalCount(total);
        job.setSuccessCount(success);
        job.setFailureCount(failure);
        job.setStatus(legacyStatus(success, failure));
        job.setProcessingStatus(failure == 0
                ? ImportJobEntity.PROCESSING_READY_FOR_REVIEW
                : ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        job.setErrorSummary(failure == 0 ? null : "存在 " + failure + " 行关系导入失败，请修正后再提交审核");
        job.setUpdatedAt(LocalDateTime.now());
        ImportJobEntity saved = importJobRepository.save(job);
        operationLogApplicationService.record(
                clanId,
                actorId,
                "relationship_import",
                "import_job",
                saved.getId(),
                "人物关系导入批次创建完成",
                "branchId=" + branchId + ", total=" + total + ", success=" + success + ", failure=" + failure
        );
        return toResponse(saved, errors);
    }

    ParsedRelationship parseAndResolve(Long clanId, List<String> cells) {
        ensureNoExtraColumns(cells);
        String fromCode = requiredCell(cells, RelationshipImportTemplateDefinition.FROM_PERSON_CODE_INDEX, "关系主体编码不能为空");
        String toCode = requiredCell(cells, RelationshipImportTemplateDefinition.TO_PERSON_CODE_INDEX, "关系对象编码不能为空");
        String displayType = requiredCell(cells, RelationshipImportTemplateDefinition.RELATIONSHIP_TYPE_INDEX, "关系类型不能为空");
        RelationshipImportTemplateDefinition.RelationshipKind kind =
                RelationshipImportTemplateDefinition.RELATIONSHIP_KINDS.get(displayType);
        if (kind == null) {
            throw new BusinessException("IMPORT_RELATIONSHIP_TYPE_INVALID", "关系类型必须填写父子、母子或配偶");
        }
        PersonEntity from = requireUniquePerson(clanId, fromCode, "关系主体");
        PersonEntity to = requireUniquePerson(clanId, toCode, "关系对象");
        if ("父子".equals(displayType) && !"male".equalsIgnoreCase(from.getGender())) {
            throw new BusinessException("IMPORT_RELATIONSHIP_FATHER_GENDER_INVALID", "父子关系的主体人物性别必须为男");
        }
        if ("母子".equals(displayType) && !"female".equalsIgnoreCase(from.getGender())) {
            throw new BusinessException("IMPORT_RELATIONSHIP_MOTHER_GENDER_INVALID", "母子关系的主体人物性别必须为女");
        }
        String description = cell(cells, RelationshipImportTemplateDefinition.DESCRIPTION_INDEX);
        return new ParsedRelationship(from, to, fromCode, toCode, displayType, kind, description);
    }

    RelationshipCreateRequest createRequest(ParsedRelationship parsed) {
        return new RelationshipCreateRequest(
                parsed.from().getId(),
                parsed.to().getId(),
                parsed.kind().relationType(),
                parsed.kind().relationLabel(),
                parsed.kind().relationCategory(),
                null,
                null,
                null,
                parsed.kind().lineageRelation(),
                parsed.kind().biological(),
                true,
                parsed.description(),
                "medium"
        );
    }

    private RelationshipImportPreviewRowResponse previewRow(
            Long clanId,
            ImportRow row,
            Long actorId,
            PreviewContext context
    ) {
        String fromCode = cell(row.cells(), RelationshipImportTemplateDefinition.FROM_PERSON_CODE_INDEX);
        String toCode = cell(row.cells(), RelationshipImportTemplateDefinition.TO_PERSON_CODE_INDEX);
        String type = cell(row.cells(), RelationshipImportTemplateDefinition.RELATIONSHIP_TYPE_INDEX);
        String description = cell(row.cells(), RelationshipImportTemplateDefinition.DESCRIPTION_INDEX);
        try {
            ParsedRelationship parsed = parseAndResolve(clanId, row.cells());
            RelationshipConflictCheckResponse conflict = relationshipApplicationService.checkConflict(
                    clanId,
                    createRequest(parsed),
                    actorId
            );
            if (conflict.conflict()) {
                boolean duplicate = conflict.errorCode() != null && conflict.errorCode().contains("DUPLICATED");
                return previewError(row, parsed, duplicate, conflict.message());
            }
            String key = canonicalKey(parsed);
            if (!context.keys().add(key)) {
                return previewError(row, parsed, true, "导入文件中存在重复关系");
            }
            if (parsed.kind().lineageRelation()
                    && createsCycle(context.graph(), parsed.from().getId(), parsed.to().getId())) {
                return previewError(row, parsed, false, "导入文件中的血缘关系形成循环");
            }
            if (parsed.kind().lineageRelation()) {
                context.graph().computeIfAbsent(parsed.from().getId(), ignored -> new HashSet<>())
                        .add(parsed.to().getId());
            }
            return new RelationshipImportPreviewRowResponse(
                    row.rowNo(),
                    parsed.fromCode(),
                    parsed.from().getName(),
                    parsed.toCode(),
                    parsed.to().getName(),
                    parsed.displayType(),
                    parsed.description(),
                    false,
                    null,
                    row.rawData()
            );
        } catch (RuntimeException exception) {
            return new RelationshipImportPreviewRowResponse(
                    row.rowNo(), fromCode, "", toCode, "", type, description, false,
                    errorMessage(exception), row.rawData()
            );
        }
    }

    private RelationshipImportPreviewRowResponse previewError(
            ImportRow row,
            ParsedRelationship parsed,
            boolean duplicated,
            String message
    ) {
        return new RelationshipImportPreviewRowResponse(
                row.rowNo(), parsed.fromCode(), parsed.from().getName(), parsed.toCode(), parsed.to().getName(),
                parsed.displayType(), parsed.description(), duplicated, message, row.rawData()
        );
    }

    private boolean createsCycle(Map<Long, Set<Long>> graph, Long parent, Long child) {
        if (parent.equals(child)) return true;
        Deque<Long> queue = new ArrayDeque<>();
        Set<Long> visited = new HashSet<>();
        queue.add(child);
        while (!queue.isEmpty()) {
            Long current = queue.removeFirst();
            if (!visited.add(current)) continue;
            if (current.equals(parent)) return true;
            graph.getOrDefault(current, Set.of()).forEach(queue::addLast);
        }
        return false;
    }

    private String canonicalKey(ParsedRelationship parsed) {
        if ("spouse".equals(parsed.kind().relationType())) {
            long left = Math.min(parsed.from().getId(), parsed.to().getId());
            long right = Math.max(parsed.from().getId(), parsed.to().getId());
            return "spouse:" + left + ":" + right;
        }
        return parsed.kind().relationType() + ":" + parsed.kind().relationLabel() + ":"
                + parsed.from().getId() + ":" + parsed.to().getId();
    }

    private PersonEntity requireUniquePerson(Long clanId, String personCode, String role) {
        List<PersonEntity> matches = personRepository.findByClanIdAndPersonCodeAndDeletedAtIsNull(
                clanId,
                personCode.trim()
        );
        if (matches.isEmpty()) {
            throw new BusinessException("IMPORT_RELATIONSHIP_PERSON_NOT_FOUND", role + "编码未匹配到人物：" + personCode);
        }
        if (matches.size() > 1) {
            throw new BusinessException("IMPORT_RELATIONSHIP_PERSON_NOT_UNIQUE", role + "编码匹配到多个人物：" + personCode);
        }
        return matches.get(0);
    }

    private ImportReadResult readImport(MultipartFile file) {
        String filename = file.getOriginalFilename() == null ? "relationships.csv" : file.getOriginalFilename();
        try {
            return filename.toLowerCase(Locale.ROOT).endsWith(".xlsx") ? readXlsxRows(file) : readCsvRows(file);
        } catch (IOException exception) {
            throw new BusinessException("IMPORT_FILE_READ_FAILED", "人物关系导入文件读取失败");
        }
    }

    private ImportReadResult readCsvRows(MultipartFile file) throws IOException {
        List<ImportRow> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            reader.readLine();
            String line;
            int rowNo = 1;
            while ((line = reader.readLine()) != null) {
                rowNo++;
                if (!line.isBlank()) rows.add(new ImportRow(rowNo, parseCsv(line), line));
            }
        }
        return new ImportReadResult(rows);
    }

    private ImportReadResult readXlsxRows(MultipartFile file) throws IOException {
        List<ImportRow> rows = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) throw new BusinessException("IMPORT_XLSX_EMPTY", "Excel 工作表不能为空");
            int header = sheet.getFirstRowNum();
            for (Row row : sheet) {
                if (row.getRowNum() == header) continue;
                List<String> cells = rowToCells(row, formatter);
                if (!cells.stream().allMatch(String::isBlank)) {
                    rows.add(new ImportRow(row.getRowNum() + 1, cells, String.join(",", cells)));
                }
            }
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException("IMPORT_XLSX_PARSE_FAILED", "Excel 解析失败，请确认文件格式为 .xlsx");
        }
        return new ImportReadResult(rows);
    }

    private List<String> rowToCells(Row row, DataFormatter formatter) {
        int last = Math.max(RelationshipImportTemplateDefinition.HEADERS.size(), row.getLastCellNum());
        List<String> cells = new ArrayList<>(last);
        for (int index = 0; index < last; index++) {
            Cell cell = row.getCell(index, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
            cells.add(cell == null ? "" : formatter.formatCellValue(cell));
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
        if (quoted) throw new BusinessException("IMPORT_CSV_PARSE_FAILED", "CSV 行格式不正确");
        cells.add(current.toString().trim());
        return cells;
    }

    private void ensureNoExtraColumns(List<String> cells) {
        for (int index = RelationshipImportTemplateDefinition.HEADERS.size(); index < cells.size(); index++) {
            if (!cell(cells, index).isBlank()) {
                throw new BusinessException("IMPORT_RELATIONSHIP_EXTRA_COLUMN", "数据行不能包含模板之外的字段");
            }
        }
    }

    private String requiredCell(List<String> cells, int index, String message) {
        String value = cell(cells, index);
        if (value.isBlank()) throw new BusinessException("IMPORT_RELATIONSHIP_FIELD_REQUIRED", message);
        return value;
    }

    private String cell(List<String> cells, int index) {
        return index >= 0 && index < cells.size() && cells.get(index) != null ? cells.get(index).trim() : "";
    }

    private ImportJobEntity createJob(Long clanId, Long branchId, String filename, String format, Long actorId) {
        LocalDateTime now = LocalDateTime.now();
        ImportJobEntity job = new ImportJobEntity();
        job.setClanId(clanId);
        job.setBranchId(branchId);
        job.setOriginalFilename(filename);
        job.setImportType(ImportJobEntity.TYPE_RELATIONSHIP);
        job.setFileFormat(format);
        job.setStatus(STATUS_RUNNING);
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

    private Map<String, Object> normalizedData(ParsedRelationship parsed) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("fromPersonCode", parsed.fromCode());
        data.put("fromPersonName", parsed.from().getName());
        data.put("toPersonCode", parsed.toCode());
        data.put("toPersonName", parsed.to().getName());
        data.put("relationshipType", parsed.displayType());
        data.put("description", parsed.description());
        return data;
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

    private String legacyStatus(int success, int failure) {
        if (failure == 0) return STATUS_COMPLETED;
        return success == 0 ? STATUS_FAILED : STATUS_PARTIAL;
    }

    private String errorCode(RuntimeException exception) {
        return exception instanceof BusinessException businessException
                ? businessException.getCode()
                : "IMPORT_RELATIONSHIP_ROW_FAILED";
    }

    private String errorMessage(RuntimeException exception) {
        String message = exception.getMessage();
        return isBlank(message) ? "人物关系导入行处理失败" : message;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private ImportJobResponse toResponse(ImportJobEntity job, List<ImportJobErrorEntity> errors) {
        return new ImportJobResponse(
                job.getId(),
                job.getClanId(),
                job.getBranchId(),
                job.getImportType(),
                job.getFileFormat(),
                job.getImportType() + "_" + job.getFileFormat(),
                job.getOriginalFilename(),
                job.getTotalCount(),
                job.getSuccessCount(),
                job.getFailureCount(),
                job.getStatus(),
                job.getErrorSummary(),
                job.getCreatedAt(),
                errors.stream()
                        .map(item -> new ImportRowErrorResponse(item.getRowNo(), item.getErrorMessage(), item.getRawData()))
                        .toList(),
                job.getProcessingStatus(),
                job.getReviewStatus(),
                job.getReviewRound(),
                job.getLatestReviewTaskId()
        );
    }

    record ParsedRelationship(
            PersonEntity from,
            PersonEntity to,
            String fromCode,
            String toCode,
            String displayType,
            RelationshipImportTemplateDefinition.RelationshipKind kind,
            String description
    ) {
    }

    private record ImportReadResult(List<ImportRow> rows) {
    }

    private record ImportRow(int rowNo, List<String> cells, String rawData) {
    }

    private record PreviewContext(Set<String> keys, Map<Long, Set<Long>> graph) {
        private PreviewContext() {
            this(new HashSet<>(), new HashMap<>());
        }
    }
}
