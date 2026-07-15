package com.genealogy.culture.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.governance.CultureTargetGovernanceRegistry;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.application.SourceApplicationService;
import com.genealogy.source.application.SourceBindingCommandApplicationService;
import com.genealogy.source.application.SourceBindingReviewApplicationService;
import com.genealogy.source.application.SourceBindingTargetValidationService;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingResponse;
import com.genealogy.source.dto.SourceBindingRevisionResponse;
import com.genealogy.source.dto.SourceBindingRevisionSubmitRequest;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Primary
@Service
public class CultureAwareSourceBindingCommandApplicationService extends SourceBindingCommandApplicationService {

    private final CultureTargetGovernanceRegistry targetRegistry;

    public CultureAwareSourceBindingCommandApplicationService(
            SourceApplicationService sourceApplicationService,
            SourceBindingReviewApplicationService sourceBindingReviewApplicationService,
            SourceBindingTargetValidationService targetValidationService,
            RevisionRepository revisionRepository,
            ObjectMapper objectMapper,
            CultureTargetGovernanceRegistry targetRegistry
    ) {
        super(
                sourceApplicationService,
                sourceBindingReviewApplicationService,
                targetValidationService,
                revisionRepository,
                objectMapper
        );
        this.targetRegistry = targetRegistry;
    }

    @Override
    @Transactional
    public SourceBindingResponse bind(Long clanId, SourceBindingCreateRequest request, Long actorId) {
        if (isGoverned(request)) {
            throw new BusinessException(
                    "CULTURE_SOURCE_BINDING_REVIEW_REQUIRED",
                    "宗族文化对象的来源绑定必须通过审核流程生效"
            );
        }
        return super.bind(clanId, request, actorId);
    }

    @Override
    @Transactional
    public SourceBindingRevisionResponse submitCreate(
            Long clanId,
            SourceBindingRevisionSubmitRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        return super.submitCreate(
                clanId,
                isGoverned(request.binding()) ? sanitize(request) : request,
                actorId,
                requestId,
                clientIp
        );
    }

    @Override
    @Transactional
    public SourceBindingRevisionResponse submitReplace(
            Long bindingId,
            SourceBindingRevisionSubmitRequest request,
            Long actorId,
            String requestId,
            String clientIp
    ) {
        return super.submitReplace(
                bindingId,
                isGoverned(request.binding()) ? sanitize(request) : request,
                actorId,
                requestId,
                clientIp
        );
    }

    private SourceBindingRevisionSubmitRequest sanitize(SourceBindingRevisionSubmitRequest request) {
        SourceBindingCreateRequest binding = request.binding();
        SourceBindingCreateRequest sanitized = new SourceBindingCreateRequest(
                binding.sourceId(),
                targetRegistry.normalizeType(binding.targetType()),
                binding.targetId(),
                binding.bindingReason(),
                null,
                binding.confidenceLevel(),
                binding.submitReview(),
                binding.createdBy()
        );
        return new SourceBindingRevisionSubmitRequest(sanitized, request.changeReason());
    }

    private boolean isGoverned(SourceBindingCreateRequest request) {
        return request != null && targetRegistry.supports(request.targetType());
    }
}
