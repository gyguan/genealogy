package com.genealogy.imports.application;

import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PersonImportCommandApplicationService {

    private final ImportApplicationService importApplicationService;
    private final ImportAsyncApplicationService importAsyncApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public PersonImportCommandApplicationService(
            ImportApplicationService importApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this(importApplicationService, null, operationLogApplicationService);
    }

    @Autowired
    public PersonImportCommandApplicationService(
            ImportApplicationService importApplicationService,
            ImportAsyncApplicationService importAsyncApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.importApplicationService = importApplicationService;
        this.importAsyncApplicationService = importAsyncApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    public ImportJobResponse importPersonsCsv(
            Long clanId,
            Long branchId,
            MultipartFile file,
            boolean confirmDuplicates,
            Long actorId
    ) {
        return importPersonsCsv(clanId, branchId, file, confirmDuplicates, "auto", actorId);
    }

    public ImportJobResponse importPersonsCsv(
            Long clanId,
            Long branchId,
            MultipartFile file,
            boolean confirmDuplicates,
            String executionMode,
            Long actorId
    ) {
        boolean async = importAsyncApplicationService != null
                && importAsyncApplicationService.shouldUseAsync(file, executionMode);
        ImportJobResponse result = async
                ? importAsyncApplicationService.enqueuePersons(clanId, branchId, file, confirmDuplicates, actorId)
                : importApplicationService.importPersonsCsv(clanId, branchId, file, confirmDuplicates, actorId);
        operationLogApplicationService.record(
                clanId,
                actorId,
                async ? "person_import_async_queued" : "person_import",
                "import_job",
                result.id(),
                async ? "人物批量导入已进入后台处理" : "人物批量导入完成",
                buildAuditDetail(branchId, result, async)
        );
        return result;
    }

    private String buildAuditDetail(Long branchId, ImportJobResponse result, boolean async) {
        return "branchId=" + branchId
                + ", filename=" + safe(result.originalFilename())
                + ", executionMode=" + (async ? "async" : "sync")
                + ", status=" + safe(result.status())
                + ", total=" + value(result.totalCount())
                + ", success=" + value(result.successCount())
                + ", failure=" + value(result.failureCount());
    }

    private String safe(String value) {
        return value == null ? "" : value.replace("\n", " ").replace("\r", " ");
    }

    private int value(Integer value) {
        return value == null ? 0 : value;
    }
}
