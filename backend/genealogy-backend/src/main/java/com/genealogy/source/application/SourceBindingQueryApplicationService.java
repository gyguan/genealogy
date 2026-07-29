package com.genealogy.source.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.source.domain.SourceBindingTargetType;
import com.genealogy.source.dto.SourceBindingResponse;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SourceBindingQueryApplicationService {

    private static final String SOURCE_VIEW = "source:view";

    private final SourceBindingRepository sourceBindingRepository;
    private final AuthorizationApplicationService authorizationApplicationService;

    public SourceBindingQueryApplicationService(
            SourceBindingRepository sourceBindingRepository,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.sourceBindingRepository = sourceBindingRepository;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Transactional(readOnly = true)
    public List<SourceBindingResponse> listByTarget(SourceBindingTargetType targetType, Long targetId, Long actorId) {
        return sourceBindingRepository
                .findByTargetTypeAndTargetIdOrderByCreatedAtDesc(targetType.apiValue(), targetId)
                .stream()
                .filter(binding -> canView(binding, actorId))
                .map(this::toResponse)
                .toList();
    }

    public List<SourceBindingResponse> listByTarget(String targetType, Long targetId, Long actorId) {
        return listByTarget(SourceBindingTargetType.fromApi(targetType), targetId, actorId);
    }

    private boolean canView(SourceBindingEntity binding, Long actorId) {
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
