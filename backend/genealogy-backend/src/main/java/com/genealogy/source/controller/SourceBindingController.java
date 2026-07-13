package com.genealogy.source.controller;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RequestContextApplicationService;
import com.genealogy.auth.dto.RequestUserContext;
import com.genealogy.common.api.ApiResponse;
import com.genealogy.common.api.PageQuery;
import com.genealogy.common.api.PageResponse;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.source.application.SourceApplicationService;
import com.genealogy.source.application.SourceBindingReviewApplicationService;
import com.genealogy.source.application.SourceBindingTargetValidationService;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingResponse;
import com.genealogy.source.dto.SourceBindingRevisionDeleteRequest;
import com.genealogy.source.dto.SourceBindingRevisionResponse;
import com.genealogy.source.dto.SourceBindingRevisionSubmitRequest;
import com.genealogy.source.dto.SourceBindingReviewDecisionRequest;
import com.genealogy.source.dto.SourceBindingSummaryResponse;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1")
public class SourceBindingController {

    private static final String SOURCE_VIEW = "source:view";

    private final SourceApplicationService sourceApplicationService;
    private final SourceBindingReviewApplicationService sourceBindingReviewApplicationService;
    private final SourceBindingTargetValidationService sourceBindingTargetValidationService;
    private final SourceBindingRepository sourceBindingRepository;
    private final RequestContextApplicationService requestContextApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public SourceBindingController(
            SourceApplicationService sourceApplicationService,
            SourceBindingReviewApplicationService sourceBindingReviewApplicationService,
            SourceBindingTargetValidationService sourceBindingTargetValidationService,
            SourceBindingRepository sourceBindingRepository,
            RequestContextApplicationService requestContextApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.sourceApplicationService = sourceApplicationService;
        this.sourceBindingReviewApplicationService = sourceBindingReviewApplicationService;
        this.sourceBindingTargetValidationService = sourceBindingTargetValidationService;
        this.sourceBindingRepository = sourceBindingRepository;
        this.requestContextApplicationService = requestContextApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @PostMapping("/clans/{clanId}/source-bindings")
    public ApiResponse<SourceBindingResponse> bind(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody SourceBindingCreateRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        sourceBindingTargetValidationService.validate(clanId, request);
        return ApiResponse.success(sourceApplicationService.bind(clanId, request, context.userId()));
    }

    @PostMapping("/clans/{clanId}/source-bindings/revisions")
    public ApiResponse<SourceBindingRevisionResponse> submitCreateRevision(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody SourceBindingRevisionSubmitRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        sourceBindingTargetValidationService.validate(clanId, request.binding());
        return ApiResponse.success(sourceBindingReviewApplicationService.submitCreate(clanId, request, context.userId(), context.requestId(), context.clientIp()));
    }

    @PostMapping("/source-bindings/{bindingId}/replace-revision")
    public ApiResponse<SourceBindingRevisionResponse> submitReplaceRevision(
            @Positive @PathVariable Long bindingId,
            @Valid @RequestBody SourceBindingRevisionSubmitRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        sourceBindingTargetValidationService.validate(request.binding());
        return ApiResponse.success(sourceBindingReviewApplicationService.submitReplace(bindingId, request, context.userId(), context.requestId(), context.clientIp()));
    }

    @PostMapping("/source-bindings/{bindingId}/delete-revision")
    public ApiResponse<SourceBindingRevisionResponse> submitDeleteRevision(
            @Positive @PathVariable Long bindingId,
            @Valid @RequestBody SourceBindingRevisionDeleteRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(sourceBindingReviewApplicationService.submitDelete(bindingId, request, context.userId(), context.requestId(), context.clientIp()));
    }

    @PostMapping("/source-binding-revisions/{revisionId}/approve")
    public ApiResponse<SourceBindingRevisionResponse> approveRevision(
            @Positive @PathVariable Long revisionId,
            @Valid @RequestBody SourceBindingReviewDecisionRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(sourceBindingReviewApplicationService.approve(revisionId, request, context.userId(), context.requestId(), context.clientIp()));
    }

    @PostMapping("/source-binding-revisions/{revisionId}/reject")
    public ApiResponse<SourceBindingRevisionResponse> rejectRevision(
            @Positive @PathVariable Long revisionId,
            @Valid @RequestBody SourceBindingReviewDecisionRequest request,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(sourceBindingReviewApplicationService.reject(revisionId, request, context.userId(), context.requestId(), context.clientIp()));
    }

    /**
     * Compatibility endpoint. New callers should use /clans/{clanId}/source-bindings.
     */
    @Deprecated
    @PostMapping("/clans/{clanId}/source-links")
    public ApiResponse<SourceBindingResponse> bindLegacySourceLink(
            @Positive @PathVariable Long clanId,
            @Valid @RequestBody SourceBindingCreateRequest request,
            HttpServletRequest servletRequest
    ) {
        return bind(clanId, request, servletRequest);
    }

    @GetMapping("/sources/{sourceId}/bindings")
    public ApiResponse<PageResponse<SourceBindingSummaryResponse>> listSourceBindings(
            @Positive @PathVariable Long sourceId,
            PageQuery pageQuery,
            @RequestParam(required = false) String targetType,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(sourceApplicationService.listBindingSummariesBySource(
                sourceId,
                targetType,
                pageQuery.normalizedPageNo(),
                pageQuery.normalizedPageSize(),
                context.userId()
        ));
    }

    @GetMapping("/source-bindings/sources/{sourceId}")
    public ApiResponse<List<SourceBindingResponse>> listBySource(
            @Positive @PathVariable Long sourceId,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        return ApiResponse.success(sourceApplicationService.listBindingsBySource(sourceId, context.userId()));
    }

    @GetMapping("/source-bindings/target/{targetType}/{targetId}")
    public ApiResponse<List<SourceBindingResponse>> listByTarget(
            @NotBlank @PathVariable String targetType,
            @Positive @PathVariable Long targetId,
            @RequestParam(required = false) Long clanId,
            HttpServletRequest servletRequest
    ) {
        RequestUserContext context = requestContextApplicationService.requireLogin(servletRequest);
        if (clanId != null) {
            return ApiResponse.success(sourceApplicationService.listBindingsByTarget(targetType, targetId, clanId, context.userId()));
        }
        return ApiResponse.success(sourceBindingRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc(targetType, targetId).stream()
                .filter(binding -> canViewSourceBinding(binding, context.userId()))
                .map(this::toResponse)
                .toList());
    }

    private boolean canViewSourceBinding(SourceBindingEntity binding, Long actorId) {
        try {
            authorizationApplicationService.requirePermission(binding.getClanId(), actorId, SOURCE_VIEW);
            return true;
        } catch (BusinessException ignored) {
            return false;
        }
    }

    private SourceBindingResponse toResponse(SourceBindingEntity entity) {
        return new SourceBindingResponse(
                entity.getId(), entity.getClanId(), entity.getSourceId(), entity.getTargetType(), entity.getTargetId(),
                entity.getBindingReason(), entity.getExcerpt(), entity.getConfidenceLevel(), entity.getBindingStatus(),
                entity.getCreatedBy(), entity.getCreatedAt(), entity.getUpdatedAt()
        );
    }
}
