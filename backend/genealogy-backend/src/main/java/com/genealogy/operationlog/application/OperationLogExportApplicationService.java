package com.genealogy.operationlog.application;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class OperationLogExportApplicationService {

    private static final String EXPORT_ACTION = "operation_log_export";
    private static final String EXPORT_TARGET = "operation_log";

    private final OperationLogApplicationService operationLogApplicationService;
    private final OperationLogMultiValueQueryService operationLogMultiValueQueryService;

    public OperationLogExportApplicationService(
            OperationLogApplicationService operationLogApplicationService,
            OperationLogMultiValueQueryService operationLogMultiValueQueryService
    ) {
        this.operationLogApplicationService = operationLogApplicationService;
        this.operationLogMultiValueQueryService = operationLogMultiValueQueryService;
    }

    public byte[] exportCsv(
            Long clanId,
            Long exportedByUserId,
            List<Long> actorIds,
            List<String> actionTypes,
            List<String> targetTypes,
            Long targetId,
            List<String> resultStatuses,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword
    ) {
        byte[] content = operationLogMultiValueQueryService.exportCsv(
                clanId,
                actorIds,
                actionTypes,
                targetTypes,
                targetId,
                resultStatuses,
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
                buildAuditDetail(actorIds, actionTypes, targetTypes, targetId, resultStatuses, startTime, endTime, keyword),
                OperationRiskPolicy.bulkExport(null)
        );
        return content;
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
        return exportCsv(
                clanId,
                exportedByUserId,
                actorId == null ? List.of() : List.of(actorId),
                actionType == null ? List.of() : List.of(actionType),
                targetType == null ? List.of() : List.of(targetType),
                targetId,
                List.of(),
                startTime,
                endTime,
                keyword
        );
    }

    private String buildAuditDetail(
            List<Long> actorIds,
            List<String> actionTypes,
            List<String> targetTypes,
            Long targetId,
            List<String> resultStatuses,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword
    ) {
        return "exportLimit=" + OperationLogApplicationService.EXPORT_LIMIT
                + ", actorFilters=" + value(actorIds)
                + ", actionFilters=" + value(actionTypes)
                + ", targetTypeFilters=" + value(targetTypes)
                + ", targetFilter=" + value(targetId)
                + ", resultFilters=" + value(resultStatuses)
                + ", startTime=" + value(startTime)
                + ", endTime=" + value(endTime)
                + ", keywordProvided=" + (keyword != null && !keyword.isBlank());
    }

    private String value(Object value) {
        return value == null ? "none" : String.valueOf(value);
    }
}
