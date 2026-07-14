package com.genealogy.imports.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.dto.ImportJobRowResponse;
import com.genealogy.imports.dto.ImportRowBulkExcludeRequest;
import com.genealogy.imports.dto.ImportRowBulkItemResult;
import com.genealogy.imports.dto.ImportRowBulkOperationResponse;
import com.genealogy.imports.dto.ImportRowBulkRetryRequest;
import com.genealogy.imports.dto.ImportRowBulkSelectionRequest;
import com.genealogy.imports.dto.ImportRowVersionReference;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobRowEntity;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ImportRowBulkApplicationService {

    private static final int MAX_BULK_ROWS = 500;
    private static final long MAX_CORRECTION_FILE_BYTES = 10L * 1024L * 1024L;
    private static final String MODE_SELECTED = "selected";
    private static final String MODE_FILTERED = "filtered";
    private static final Set<String> FAILED_STATUSES = Set.of(
            ImportJobRowEntity.STATUS_INVALID,
            ImportJobRowEntity.STATUS_RETRY_FAILED
    );
    private static final List<String> EXPORT_HEADERS = List.of(
            "稳定行键", "原始行号", "原始数据", "当前修正数据(JSON)", "错误码", "错误说明", "重试次数", "版本"
    );

    private final ImportJobRepository importJobRepository;
    private final ImportJobRowRepository importJobRowRepository;
    private final ImportRowBulkMutationExecutor mutationExecutor;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;
    private final ObjectMapper objectMapper;

    public ImportRowBulkApplicationService(
            ImportJobRepository importJobRepository,
            ImportJobRowRepository importJobRowRepository,
            ImportRowBulkMutationExecutor mutationExecutor,
            AuthorizationApplicationService authorizationApplicationService,
            OperationLogApplicationService operationLogApplicationService,
            ObjectMapper objectMapper
    ) {
        this.importJobRepository = importJobRepository;
        this.importJobRowRepository = importJobRowRepository;
        this.mutationExecutor = mutationExecutor;
        this.authorizationApplicationService = authorizationApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
        this.objectMapper = objectMapper;
    }

    public ImportRowBulkOperationResponse retry(
            Long clanId,
            Long jobId,
            ImportRowBulkRetryRequest request,
            Long actorId
    ) {
        ImportJobEntity job = requireJob(clanId, jobId, actorId, true);
        SelectionSnapshot selection = resolveSelection(jobId, request.selection());
        List<ImportRowBulkItemResult> items = new ArrayList<>();
        for (ImportRowVersionReference reference : selection.rows()) {
            items.add(run(reference, () -> mutationExecutor.retry(
                    clanId, jobId, reference.rowNo(), reference.expectedVersion(), null, actorId
            )));
        }
        ImportRowBulkOperationResponse response = response("retry", selection.mode(), selection.rows().size(), items, jobId);
        record(job, actorId, "import_rows_bulk_retry", response);
        return response;
    }

    public ImportRowBulkOperationResponse exclude(
            Long clanId,
            Long jobId,
            ImportRowBulkExcludeRequest request,
            Long actorId
    ) {
        ImportJobEntity job = requireJob(clanId, jobId, actorId, true);
        SelectionSnapshot selection = resolveSelection(jobId, request.selection());
        String reason = request.reason().trim();
        List<ImportRowBulkItemResult> items = new ArrayList<>();
        for (ImportRowVersionReference reference : selection.rows()) {
            items.add(run(reference, () -> mutationExecutor.exclude(
                    clanId, jobId, reference.rowNo(), reference.expectedVersion(), reason, actorId
            )));
        }
        ImportRowBulkOperationResponse response = response("exclude", selection.mode(), selection.rows().size(), items, jobId);
        record(job, actorId, "import_rows_bulk_exclude", response);
        return response;
    }

    public ImportFailureExport exportFailures(Long clanId, Long jobId, Long actorId) {
        ImportJobEntity job = requireJob(clanId, jobId, actorId, false);
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            workbook.setCompressTempFiles(true);
            Sheet sheet = workbook.createSheet("失败行");
            writeCells(sheet.createRow(0), EXPORT_HEADERS);
            int outputRow = 1;
            int pageNo = 0;
            Page<ImportJobRowEntity> page;
            do {
                page = importJobRowRepository.findByJobIdAndRowStatusInOrderByRowNoAsc(
                        jobId,
                        FAILED_STATUSES,
                        PageRequest.of(pageNo, 500)
                );
                for (ImportJobRowEntity row : page.getContent()) {
                    writeExportRow(sheet.createRow(outputRow++), row);
                }
                pageNo++;
            } while (page.hasNext());
            workbook.write(output);
            workbook.dispose();
            operationLogApplicationService.record(
                    clanId,
                    actorId,
                    "import_failure_rows_export",
                    "import_job",
                    jobId,
                    "导出导入失败行",
                    "fileName=" + safe(job.getOriginalFilename()) + ", rowCount=" + (outputRow - 1)
            );
            return new ImportFailureExport("import-failures-" + jobId + ".xlsx", output.toByteArray());
        } catch (IOException exception) {
            throw new BusinessException("IMPORT_FAILURE_EXPORT_FAILED", "失败行文件生成失败");
        }
    }

    public ImportRowBulkOperationResponse uploadCorrections(
            Long clanId,
            Long jobId,
            MultipartFile file,
            boolean retryAfterApply,
            Long actorId
    ) {
        ImportJobEntity job = requireJob(clanId, jobId, actorId, true);
        validateCorrectionFile(file);
        List<UploadedCorrection> corrections = readCorrections(file);
        List<ImportRowBulkItemResult> items = new ArrayList<>();
        for (UploadedCorrection correction : corrections) {
            if (correction.errorCode() != null) {
                items.add(new ImportRowBulkItemResult(
                        correction.stableRowKey(), correction.rowNo(), false, "unchanged",
                        correction.errorCode(), correction.errorMessage(), correction.expectedVersion()
                ));
                continue;
            }
            ImportRowVersionReference reference = new ImportRowVersionReference(
                    correction.rowNo(), correction.expectedVersion()
            );
            if (retryAfterApply) {
                items.add(run(reference, () -> mutationExecutor.retry(
                        clanId,
                        jobId,
                        correction.rowNo(),
                        correction.expectedVersion(),
                        correction.correctedData(),
                        actorId
                )));
            } else {
                items.add(runCorrectionUpdate(reference, () -> mutationExecutor.updateCorrection(
                        clanId,
                        jobId,
                        correction.rowNo(),
                        correction.expectedVersion(),
                        correction.correctedData(),
                        actorId
                )));
            }
        }
        ImportRowBulkOperationResponse response = response(
                "correction_upload", MODE_SELECTED, corrections.size(), items, jobId
        );
        record(job, actorId, "import_row_corrections_upload", response);
        return response;
    }

    private ImportJobEntity requireJob(Long clanId, Long jobId, Long actorId, boolean requireEditable) {
        authorizationApplicationService.requireClanMember(clanId, actorId);
        ImportJobEntity job = importJobRepository.findByIdAndClanId(jobId, clanId)
                .orElseThrow(() -> new BusinessException("IMPORT_JOB_NOT_FOUND", "导入任务不存在"));
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, job.getBranchId());
        if (requireEditable) {
            if (!ImportJobEntity.REVIEW_NOT_SUBMITTED.equals(job.getReviewStatus())
                    && !ImportJobEntity.REVIEW_REJECTED.equals(job.getReviewStatus())) {
                throw new BusinessException("IMPORT_JOB_REVIEW_LOCKED", "导入批次已进入审核流程，不能批量修改");
            }
            if (!ImportJobEntity.PROCESSING_CORRECTION_REQUIRED.equals(job.getProcessingStatus())) {
                throw new BusinessException("IMPORT_JOB_NOT_CORRECTABLE", "导入批次当前不需要修正");
            }
        }
        return job;
    }

    private SelectionSnapshot resolveSelection(Long jobId, ImportRowBulkSelectionRequest selection) {
        String mode = normalizeMode(selection.mode());
        if (MODE_FILTERED.equals(mode)) {
            Page<ImportJobRowEntity> page = importJobRowRepository.findByJobIdAndRowStatusInOrderByRowNoAsc(
                    jobId,
                    FAILED_STATUSES,
                    PageRequest.of(0, MAX_BULK_ROWS + 1)
            );
            if (page.getTotalElements() > MAX_BULK_ROWS) {
                throw new BusinessException(
                        "IMPORT_BULK_SELECTION_TOO_LARGE",
                        "当前失败行超过 " + MAX_BULK_ROWS + " 条，请先缩小范围或分批处理"
                );
            }
            List<ImportRowVersionReference> rows = page.getContent().stream()
                    .map(row -> new ImportRowVersionReference(row.getRowNo(), value(row.getVersion())))
                    .toList();
            if (rows.isEmpty()) {
                throw new BusinessException("IMPORT_BULK_SELECTION_EMPTY", "当前没有可批量处理的失败行");
            }
            return new SelectionSnapshot(mode, rows);
        }
        List<ImportRowVersionReference> rows = selection.rows() == null ? List.of() : selection.rows();
        if (rows.isEmpty()) {
            throw new BusinessException("IMPORT_BULK_SELECTION_EMPTY", "请至少选择一条失败行");
        }
        if (rows.size() > MAX_BULK_ROWS) {
            throw new BusinessException("IMPORT_BULK_SELECTION_TOO_LARGE", "单次最多处理 " + MAX_BULK_ROWS + " 条失败行");
        }
        LinkedHashSet<Integer> rowNos = new LinkedHashSet<>();
        List<ImportRowVersionReference> uniqueRows = new ArrayList<>();
        for (ImportRowVersionReference row : rows) {
            if (rowNos.add(row.rowNo())) uniqueRows.add(row);
        }
        return new SelectionSnapshot(mode, List.copyOf(uniqueRows));
    }

    private ImportRowBulkItemResult run(ImportRowVersionReference reference, RowMutation mutation) {
        try {
            ImportJobRowResponse row = mutation.execute();
            boolean success = ImportJobRowEntity.STATUS_DRAFT_CREATED.equals(row.rowStatus())
                    || ImportJobRowEntity.STATUS_EXCLUDED.equals(row.rowStatus())
                    || FAILED_STATUSES.contains(row.rowStatus());
            if (ImportJobRowEntity.STATUS_RETRY_FAILED.equals(row.rowStatus())) success = false;
            return new ImportRowBulkItemResult(
                    stableKey(row.rowNo()), row.rowNo(), success, row.rowStatus(),
                    row.errorCode(), row.errorMessage(), value(row.version())
            );
        } catch (BusinessException exception) {
            return failed(reference, exception.getCode(), exception.getMessage());
        } catch (OptimisticLockingFailureException exception) {
            return failed(reference, "IMPORT_JOB_ROW_VERSION_CONFLICT", "该行已被其他用户修改，请刷新后重试");
        } catch (RuntimeException exception) {
            return failed(reference, "IMPORT_BULK_ROW_PROCESS_FAILED", safeError(exception));
        }
    }

    private ImportRowBulkItemResult runCorrectionUpdate(ImportRowVersionReference reference, RowMutation mutation) {
        try {
            ImportJobRowResponse row = mutation.execute();
            return new ImportRowBulkItemResult(
                    stableKey(row.rowNo()), row.rowNo(), true, row.rowStatus(),
                    row.errorCode(), row.errorMessage(), value(row.version())
            );
        } catch (BusinessException exception) {
            return failed(reference, exception.getCode(), exception.getMessage());
        } catch (OptimisticLockingFailureException exception) {
            return failed(reference, "IMPORT_JOB_ROW_VERSION_CONFLICT", "该行已被其他用户修改，请刷新后重试");
        } catch (RuntimeException exception) {
            return failed(reference, "IMPORT_BULK_ROW_PROCESS_FAILED", safeError(exception));
        }
    }

    private ImportRowBulkItemResult failed(ImportRowVersionReference reference, String code, String message) {
        return new ImportRowBulkItemResult(
                stableKey(reference.rowNo()), reference.rowNo(), false, "unchanged",
                code, message, reference.expectedVersion()
        );
    }

    private ImportRowBulkOperationResponse response(
            String operation,
            String mode,
            int matchedCount,
            List<ImportRowBulkItemResult> items,
            Long jobId
    ) {
        int successCount = (int) items.stream().filter(item -> Boolean.TRUE.equals(item.success())).count();
        int failureCount = items.size() - successCount;
        int remainingFailureCount = toInteger(importJobRowRepository.countByJobIdAndRowStatusIn(jobId, FAILED_STATUSES));
        int excludedCount = toInteger(importJobRowRepository.countByJobIdAndRowStatus(jobId, ImportJobRowEntity.STATUS_EXCLUDED));
        String processingStatus = importJobRepository.findById(jobId)
                .map(ImportJobEntity::getProcessingStatus)
                .orElse(ImportJobEntity.PROCESSING_CORRECTION_REQUIRED);
        return new ImportRowBulkOperationResponse(
                operation,
                mode,
                matchedCount,
                items.size(),
                successCount,
                failureCount,
                remainingFailureCount,
                excludedCount,
                processingStatus,
                List.copyOf(items)
        );
    }

    private List<UploadedCorrection> readCorrections(MultipartFile file) {
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getNumberOfSheets() == 0 ? null : workbook.getSheetAt(0);
            if (sheet == null) {
                throw new BusinessException("IMPORT_CORRECTION_FILE_EMPTY", "修正文件没有工作表");
            }
            DataFormatter formatter = new DataFormatter();
            validateHeaders(sheet.getRow(sheet.getFirstRowNum()), formatter);
            List<UploadedCorrection> result = new ArrayList<>();
            int firstDataRow = sheet.getFirstRowNum() + 1;
            for (int rowIndex = firstDataRow; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isBlank(row, formatter)) continue;
                if (result.size() >= MAX_BULK_ROWS) {
                    throw new BusinessException("IMPORT_BULK_SELECTION_TOO_LARGE", "修正文件单次最多包含 " + MAX_BULK_ROWS + " 条数据");
                }
                result.add(parseCorrection(row, formatter));
            }
            if (result.isEmpty()) {
                throw new BusinessException("IMPORT_CORRECTION_FILE_EMPTY", "修正文件没有可处理的数据行");
            }
            return List.copyOf(result);
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException("IMPORT_CORRECTION_FILE_READ_FAILED", "修正文件无法读取，请使用系统导出的 XLSX 文件");
        }
    }

    private UploadedCorrection parseCorrection(Row row, DataFormatter formatter) {
        String stableRowKey = text(row, 0, formatter);
        int fallbackRowNo = Math.max(1, row.getRowNum());
        try {
            Integer rowNo = integer(text(row, 1, formatter), "原始行号");
            Long version = longValue(text(row, 7, formatter), "版本");
            if (!stableKey(rowNo).equals(stableRowKey)) {
                return invalid(stableRowKey, rowNo, version, "稳定行键与原始行号不一致");
            }
            String json = text(row, 3, formatter);
            if (json == null || json.isBlank()) {
                return invalid(stableRowKey, rowNo, version, "当前修正数据不能为空");
            }
            Map<String, Object> correctedData = objectMapper.readValue(
                    json,
                    new TypeReference<Map<String, Object>>() { }
            );
            return new UploadedCorrection(stableRowKey, rowNo, version, correctedData, null, null);
        } catch (BusinessException exception) {
            return invalid(
                    stableRowKey == null || stableRowKey.isBlank() ? "row-file-" + fallbackRowNo : stableRowKey,
                    fallbackRowNo,
                    0L,
                    exception.getMessage()
            );
        } catch (JsonProcessingException exception) {
            Integer rowNo = parseInteger(text(row, 1, formatter), fallbackRowNo);
            Long version = parseLong(text(row, 7, formatter), 0L);
            return invalid(stableRowKey, rowNo, version, "当前修正数据不是有效 JSON 对象");
        }
    }

    private UploadedCorrection invalid(String stableRowKey, Integer rowNo, Long version, String message) {
        String key = stableRowKey == null || stableRowKey.isBlank() ? stableKey(rowNo) : stableRowKey;
        return new UploadedCorrection(
                key, Math.max(1, rowNo), Math.max(0L, version), Map.of(),
                "IMPORT_CORRECTION_FILE_ROW_INVALID", message
        );
    }

    private void validateCorrectionFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("IMPORT_CORRECTION_FILE_EMPTY", "请选择修正后的 XLSX 文件");
        }
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!filename.endsWith(".xlsx")) {
            throw new BusinessException("IMPORT_CORRECTION_FILE_TYPE_INVALID", "修正文件必须是 XLSX 格式");
        }
        if (file.getSize() > MAX_CORRECTION_FILE_BYTES) {
            throw new BusinessException("IMPORT_CORRECTION_FILE_TOO_LARGE", "修正文件不能超过 10MB");
        }
    }

    private void validateHeaders(Row headerRow, DataFormatter formatter) {
        if (headerRow == null) {
            throw new BusinessException("IMPORT_CORRECTION_HEADER_REQUIRED", "修正文件缺少表头");
        }
        List<String> actual = new ArrayList<>();
        for (int index = 0; index < EXPORT_HEADERS.size(); index++) {
            actual.add(text(headerRow, index, formatter));
        }
        if (!EXPORT_HEADERS.equals(actual)) {
            throw new BusinessException(
                    "IMPORT_CORRECTION_HEADER_MISMATCH",
                    "修正文件表头不匹配，请直接使用系统导出的失败行文件"
            );
        }
    }

    private void writeExportRow(Row output, ImportJobRowEntity source) {
        Map<String, Object> correction = source.getCorrectedData() != null
                ? source.getCorrectedData()
                : source.getNormalizedData();
        writeCells(output, List.of(
                stableKey(source.getRowNo()),
                String.valueOf(source.getRowNo()),
                safe(source.getRawData()),
                toJson(correction),
                safe(source.getErrorCode()),
                safe(source.getErrorMessage()),
                String.valueOf(value(source.getRetryCount())),
                String.valueOf(value(source.getVersion()))
        ));
    }

    private void writeCells(Row row, List<String> values) {
        for (int index = 0; index < values.size(); index++) {
            row.createCell(index).setCellValue(values.get(index));
        }
    }

    private String toJson(Map<String, Object> data) {
        try {
            return objectMapper.writeValueAsString(data == null ? Map.of() : data);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("IMPORT_CORRECTION_SERIALIZE_FAILED", "当前修正数据无法导出");
        }
    }

    private void record(
            ImportJobEntity job,
            Long actorId,
            String action,
            ImportRowBulkOperationResponse response
    ) {
        operationLogApplicationService.record(
                job.getClanId(),
                actorId,
                action,
                "import_job",
                job.getId(),
                "批量处理导入失败行",
                "mode=" + response.selectionMode()
                        + ", matched=" + response.matchedCount()
                        + ", processed=" + response.processedCount()
                        + ", success=" + response.successCount()
                        + ", failure=" + response.failureCount()
                        + ", remaining=" + response.remainingFailureCount()
                        + ", excluded=" + response.excludedCount()
            );
    }

    private String normalizeMode(String value) {
        String mode = value == null ? "" : value.trim().toLowerCase();
        if (!Set.of(MODE_SELECTED, MODE_FILTERED).contains(mode)) {
            throw new BusinessException("IMPORT_BULK_SELECTION_MODE_INVALID", "批量选择模式必须是 selected 或 filtered");
        }
        return mode;
    }

    private boolean isBlank(Row row, DataFormatter formatter) {
        for (int index = 0; index < EXPORT_HEADERS.size(); index++) {
            if (!text(row, index, formatter).isBlank()) return false;
        }
        return true;
    }

    private String text(Row row, int index, DataFormatter formatter) {
        Cell cell = row.getCell(index, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        return cell == null ? "" : formatter.formatCellValue(cell).trim();
    }

    private Integer integer(String value, String label) {
        try {
            int result = Integer.parseInt(value);
            if (result <= 0) throw new NumberFormatException();
            return result;
        } catch (NumberFormatException exception) {
            throw new BusinessException("IMPORT_CORRECTION_VALUE_INVALID", label + "必须是正整数");
        }
    }

    private Long longValue(String value, String label) {
        try {
            long result = Long.parseLong(value);
            if (result < 0) throw new NumberFormatException();
            return result;
        } catch (NumberFormatException exception) {
            throw new BusinessException("IMPORT_CORRECTION_VALUE_INVALID", label + "必须是非负整数");
        }
    }

    private Integer parseInteger(String value, int fallback) {
        try {
            return Math.max(1, Integer.parseInt(value));
        } catch (Exception ignored) {
            return Math.max(1, fallback);
        }
    }

    private Long parseLong(String value, long fallback) {
        try {
            return Math.max(0L, Long.parseLong(value));
        } catch (Exception ignored) {
            return Math.max(0L, fallback);
        }
    }

    private String stableKey(Integer rowNo) {
        return "row-" + Math.max(1, rowNo == null ? 1 : rowNo);
    }

    private String safeError(RuntimeException exception) {
        return "该行处理失败，请刷新后重试";
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private int value(Integer value) {
        return value == null ? 0 : value;
    }

    private long value(Long value) {
        return value == null ? 0L : value;
    }

    private int toInteger(long value) {
        if (value > Integer.MAX_VALUE) {
            throw new BusinessException("IMPORT_COUNT_OVERFLOW", "导入行数量超出系统支持范围");
        }
        return (int) value;
    }

    @FunctionalInterface
    private interface RowMutation {
        ImportJobRowResponse execute();
    }

    private record SelectionSnapshot(String mode, List<ImportRowVersionReference> rows) {
    }

    private record UploadedCorrection(
            String stableRowKey,
            Integer rowNo,
            Long expectedVersion,
            Map<String, Object> correctedData,
            String errorCode,
            String errorMessage
    ) {
    }

    public record ImportFailureExport(String filename, byte[] content) {
    }
}
