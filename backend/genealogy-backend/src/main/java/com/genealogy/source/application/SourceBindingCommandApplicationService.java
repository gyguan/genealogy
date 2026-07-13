package com.genealogy.source.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.RevisionRepository;
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
    public SourceBindingResponse bind(Long clanId, SourceBindingCreateRequest request, Long actorId) {
        SourceBindingResponse response = sourceApplicationService.bind(clanId, request, actorId);
        validateTarget(clanId, request);
        return response;
    }

    @Transactional
    public SourceBindingRevisionResponse submitCreate(
            Long clanId,
            SourceBindingRevisionSubmitRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        SourceBindingRevisionResponse response = sourceBindingReviewApplicationService.submitCreate(
                clanId, request, actorId, requestId, clientIp
        );
        validateTarget(clanId, request.binding());
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
        SourceBindingRevisionResponse response = sourceBindingReviewApplicationService.submitReplace(
                bindingId, request, actorId, requestId, clientIp
        );
        validateTarget(response.clanId(), request.binding());
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
        SourceBindingRevisionResponse response = sourceBindingReviewApplicationService.approve(
                revisionId, request, actorId, requestId, clientIp
        );
        validateRevisionTarget(revisionId);
        return response;
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

    private void validateTarget(Long clanId, SourceBindingCreateRequest request) {
        if (request == null) {
            throw new BusinessException("SOURCE_BINDING_REQUEST_INVALID", "来源绑定请求不能为空");
        }
        targetValidationService.validate(clanId, request.targetType(), request.targetId());
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
            String targetType = data.path("targetType").asText(null);
            Long targetId = data.hasNonNull("targetId") ? data.get("targetId").longValue() : null;
            targetValidationService.validate(revision.getClanId(), targetType, targetId);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("SOURCE_BINDING_REVISION_DATA_INVALID", "来源绑定变更数据无法解析");
        }
    }
}
