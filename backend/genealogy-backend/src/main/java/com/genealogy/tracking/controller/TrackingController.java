package com.genealogy.tracking.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageResponse;
import com.genealogy.tracking.application.TrackingObjectSearchApplicationService;
import com.genealogy.tracking.dto.TrackingObjectResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@Validated
@RestController
@RequestMapping("/api/v1/tracking")
public class TrackingController {

    private final TrackingObjectSearchApplicationService trackingObjectSearchApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public TrackingController(
            TrackingObjectSearchApplicationService trackingObjectSearchApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.trackingObjectSearchApplicationService = trackingObjectSearchApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @GetMapping("/objects")
    public ApiResponse<PageResponse<TrackingObjectResponse>> searchObjects(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @NotNull @RequestParam("clanId") Long clanId,
            @NotBlank @RequestParam("objectType") String objectType,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime changedFrom,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @RequestParam(required = false) LocalDateTime changedTo,
            @Min(1) @RequestParam(defaultValue = "1") int pageNo,
            @Min(1) @Max(50) @RequestParam(defaultValue = "20") int pageSize
    ) {
        Long actorId = authorizationApplicationService.requireLogin(authorization);
        authorizationApplicationService.requireDirectClanPermission(
                clanId,
                actorId,
                TrackingObjectSearchApplicationService.PERMISSION_VIEW
        );
        return ApiResponse.success(trackingObjectSearchApplicationService.search(
                clanId,
                actorId,
                objectType,
                keyword,
                branchId,
                status,
                changedFrom,
                changedTo,
                pageNo,
                pageSize
        ));
    }
}
