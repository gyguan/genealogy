package com.genealogy.source.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.dto.ActorContext;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.domain.SourceBindingAccessPolicy;
import com.genealogy.source.domain.SourceBindingTargetType;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingResponse;
import com.genealogy.source.dto.SourceBindingRevisionDeleteRequest;
import com.genealogy.source.dto.SourceBindingRevisionResponse;
import com.genealogy.source.dto.SourceBindingRevisionSubmitRequest;
import com.genealogy.source.dto.SourceBindingReviewDecisionRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
public class SourceBindingCommandApplicationService {

    private static final String TARGET_TYPE_SOURCE_BINDING = "source_binding";
    private static final Set<String> TARGET_VALIDATION_CHANGE_TYPES = Set.of("create", "replace");

    private final SourceApplicationService sourceApplicationService;
    private final SourceBindingReviewApplicationService sourceBindingReviewApplicationService;
    private final SourceBindingTargetValidationService targetValidationService;
    private final RevisionRepository revisionRepository;
    private final ObjectMapper objectMapper;
    private final SourceBindingAccessPolicy accessPolicy = new SourceBindingAccessPolicy();

    public SourceBindingCommandApplicationService(
            SourceApplicationService sourceApplicationService,
            SourceBindingReviewApplicationService sourceBindingReviewApplicationService,
            SourceBindingTargetValidationService targetValidationService,
            RevisionRepository revisionRepository,
            ObjectMapper objectMapper
    ) {
        this.sourceApplicationService = sourceApplicationService;
        this.sourceBindingReviewApplicationService = sourceBindingReviewApplicationService;
        this.targetValidationService = targetValidationService;
        this.revisionRepository = revisionRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SourceBindingResponse bind(Long clanId, SourceBindingCreateRequest request, ActorContext actor) {
        accessPolicy.requireManage(actor, clanId);
        return bind(clanId, request, actor.userId());
    }

    @Transactional
    public SourceBindingResponse bind(Long clanId, SourceBindingCreateRequest request, Long actorId) {
        SourceBindingCreateRequest canonicalRequest = canonicalize(request);
        validateTarget(clanId, canonicalRequest);
        return sourceApplicationService.bind(clanId, canonicalRequest, actorId);
    }

    @Transactional
    public SourceBindingRevisionResponse submitCreate(
            Long clanId,
            SourceBindingRevisionSubmitRequest request,
            ActorContext actor
    ) {
        accessPolicy.requireManage(actor, clanId);
        return submitCreate(clanId, request, actor.userId(), actor.requestId(), actor.clientIp());
    }

    @Transactional
    public SourceBindingRevisionResponse submitCreate(
            Long clanId,
            SourceBindingRevisionSubmitRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        SourceBindingRevisionSubmitRequest canonicalRequest = canonicalize(request);
        SourceBindingRevisionResponse response = sourceBindingReviewApplicationService.submitCreate(
                clanId, canonicalRequest, actorId, requestId, clientIp
        );
        validateTarget(clanId, canonicalRequest.binding());
        return response;
    }

    @Transactional
    public SourceBindingRevisionResponse submitReplace(
            Long bindingId,
            SourceBindingRevisionSubmitRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        SourceBindingRevisionSubmitRequest canonicalRequest = canonicalize(request);
        SourceBindingRevisionResponse response = sourceBindingReviewApplicationService.submitReplace(
                bindingId, canonicalRequest, actorId, requestId, clientIp
        );
        validateTarget(response.clanId(), canonicalRequest.binding());
        return response;
    }

    @Transactional
    public SourceBindingRevisionResponse submitDelete(
            Long bindingId,
            SourceBindingRevisionDeleteRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        return sourceBindingReviewApplicationService.submitDelete(bindingId, request, actorId, requestId, clientIp);
    }

    @Transactional
    public SourceBindingRevisionResponse approve(
            Long revisionId,
            SourceBindingReviewDecisionRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        validateRevisionTarget(revisionId);
        return sourceBindingReviewApplicationService.approve(
                revisionId, request, actorId, requestId, clientIp
        );
    }

    @Transactional
    public SourceBindingRevisionResponse reject(
            Long revisionId,
            SourceBindingReviewDecisionRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        return sourceBindingReviewApplicationService.reject(revisionId, request, actorId, requestId, clientIp);
    }

    private SourceBindingRevisionSubmitRequest canonicalize(SourceBindingRevisionSubmitRequest request) {
        if (request == null) {
            throw new BusinessException("SOURCE_BINDING_REQUEST_INVALID", "来源绑定请求不能为空");
        }
        return new SourceBindingRevisionSubmitRequest(canonicalize(request.binding()), request.changeReason());
    }

    private SourceBindingCreateRequest canonicalize(SourceBindingCreateRequest request) {
        if (request == null) {
            throw new BusinessException("SOURCE_BINDING_REQUEST_INVALID", "来源绑定请求不能为空");
        }
        SourceBindingTargetType targetType = SourceBindingTargetType.fromApi(request.targetType());
        return new SourceBindingCreateRequest(
                request.sourceId(),
                targetType.apiValue(),
                request.targetId(),
                request.bindingReason(),
                request.excerpt(),
                request.confidenceLevel(),
                request.submitReview(),
                request.createdBy()
        );
    }

    private void validateTarget(Long clanId, SourceBindingCreateRequest request) {
        if (request == null) {
            throw new BusinessException("SOURCE_BINDING_REQUEST_INVALID", "来源绑定请求不能为空");
        }
        SourceBindingTargetType targetType = SourceBindingTargetType.fromApi(request.targetType());
        targetValidationService.validate(clanId, targetType.apiValue(), request.targetId());
    }

    private void validateRevisionTarget(Long revisionId) {
        RevisionEntity revision = revisionRepository.findByIdAndTargetType(revisionId, TARGET_TYPE_SOURCE_BINDING)
                .orElseThrow(() -> new BusinessException("SOURCE_BINDING_REVISION_NOT_FOUND", "来源绑定变更不存在"));
        if (!TARGET_VALIDATION_CHANGE_TYPES.contains(revision.getChangeType())) {
            return;
        }
        if (revision.getAfterData() == null || revision.getAfterData().isBlank()) {
            throw new BusinessException("SOURCE_BINDING_REVISION_DATA_INVALID", "来源绑定变更数据不完整");
        }
        try {
            JsonNode data = objectMapper.readTree(revision.getAfterData());
            SourceBindingTargetType targetType = SourceBindingTargetType.fromApi(data.path("targetType").asText(null));
            Long targetId = data.hasNonNull("targetId") ? data.get("targetId").longValue() : null;
            targetValidationService.validate(revision.getClanId(), targetType.apiValue(), targetId);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("SOURCE_BINDING_REVISION_DATA_INVALID", "来源绑定变更数据无法解析");
        }
    }
}
