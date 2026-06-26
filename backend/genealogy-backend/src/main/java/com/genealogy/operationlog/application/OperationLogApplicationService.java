package com.genealogy.operationlog.application;

import com.genealogy.common.api.PageResponse;
import com.genealogy.operationlog.dto.OperationLogResponse;
import com.genealogy.operationlog.entity.OperationLogEntity;
import com.genealogy.operationlog.repository.OperationLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class OperationLogApplicationService {

    private final OperationLogRepository operationLogRepository;

    public OperationLogApplicationService(OperationLogRepository operationLogRepository) {
        this.operationLogRepository = operationLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long clanId, Long actorId, String actionType, String targetType, Long targetId, String summary, String detail) {
        OperationLogEntity entity = new OperationLogEntity();
        entity.setClanId(clanId);
        entity.setActorId(actorId);
        entity.setActionType(actionType);
        entity.setTargetType(targetType);
        entity.setTargetId(targetId);
        entity.setSummary(trim(summary, 500));
        entity.setDetail(detail);
        entity.setCreatedAt(LocalDateTime.now());
        operationLogRepository.save(entity);
    }

    @Transactional(readOnly = true)
    public PageResponse<OperationLogResponse> list(Long clanId, String targetType, Long targetId, int pageNo, int pageSize) {
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<OperationLogEntity> page;
        if (targetType != null && !targetType.isBlank() && targetId != null) {
            page = operationLogRepository.findByTargetTypeAndTargetId(targetType.trim().toLowerCase(), targetId, pageRequest);
        } else if (clanId != null) {
            page = operationLogRepository.findByClanId(clanId, pageRequest);
        } else {
            page = operationLogRepository.findAll(pageRequest);
        }
        return PageResponse.of(page.map(this::toResponse).getContent(), page.getTotalElements(), pageNo, pageSize);
    }

    private OperationLogResponse toResponse(OperationLogEntity entity) {
        return new OperationLogResponse(
                entity.getId(),
                entity.getClanId(),
                entity.getActorId(),
                entity.getActionType(),
                entity.getTargetType(),
                entity.getTargetId(),
                entity.getSummary(),
                entity.getDetail(),
                entity.getRequestId(),
                entity.getClientIp(),
                entity.getCreatedAt()
        );
    }

    private String trim(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, maxLength);
    }
}
