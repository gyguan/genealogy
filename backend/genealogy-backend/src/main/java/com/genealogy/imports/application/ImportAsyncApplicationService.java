package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.config.ImportExecutionProperties;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobPayloadEntity;
import com.genealogy.imports.repository.ImportJobPayloadRepository;
import com.genealogy.imports.repository.ImportJobRepository;
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
import java.util.List;
import java.util.Locale;

@Service
public class ImportAsyncApplicationService {

    private static final String MODE_AUTO = "auto";
    private static final String MODE_SYNC = "sync";
    private static final String MODE_ASYNC = "async";

    private final ImportJobRepository importJobRepository;
    private final ImportJobPayloadRepository payloadRepository;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final PersonImportFilePolicyService personImportFilePolicyService;
    private final ImportExecutionProperties properties;

    public ImportAsyncApplicationService(
            ImportJobRepository importJobRepository,
            ImportJobPayloadRepository payloadRepository,
            AuthorizationApplicationService authorizationApplicationService,
            PersonImportFilePolicyService personImportFilePolicyService,
            ImportExecutionProperties properties
    ) {
        this.importJobRepository = importJobRepository;
        this.payloadRepository = payloadRepository;
        this.authorizationApplicationService = authorizationApplicationService;
        this.personImportFilePolicyService = personImportFilePolicyService;
        this.properties = properties;
    }

    public boolean shouldUseAsync(MultipartFile file, String requestedMode) {
        String mode = normalizeMode(requestedMode);
        if (MODE_ASYNC.equals(mode)) return true;
        if (MODE_SYNC.equals(mode) || file == null || file.isEmpty()) return false;
        if (file.getSize() >= properties.getAsyncFileBytesThreshold()) return true;
        return estimateDataRows(file) >= properties.getAsyncRowCountThreshold();
    }

    @Transactional
    public ImportJobResponse enqueuePersons(
            Long clanId,
            Long branchId,
            MultipartFile file,
            boolean confirmDuplicates,
            Long actorId
    ) {
        personImportFilePolicyService.validate(branchId, file);
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, branchId);

        String filename = file.getOriginalFilename() == null ? "persons.csv" : file.getOriginalFilename().trim();
        String format = filename.toLowerCase(Locale.ROOT).endsWith(".xlsx")
                ? ImportJobEntity.FORMAT_XLSX
                : ImportJobEntity.FORMAT_CSV;
        LocalDateTime now = LocalDateTime.now();

        ImportJobEntity job = new ImportJobEntity();
        job.setClanId(clanId);
        job.setBranchId(branchId);
        job.setImportType(ImportJobEntity.TYPE_PERSON + "_" + format);
        job.setOriginalFilename(filename);
        job.setTotalCount(0);
        job.setSuccessCount(0);
        job.setFailureCount(0);
        job.setStatus("running");
        job.setProcessingStatus(ImportJobEntity.PROCESSING_PROCESSING);
        job.setReviewStatus(ImportJobEntity.REVIEW_NOT_SUBMITTED);
        job.setReviewRound(0);
        job.setExecutionMode(ImportJobEntity.EXECUTION_MODE_ASYNC);
        job.setExecutionStatus(ImportJobEntity.EXECUTION_QUEUED);
        job.setExecutionStage(ImportJobEntity.STAGE_PARSING);
        job.setCursorRowNo(0);
        job.setProcessedCount(0);
        job.setPublishedCount(0);
        job.setChunkSize(properties.getChunkSize());
        job.setExecutionRetryCount(0);
        job.setExecutionMaxRetries(properties.getMaxRetries());
        job.setManualInterventionRequired(false);
        job.setCreatedBy(actorId);
        job.setCreatedAt(now);
        job.setUpdatedAt(now);
        ImportJobEntity saved = importJobRepository.save(job);

        ImportJobPayloadEntity payload = new ImportJobPayloadEntity();
        payload.setJobId(saved.getId());
        payload.setOriginalFilename(filename);
        payload.setContentType(file.getContentType());
        payload.setFileContent(readBytes(file));
        payload.setConfirmDuplicates(confirmDuplicates);
        payload.setCreatedAt(now);
        payloadRepository.save(payload);

        return new ImportJobResponse(
                saved.getId(), saved.getClanId(), saved.getBranchId(), saved.getImportType(), saved.getFileFormat(),
                saved.getImportType() + "_" + saved.getFileFormat(), saved.getOriginalFilename(), saved.getTotalCount(),
                saved.getSuccessCount(), saved.getFailureCount(), saved.getStatus(), saved.getErrorSummary(),
                saved.getCreatedAt(), List.of(), saved.getProcessingStatus(), saved.getReviewStatus(),
                saved.getReviewRound(), saved.getLatestReviewTaskId(), saved.getExecutionMode(),
                saved.getExecutionStatus(), saved.getExecutionStage(), saved.getProcessedCount(), saved.getPublishedCount(),
                saved.getChunkSize(), saved.getExecutionRetryCount(), saved.getExecutionMaxRetries(),
                saved.getManualInterventionRequired(), saved.getNextRetryAt(), saved.getHeartbeatAt()
        );
    }

    private int estimateDataRows(MultipartFile file) {
        String filename = file.getOriginalFilename() == null
                ? ""
                : file.getOriginalFilename().trim().toLowerCase(Locale.ROOT);
        try {
            if (filename.endsWith(".csv")) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
                    reader.readLine();
                    int count = 0;
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (!line.isBlank()) count++;
                        if (count >= properties.getAsyncRowCountThreshold()) return count;
                    }
                    return count;
                }
            }
            if (filename.endsWith(".xlsx")) {
                try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
                    Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
                    if (sheet == null) return 0;
                    int count = 0;
                    for (int rowIndex = sheet.getFirstRowNum() + 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                        if (sheet.getRow(rowIndex) != null) count++;
                        if (count >= properties.getAsyncRowCountThreshold()) return count;
                    }
                    return count;
                }
            }
            return 0;
        } catch (Exception exception) {
            throw new BusinessException("IMPORT_FILE_READ_FAILED", "无法评估导入文件规模，请确认文件未损坏");
        }
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw new BusinessException("IMPORT_FILE_STORE_FAILED", "导入文件暂存失败，请重新上传");
        }
    }

    private String normalizeMode(String value) {
        String mode = value == null || value.isBlank() ? MODE_AUTO : value.trim().toLowerCase(Locale.ROOT);
        if (!List.of(MODE_AUTO, MODE_SYNC, MODE_ASYNC).contains(mode)) {
            throw new BusinessException("IMPORT_EXECUTION_MODE_INVALID", "执行模式必须是 auto、sync 或 async");
        }
        return mode;
    }
}
