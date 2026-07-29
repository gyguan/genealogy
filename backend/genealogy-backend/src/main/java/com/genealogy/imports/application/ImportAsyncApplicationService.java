package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.config.ImportExecutionProperties;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.entity.ImportJobPayloadEntity;
import com.genealogy.imports.repository.ImportJobPayloadRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
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
        byte[] content = readBytes(file);
        String idempotencyKey = submissionKey(clanId, branchId, confirmDuplicates, content);
        ImportJobEntity existing = importJobRepository
                .findFirstByClanIdAndIdempotencyKeyOrderByCreatedAtDesc(clanId, idempotencyKey)
                .orElse(null);
        if (existing != null) {
            return toResponse(existing);
        }

        LocalDateTime now = LocalDateTime.now();
        ImportJobEntity job = new ImportJobEntity();
        job.setClanId(clanId);
        job.setBranchId(branchId);
        job.setImportType(ImportJobEntity.TYPE_PERSON + "_" + format);
        job.setOriginalFilename(filename);
        job.setIdempotencyKey(idempotencyKey);
        job.setTotalCount(0);
        job.setSuccessCount(0);
        job.setFailureCount(0);
        job.setSkippedCount(0);
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
        payload.setFileContent(content);
        payload.setConfirmDuplicates(confirmDuplicates);
        payload.setCreatedAt(now);
        payloadRepository.save(payload);
        return toResponse(saved);
    }

    private ImportJobResponse toResponse(ImportJobEntity saved) {
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
            // XLSX is a ZIP container. Do not materialize a Workbook merely to route the request;
            // file size routing keeps the upload path bounded and the worker performs chunk parsing.
            return filename.endsWith(".xlsx") && file.getSize() > 0
                    ? properties.getAsyncRowCountThreshold()
                    : 0;
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

    private String submissionKey(Long clanId, Long branchId, boolean confirmDuplicates, byte[] content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(String.valueOf(clanId).getBytes(StandardCharsets.UTF_8));
            digest.update((byte) ':');
            digest.update(String.valueOf(branchId).getBytes(StandardCharsets.UTF_8));
            digest.update((byte) ':');
            digest.update(Boolean.toString(confirmDuplicates).getBytes(StandardCharsets.UTF_8));
            digest.update((byte) ':');
            digest.update(content);
            return HexFormat.of().formatHex(digest.digest());
        } catch (Exception exception) {
            throw new BusinessException("IMPORT_IDEMPOTENCY_KEY_FAILED", "无法生成导入幂等键");
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
