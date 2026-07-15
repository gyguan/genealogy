package com.genealogy.operationlog.application;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class OperationLogExportApplicationService {

    private static final String EXPORT_ACTION = "operation_log_export";
    private static final String EXPORT_TARGET = "operation_log";

    private final OperationLogApplicationService operationLogApplicationService;

    public OperationLogExportApplicationService(OperationLogApplicationService operationLogApplicationService) {
        this.operationLogApplicationService = operationLogApplicationService;
    }

    public byte[] exportCsv(
            Long clanId,
            Long exportedByUserId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword
    ) {
        byte[] content = operationLogApplicationService.exportCsv(
                clanId,
                actorId,
                actionType,
                targetType,
                targetId,
                startTime,
                endTime,
                keyword
        );

        operationLogApplicationService.recordRisk(
                clanId,
                exportedByUserId,
                EXPORT_ACTION,
                EXPORT_TARGET,
                null,
                "导出操作日志",
                buildAuditDetail(actorId, actionType, targetType, targetId, startTime, endTime, keyword),
                OperationRiskPolicy.bulkExport(null)
        );
        return content;
    }

    private String buildAuditDetail(
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword
    ) {
        return "exportLimit=" + OperationLogApplicationService.EXPORT_LIMIT
                + ", actorFilter=" + value(actorId)
                + ", actionFilter=" + value(actionType)
                + ", targetTypeFilter=" + value(targetType)
                + ", targetFilter=" + value(targetId)
                + ", startTime=" + value(startTime)
                + ", endTime=" + value(endTime)
                + ", keywordProvided=" + (keyword != null && !keyword.isBlank());
    }

    private String value(Object value) {
        return value == null ? "none" : String.valueOf(value);
    }
}
