package com.genealogy.imports.application;

import com.genealogy.imports.dto.ImportJobResponse;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PersonImportCommandApplicationService {

    private final ImportApplicationService importApplicationService;
    private final OperationLogApplicationService operationLogApplicationService;

    public PersonImportCommandApplicationService(
            ImportApplicationService importApplicationService,
            OperationLogApplicationService operationLogApplicationService
    ) {
        this.importApplicationService = importApplicationService;
        this.operationLogApplicationService = operationLogApplicationService;
    }

    public ImportJobResponse importPersonsCsv(
            Long clanId,
            Long branchId,
            MultipartFile file,
            ImportApplicationService.FieldMapping mapping,
            boolean autoMapping,
            boolean confirmDuplicates,
            Long actorId
    ) {
        ImportJobResponse result = importApplicationService.importPersonsCsv(
                clanId,
                branchId,
                file,
                mapping,
                autoMapping,
                confirmDuplicates,
                actorId
        );
        operationLogApplicationService.record(
                clanId,
                actorId,
                "person_import",
                "import_job",
                result.id(),
                "人物批量导入完成",
                buildAuditDetail(branchId, result)
        );
        return result;
    }

    private String buildAuditDetail(Long branchId, ImportJobResponse result) {
        return "branchId=" + branchId
                + ", filename=" + safe(result.originalFilename())
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
