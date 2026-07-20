package com.genealogy.operationlog.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService.PermissionDataScope;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationLogBusinessViewApplicationService;
import com.genealogy.operationlog.application.OperationLogExportApplicationService;
import com.genealogy.operationlog.application.OperationLogMultiValueQueryService;
import com.genealogy.operationlog.application.OperationRiskAuditApplicationService;
import com.genealogy.operationlog.application.OperationRiskBusinessViewApplicationService;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.operationlog.dto.OperationLogStatsResponse;
import com.genealogy.operationlog.dto.RiskAuditEventResponse;
import com.genealogy.operationlog.dto.RiskAuditStatsResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Validated
@RestController
@RequestMapping("/api/v1/logs")
public class OpLogController {

    private static final String PERMISSION_VIEW = "operation_log.view";
    private static final String PERMISSION_EXPORT = "operation_log.export";
    private static final String PERMISSION_RISK_VIEW = "operation_risk.view";

    private final OperationLogApplicationService operationLogApplicationService;
    private final OperationLogMultiValueQueryService operationLogMultiValueQueryService;
    private final OperationLogBusinessViewApplicationService operationLogBusinessViewApplicationService;
    private final OperationLogExportApplicationService operationLogExportApplicationService;
    private final OperationRiskAuditApplicationService operationRiskAuditApplicationService;
    private final OperationRiskBusinessViewApplicationService operationRiskBusinessViewApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;
    private final RbacAuthorizationApplicationService rbacAuthorizationApplicationService;

    public OpLogController(
            OperationLogApplicationService operationLogApplicationService,
            OperationLogMultiValueQueryService operationLogMultiValueQueryService,
            OperationLogBusinessViewApplicationService operationLogBusinessViewApplicationService,
            OperationLogExportApplicationService operationLogExportApplicationService,
            OperationRiskAuditApplicationService operationRiskAuditApplicationService,
            OperationRiskBusinessViewApplicationService operationRiskBusinessViewApplicationService,
            AuthorizationApplicationService authorizationApplicationService,
            RbacAuthorizationApplicationService rbacAuthorizationApplicationService
    ) {
        this.operationLogApplicationService = operationLogApplicationService;
        this.operationLogMultiValueQueryService = operationLogMultiValueQueryService;
        this.operationLogBusinessViewApplicationService = operationLogBusinessViewApplicationService;
        this.operationLogExportApplicationService = operationLogExportApplicationService;
        this.operationRiskAuditApplicationService = operationRiskAuditApplicationService;
        this.operationRiskBusinessViewApplicationService = operationRiskBusinessViewApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
        this.rbacAuthorizationApplicationService = rbacAuthorizationApplicationService;
    }

    @GetMapping("/operations")
    public ApiResponse<PageResponse<OperationLogResponse>> listOperations(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @NotNull @RequestParam("clanId") Long clanId,
            @RequestParam(required = false, name = "actorId") List<Long> actorIds,
            @RequestParam(required = false, name = "actionType") List<String> actionTypes,
            @RequestParam(required = false, name = "targetType") List<String> targetTypes,
            @RequestParam(required = false) Long targetId,
            @RequestParam(required = false, name = "resultStatus") List<String> resultStatuses,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime startTime,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime endTime,
            @RequestParam(required = false) String keyword,
            @Min(1) @RequestParam(defaultValue = "1") int pageNo,
            @Min(1) @Max(100) @RequestParam(defaultValue = "20") int pageSize
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requireDirectClanPermission(clanId, userId, PERMISSION_VIEW);
        boolean includeTechnicalFields = authorizationApplicationService.hasDirectClanPermission(
                clanId,
                userId,
                PERMISSION_EXPORT
        );
        PageResponse<OperationLogResponse> page = operationLogMultiValueQueryService.search(
                clanId,
                actorIds,
                actionTypes,
                targetTypes,
                targetId,
                resultStatuses,
                startTime,
                endTime,
                keyword,
                pageNo,
                pageSize,
                includeTechnicalFields
        );
        return ApiResponse.success(operationLogBusinessViewApplicationService.enrich(page, clanId, userId));
    }

    @GetMapping("/risks")
    public ApiResponse<PageResponse<RiskAuditEventResponse>> listRisks(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @NotNull @RequestParam("clanId") Long clanId,
            @RequestParam(required = false, name = "actorId") List<Long> actorIds,
            @RequestParam(required = false, name = "riskLevel") List<String> riskLevels,
            @RequestParam(required = false, name = "eventType") List<String> eventTypes,
            @RequestParam(required = false, name = "branchId") List<Long> branchIds,
            @RequestParam(required = false, name = "dispositionStatus") List<String> dispositionStatuses,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime startTime,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime endTime,
            @Min(1) @RequestParam(defaultValue = "1") int pageNo,
            @Min(1) @Max(100) @RequestParam(defaultValue = "20") int pageSize
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requireDirectClanPermission(clanId, userId, PERMISSION_RISK_VIEW);
        PermissionDataScope scope = rbacAuthorizationApplicationService.permissionDataScope(
                userId,
                clanId,
                PERMISSION_RISK_VIEW
        );
        boolean includeTechnicalFields = authorizationApplicationService.hasDirectClanPermission(
                clanId,
                userId,
                PERMISSION_EXPORT
        );
        PageResponse<RiskAuditEventResponse> page = aggregateRiskPages(
                clanId,
                actorIds,
                riskLevels,
                eventTypes,
                branchIds,
                dispositionStatuses,
                startTime,
                endTime,
                pageNo,
                pageSize,
                includeTechnicalFields,
                scope
        );
        return ApiResponse.success(operationRiskBusinessViewApplicationService.enrich(page, clanId, userId));
    }

    @GetMapping("/risks/stats")
    public ApiResponse<RiskAuditStatsResponse> riskStats(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @NotNull @RequestParam("clanId") Long clanId,
            @RequestParam(required = false, name = "actorId") List<Long> actorIds,
            @RequestParam(required = false, name = "riskLevel") List<String> riskLevels,
            @RequestParam(required = false, name = "eventType") List<String> eventTypes,
            @RequestParam(required = false, name = "branchId") List<Long> branchIds,
            @RequestParam(required = false, name = "dispositionStatus") List<String> dispositionStatuses,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime startTime,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime endTime
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requireDirectClanPermission(clanId, userId, PERMISSION_RISK_VIEW);
        PermissionDataScope scope = rbacAuthorizationApplicationService.permissionDataScope(
                userId,
                clanId,
                PERMISSION_RISK_VIEW
        );
        return ApiResponse.success(aggregateRiskStats(
                clanId,
                actorIds,
                riskLevels,
                eventTypes,
                branchIds,
                dispositionStatuses,
                startTime,
                endTime,
                scope
        ));
    }

    @GetMapping("/operations/export.csv")
    public ResponseEntity<byte[]> exportOperations(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @NotNull @RequestParam("clanId") Long clanId,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) Long targetId,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime startTime,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime endTime,
            @RequestParam(required = false) String keyword
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requireDirectClanPermission(clanId, userId, PERMISSION_EXPORT);
        byte[] content = operationLogExportApplicationService.exportCsv(
                clanId,
                userId,
                actorId,
                actionType,
                targetType,
                targetId,
                startTime,
                endTime,
                keyword
        );
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename("operation-logs.csv", StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(content);
    }

    @GetMapping("/operations/stats")
    public ApiResponse<OperationLogStatsResponse> operationStats(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @NotNull @RequestParam("clanId") Long clanId,
            @RequestParam(required = false, name = "actorId") List<Long> actorIds,
            @RequestParam(required = false, name = "actionType") List<String> actionTypes,
            @RequestParam(required = false, name = "targetType") List<String> targetTypes,
            @RequestParam(required = false) Long targetId,
            @RequestParam(required = false, name = "resultStatus") List<String> resultStatuses,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime startTime,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime endTime,
            @RequestParam(required = false) String keyword
    ) {
        Long userId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requireDirectClanPermission(clanId, userId, PERMISSION_VIEW);
        return ApiResponse.success(operationLogMultiValueQueryService.stats(
                clanId,
                actorIds,
                actionTypes,
                targetTypes,
                targetId,
                resultStatuses,
                startTime,
                endTime,
                keyword
        ));
    }

    private PageResponse<RiskAuditEventResponse> aggregateRiskPages(
            Long clanId,
            List<Long> actorIds,
            List<String> riskLevels,
            List<String> eventTypes,
            List<Long> branchIds,
            List<String> dispositionStatuses,
            LocalDateTime startTime,
            LocalDateTime endTime,
            int pageNo,
            int pageSize,
            boolean includeTechnicalFields,
            PermissionDataScope scope
    ) {
        List<Long> actors = values(actorIds);
        List<String> levels = values(riskLevels);
        List<String> events = values(eventTypes);
        List<Long> branches = values(branchIds);
        List<String> dispositions = values(dispositionStatuses);
        int requiredRecords = Math.min(pageNo * pageSize, 100);
        List<RiskAuditEventResponse> merged = new ArrayList<>();
        long total = 0L;
        for (Long actorId : nullableValues(actors)) {
            for (String riskLevel : nullableValues(levels)) {
                for (String eventType : nullableValues(events)) {
                    for (Long branchId : nullableValues(branches)) {
                        for (String dispositionStatus : nullableValues(dispositions)) {
                            PageResponse<RiskAuditEventResponse> page = operationRiskAuditApplicationService.search(
                                    clanId,
                                    actorId,
                                    riskLevel,
                                    eventType,
                                    branchId,
                                    dispositionStatus,
                                    startTime,
                                    endTime,
                                    1,
                                    requiredRecords,
                                    includeTechnicalFields,
                                    scope
                            );
                            merged.addAll(page.records());
                            total += page.total();
                        }
                    }
                }
            }
        }
        List<RiskAuditEventResponse> ordered = merged.stream()
                .collect(java.util.stream.Collectors.toMap(
                        RiskAuditEventResponse::id,
                        Function.identity(),
                        (left, right) -> left,
                        LinkedHashMap::new
                ))
                .values().stream()
                .sorted(Comparator.comparing(
                        RiskAuditEventResponse::createdAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ).thenComparing(RiskAuditEventResponse::id, Comparator.reverseOrder()))
                .toList();
        int fromIndex = Math.min((pageNo - 1) * pageSize, ordered.size());
        int toIndex = Math.min(fromIndex + pageSize, ordered.size());
        return PageResponse.of(ordered.subList(fromIndex, toIndex), total, pageNo, pageSize);
    }

    private RiskAuditStatsResponse aggregateRiskStats(
            Long clanId,
            List<Long> actorIds,
            List<String> riskLevels,
            List<String> eventTypes,
            List<Long> branchIds,
            List<String> dispositionStatuses,
            LocalDateTime startTime,
            LocalDateTime endTime,
            PermissionDataScope scope
    ) {
        long total = 0L;
        Map<String, Long> byLevel = new LinkedHashMap<>();
        Map<String, Long> byEventType = new LinkedHashMap<>();
        Map<String, Long> byDisposition = new LinkedHashMap<>();
        for (Long actorId : nullableValues(values(actorIds))) {
            for (String riskLevel : nullableValues(values(riskLevels))) {
                for (String eventType : nullableValues(values(eventTypes))) {
                    for (Long branchId : nullableValues(values(branchIds))) {
                        for (String dispositionStatus : nullableValues(values(dispositionStatuses))) {
                            RiskAuditStatsResponse stats = operationRiskAuditApplicationService.stats(
                                    clanId,
                                    actorId,
                                    riskLevel,
                                    eventType,
                                    branchId,
                                    dispositionStatus,
                                    startTime,
                                    endTime,
                                    scope
                            );
                            total += stats.total();
                            mergeCounts(byLevel, stats.byLevel());
                            mergeCounts(byEventType, stats.byEventType());
                            mergeCounts(byDisposition, stats.byDisposition());
                        }
                    }
                }
            }
        }
        return new RiskAuditStatsResponse(
                total,
                toStatsItems(byLevel),
                toStatsItems(byEventType),
                toStatsItems(byDisposition)
        );
    }

    private void mergeCounts(Map<String, Long> target, List<RiskAuditStatsResponse.Item> items) {
        for (RiskAuditStatsResponse.Item item : items) {
            target.merge(item.key(), item.count(), Long::sum);
        }
    }

    private List<RiskAuditStatsResponse.Item> toStatsItems(Map<String, Long> counts) {
        return counts.entrySet().stream()
                .map(entry -> new RiskAuditStatsResponse.Item(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparingLong(RiskAuditStatsResponse.Item::count).reversed())
                .toList();
    }

    private <T> List<T> values(List<T> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream().filter(java.util.Objects::nonNull).distinct().toList();
    }

    private <T> List<T> nullableValues(List<T> values) {
        return values.isEmpty() ? java.util.Collections.singletonList(null) : values;
    }
}
