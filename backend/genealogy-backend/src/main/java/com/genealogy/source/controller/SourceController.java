package com.genealogy.source.controller;

import com.genealogy.auth.application.RequestContextApplicationService;
import com.genealogy.auth.dto.RequestUserContext;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageQuery;
import com.genealogy.common.api.PageResponse;
import com.genealogy.source.application.SourceApplicationService;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingResponse;
import com.genealogy.source.dto.SourceCreateRequest;
import com.genealogy.source.dto.SourceResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class SourceController {

    private final SourceApplicationService sourceApplicationService;
    private final RequestContextApplicationService requestContextApplicationService;

    public SourceController(SourceApplicationService sourceApplicationService, RequestContextApplicationService requestContextApplicationService) {
        this.sourceApplicationService = sourceApplicationService;
        this.requestContextApplicationService = requestContextApplicationService;
    }

    @PostMapping("/clans/{clanId}/sources")
    public ApiResponse<SourceResponse> create(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody SourceCreateRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(sourceApplicationService.create(clanId, request, context.userId(), context.requestId(), context.clientIp()));
    }

    @GetMapping("/sources/{id}")
    public ApiResponse<SourceResponse> get(@Positive @PathVariable Long id, HttpServletRequest servletRequest) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(sourceApplicationService.get(id, context.userId()));
    }

    @PutMapping("/sources/{id}")
    public ApiResponse<SourceResponse> update(@Positive @PathVariable Long id, @Valid @RequestBody SourceCreateRequest request, HttpServletRequest servletRequest) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(sourceApplicationService.update(id, request, context.userId()));
    }

    @DeleteMapping("/sources/{id}")
    public ApiResponse<Void> delete(@Positive @PathVariable Long id, HttpServletRequest servletRequest) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        sourceApplicationService.delete(id, context.userId());
        return ApiResponse.success();
    }

    @GetMapping("/clans/{clanId}/sources")
    public ApiResponse<PageResponse<SourceResponse>> listByClan(@Positive @PathVariable Long clanId, PageQuery pageQuery, HttpServletRequest servletRequest) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(sourceApplicationService.listByClan(clanId, pageQuery.normalizedPageNo(), pageQuery.normalizedPageSize(), context.userId()));
    }

    @PostMapping("/clans/{clanId}/source-bindings")
    public ApiResponse<SourceBindingResponse> bind(@Positive @PathVariable Long clanId, @Valid @RequestBody SourceBindingCreateRequest request, HttpServletRequest servletRequest) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(sourceApplicationService.bind(clanId, request, context.userId()));
    }

    @GetMapping("/sources/{sourceId}/bindings")
    public ApiResponse<List<SourceBindingResponse>> listBindingsBySource(@Positive @PathVariable Long sourceId, HttpServletRequest servletRequest) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(sourceApplicationService.listBindingsBySource(sourceId, context.userId()));
    }

    @GetMapping("/clans/{clanId}/source-bindings")
    public ApiResponse<List<SourceBindingResponse>> listBindingsByTarget(
            @Positive @PathVariable Long clanId,
            @RequestParam String targetType,
            @Positive @RequestParam Long targetId,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(sourceApplicationService.listBindingsByTarget(targetType, targetId, clanId, context.userId()));
    }
}
