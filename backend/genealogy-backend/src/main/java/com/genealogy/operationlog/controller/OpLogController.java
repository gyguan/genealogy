package com.genealogy.operationlog.controller;

import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.dto.OperationLogResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@Validated
@RestController
@RequestMapping("/api/v1/logs")
public class OpLogController {

    private final OperationLogApplicationService operationLogApplicationService;

    public OpLogController(OperationLogApplicationService operationLogApplicationService) {
        this.operationLogApplicationService = operationLogApplicationService;
    }

    @GetMapping("/operations")
    public ApiResponse<PageResponse<OperationLogResponse>> listOperations(
            @RequestParam(required = false) Long clanId,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) Long targetId,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime startTime,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime endTime,
            @RequestParam(required = false) String keyword,
            @Min(1) @RequestParam(defaultValue = "1") int pageNo,
            @Min(1) @Max(100) @RequestParam(defaultValue = "20") int pageSize
    ) {
        return ApiResponse.success(operationLogApplicationService.search(
                clanId, actorId, actionType, targetType, targetId, startTime, endTime, keyword, pageNo, pageSize
        ));
    }
}
