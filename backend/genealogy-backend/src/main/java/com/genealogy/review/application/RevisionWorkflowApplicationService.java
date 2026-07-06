package com.genealogy.review.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class RevisionWorkflowApplicationService {

    public static final String STATUS_PENDING = "pending";
    public static final String CHANGE_PERSON_CREATE = "person_create";
    public static final String CHANGE_PERSON_UPDATE = "person_update";
    public static final String CHANGE_PERSON_DELETE = "person_delete";
    public static final String CHANGE_IMPORT_PERSON = "import_person";
    public static final String CHANGE_MERGE_PERSON = "merge_person";

    private final AuditRecordRepository auditRecordRepository;
    private final CheckTaskRepository checkTaskRepository;
    private final OperationLogApplicationService operationLogApplicationService;
    private final ObjectMapper objectMapper;

    public RevisionWorkflowApplicationService(
            AuditRecordRepository auditRecordRepository,
            CheckTaskRepository checkTaskRepository,
            OperationLogApplicationService operationLogApplicationService,
            ObjectMapper objectMapper
    ) {
        this.auditRecordRepository = auditRecordRepository;
        this.checkTaskRepository = checkTaskRepository;
        this.operationLogApplicationService = operationLogApplicationService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CheckTaskResponse submitRevision(
            Long clanId,
            String targetType,
            Long targetId,
            Long branchId,
            Long submitterId,
            String changeType,
            Object beforeSnapshot,
            Object afterSnapshot,
            String diffSummary,
            String logSummary
    ) {
        if (auditRecordRepository.existsByTargetTypeAndTargetIdAndStatus(targetType, targetId, STATUS_PENDING)) {
            throw new BusinessException("REVIEW_ALREADY_PENDING", "target already has pending review task");
        }
        LocalDateTime now = LocalDateTime.now();
        AuditRecordEntity record = new AuditRecordEntity();
        record.setClanId(clanId);
        record.setTargetType(targetType);
        record.setTargetId(targetId);
        record.setChangeType(changeType);
        record.setOldPayload(toJson(beforeSnapshot));
        record.setNewPayload(toJson(afterSnapshot));
        record.setDiffSummary(trimToNull(diffSummary));
        record.setSubmitterId(submitterId);
        record.setSubmitTime(now);
        record.setStatus(STATUS_PENDING);
        AuditRecordEntity savedRecord = auditRecordRepository.save(record);

        CheckTaskEntity task = new CheckTaskEntity();
        task.setClanId(clanId);
        task.setRevisionId(savedRecord.getId());
        task.setReviewLevel(1);
        task.setReviewerRole("clan_admin");
        task.setBranchId(branchId);
        task.setStatus(STATUS_PENDING);
        task.setCreatedAt(now);
        CheckTaskEntity savedTask = checkTaskRepository.save(task);

        operationLogApplicationService.record(clanId, submitterId, "revision_submit", targetType, targetId, logSummary, diffSummary);
        return toTaskResponse(savedTask);
    }

    private CheckTaskResponse toTaskResponse(CheckTaskEntity task) {
        return new CheckTaskResponse(
                task.getId(), task.getClanId(), task.getRevisionId(), task.getReviewLevel(), task.getReviewerId(),
                task.getReviewerRole(), task.getBranchId(), task.getStatus(), task.getReviewComment(), task.getReviewedAt(), task.getCreatedAt()
        );
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            try {
                return objectMapper.writeValueAsString(Map.of("snapshotError", ex.getMessage()));
            } catch (JsonProcessingException ignored) {
                return "{}";
            }
        }
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
