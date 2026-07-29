package com.genealogy.imports.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.imports.application.ImportJobLifecycleService.ImportBatchSummary;
import com.genealogy.imports.application.PersonImportParser.ImportRow;
import com.genealogy.imports.application.PersonImportParser.ParsedPersonRow;
import com.genealogy.imports.application.PersonImportParser.ReadResult;
import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.imports.dto.ImportPreviewResponse;
import com.genealogy.imports.dto.ImportPreviewRowResponse;
import com.genealogy.imports.entity.ImportJobEntity;
import com.genealogy.imports.observability.ImportMetrics;
import com.genealogy.person.application.PersonDuplicateDetectionService;
import com.genealogy.person.application.PersonDuplicateQuery;
import com.genealogy.person.application.PersonDuplicateResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class ImportApplicationService {

    private final AuthorizationApplicationService authorizationApplicationService;
    private final PersonImportFilePolicyService filePolicyService;
    private final PersonImportParser parser;
    private final PersonDuplicateDetectionService duplicateDetectionService;
    private final PersonImportBatchProcessor batchProcessor;
    private final ImportJobLifecycleService jobLifecycleService;
    private final ImportMetrics metrics;
    private final int batchSize;

    public ImportApplicationService(
            AuthorizationApplicationService authorizationApplicationService,
            PersonImportFilePolicyService filePolicyService,
            PersonImportParser parser,
            PersonDuplicateDetectionService duplicateDetectionService,
            PersonImportBatchProcessor batchProcessor,
            ImportJobLifecycleService jobLifecycleService,
            ImportMetrics metrics,
            @Value("${genealogy.import.batch-size:200}") int batchSize
    ) {
        this.authorizationApplicationService = authorizationApplicationService;
        this.filePolicyService = filePolicyService;
        this.parser = parser;
        this.duplicateDetectionService = duplicateDetectionService;
        this.batchProcessor = batchProcessor;
        this.jobLifecycleService = jobLifecycleService;
        this.metrics = metrics;
        this.batchSize = Math.max(100, Math.min(batchSize, 500));
    }

    @Transactional(readOnly = true)
    public ImportPreviewResponse previewPersons(
            Long clanId,
            Long branchId,
            MultipartFile file,
            Long actorId
    ) {
        filePolicyService.validate(branchId, file);
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, branchId);
        List<ImportPreviewRowResponse> rows = parser.read(file).rows().stream()
                .map(row -> previewRow(clanId, branchId, row))
                .toList();
        int valid = (int) rows.stream().filter(row -> !hasError(row)).count();
        int duplicates = (int) rows.stream().filter(ImportPreviewRowResponse::duplicated).count();
        int errors = rows.size() - valid;
        return new ImportPreviewResponse(rows.size(), valid, duplicates, errors, rows);
    }

    public ImportJobResponse importPersonsCsv(
            Long clanId,
            Long branchId,
            MultipartFile file,
            boolean confirmDuplicates,
            Long actorId
    ) {
        long startedNanos = System.nanoTime();
        filePolicyService.validate(branchId, file);
        authorizationApplicationService.requireBranchWriteScope(clanId, actorId, branchId);
        ReadResult readResult = parser.read(file);
        List<ImportPreviewRowResponse> previewRows = readResult.rows().stream()
                .map(row -> previewRow(clanId, branchId, row))
                .toList();
        if (!confirmDuplicates && previewRows.stream().anyMatch(ImportPreviewRowResponse::duplicated)) {
            throw new BusinessException(
                    "IMPORT_DUPLICATE_CONFIRM_REQUIRED",
                    "导入文件存在疑似重复人物，请先预览并确认后再导入"
            );
        }

        String importType = readResult.xlsx() ? "person_xlsx" : "person_csv";
        ImportJobEntity job = jobLifecycleService.start(
                clanId,
                branchId,
                readResult.filename(),
                importType,
                actorId
        );

        ImportBatchSummary summary = ImportBatchSummary.empty();
        List<ImportRow> rows = readResult.rows();
        for (int start = 0; start < rows.size(); start += batchSize) {
            int end = Math.min(start + batchSize, rows.size());
            summary = summary.plus(batchProcessor.process(
                    job.getId(),
                    clanId,
                    branchId,
                    actorId,
                    new ArrayList<>(rows.subList(start, end))
            ));
        }

        ImportJobResponse response = jobLifecycleService.complete(job.getId(), summary);
        metrics.record(importType, Duration.ofNanos(System.nanoTime() - startedNanos), summary);
        return response;
    }

    @Transactional(readOnly = true)
    public List<ImportJobResponse> listJobs(Long clanId) {
        return jobLifecycleService.list(clanId);
    }

    private ImportPreviewRowResponse previewRow(Long clanId, Long branchId, ImportRow row) {
        try {
            ParsedPersonRow parsed = parser.parse(branchId, row);
            PersonDuplicateResult duplicate = duplicateDetectionService.detect(PersonDuplicateQuery.of(
                    clanId,
                    branchId,
                    parsed.name(),
                    parsed.generationNo(),
                    parsed.generationWord(),
                    parsed.birthDate()
            ));
            return new ImportPreviewRowResponse(
                    row.rowNo(),
                    parsed.name(),
                    parsed.gender(),
                    parsed.generationNo(),
                    parsed.generationWord(),
                    branchId,
                    parsed.birthDate() == null ? null : parsed.birthDate().toString(),
                    parsed.isLiving(),
                    duplicate.duplicated(),
                    duplicate.candidateCount(),
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

    private boolean hasError(ImportPreviewRowResponse row) {
        return row.errorMessage() != null && !row.errorMessage().isBlank();
    }

    private String errorMessage(RuntimeException exception) {
        String message = exception.getMessage();
        return message == null || message.isBlank() ? "导入行处理失败" : message;
    }
}
