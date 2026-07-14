package com.genealogy.culture.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.application.SourceApplicationService;
import com.genealogy.source.application.SourceBindingCommandApplicationService;
import com.genealogy.source.application.SourceBindingReviewApplicationService;
import com.genealogy.source.application.SourceBindingTargetValidationService;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingResponse;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Primary
@Service
public class CultureAwareSourceBindingCommandApplicationService extends SourceBindingCommandApplicationService {

    public CultureAwareSourceBindingCommandApplicationService(
            SourceApplicationService sourceApplicationService,
            SourceBindingReviewApplicationService sourceBindingReviewApplicationService,
            SourceBindingTargetValidationService targetValidationService,
            RevisionRepository revisionRepository,
            ObjectMapper objectMapper
    ) {
        super(
                sourceApplicationService,
                sourceBindingReviewApplicationService,
                targetValidationService,
                revisionRepository,
                objectMapper
        );
    }

    @Override
    @Transactional
    public SourceBindingResponse bind(Long clanId, SourceBindingCreateRequest request, Long actorId) {
        if (request != null && CultureItemGovernanceApplicationService.TARGET_TYPE.equals(normalize(request.targetType()))) {
            throw new BusinessException(
                    "CULTURE_SOURCE_BINDING_REVIEW_REQUIRED",
                    "文化资料来源绑定必须通过审核流程生效"
            );
        }
        return super.bind(clanId, request, actorId);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
