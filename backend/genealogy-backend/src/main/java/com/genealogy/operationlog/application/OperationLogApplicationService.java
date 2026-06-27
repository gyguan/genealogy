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
        record(clanId, actorId, actionType, targetType, targetId, summary, detail, null, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long clanId, Long actorId, String actionType, String targetType, Long targetId, String summary, String detail, String requestId, String clientIp) {
        try {
            OperationLogEntity entity = new OperationLogEntity();
            entity.setClanId(clanId);
            entity.setActorId(actorId);
            entity.setActionType(normalize(actionType));
            entity.setTargetType(normalize(targetType));
            entity.setTargetId(targetId);
            entity.setSummary(trim(summary, 500));
            entity.setDetail(detail);
            entity.setRequestId(trim(requestId, 128));
            entity.setClientIp(trim(clientIp, 64));
            entity.setCreatedAt(LocalDateTime.now());
            operationLogRepository.save(entity);
        } catch (Exception ignored) {
            // 审计日志失败不能阻塞主业务链路。
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<OperationLogResponse> list(Long clanId, String targetType, Long targetId, int pageNo, int pageSize) {
        return search(clanId, null, null, targetType, targetId, null, null, null, pageNo, pageSize);
    }

    @Transactional(readOnly = true)
    public PageResponse<OperationLogResponse> search(
            Long clanId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String keyword,
            int pageNo,
            int pageSize
    ) {
        PageRequest pageRequest = PageRequest.of(pageNo - 1, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<OperationLogEntity> page = operationLogRepository.search(
                clanId,
                actorId,
                normalize(actionType),
                normalize(targetType),
                targetId,
                startTime,
                endTime,
                trimToNull(keyword),
                pageRequest
        );
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

    private String normalize(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toLowerCase();
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
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
