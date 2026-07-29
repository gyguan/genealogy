package com.genealogy.review.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.quality.domain.GenealogyQualityRuleService;
import com.genealogy.review.dto.ReviewQualityCheckAcceptedResponse;
import com.genealogy.review.dto.ReviewQualityCheckTriggerRequest;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.entity.ReviewQualityCheckEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.review.repository.ReviewQualityCheckRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ReviewQualityCheckApplicationServiceTest {

    private ReviewQualityCheckRepository qualityCheckRepository;
    private CheckTaskRepository checkTaskRepository;
    private AuditRecordRepository auditRecordRepository;
    private ReviewQualityCheckApplicationService service;

    @BeforeEach
    void setUp() {
        qualityCheckRepository = mock(ReviewQualityCheckRepository.class);
        checkTaskRepository = mock(CheckTaskRepository.class);
        auditRecordRepository = mock(AuditRecordRepository.class);
        AuthorizationApplicationService authorization = mock(AuthorizationApplicationService.class);
        OperationLogApplicationService operationLog = mock(OperationLogApplicationService.class);
        GenealogyQualityRuleService rules = mock(GenealogyQualityRuleService.class);
        ObjectMapper objectMapper = new ObjectMapper();
        when(rules.highestRisk(anyList())).thenReturn("high");
        when(qualityCheckRepository.save(any(ReviewQualityCheckEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(qualityCheckRepository.existsByClanIdAndScopeFingerprintAndStatusIn(
                anyLong(),
                anyString(),
                anyCollection()
        )).thenReturn(false);
        service = new ReviewQualityCheckApplicationService(
                qualityCheckRepository,
                checkTaskRepository,
                auditRecordRepository,
                authorization,
                operationLog,
                objectMapper,
                new ReviewQualityCheckExecutor(objectMapper, rules),
                new ReviewQualityCheckStateMachine(),
                new ReviewQualityCheckAfterCommitActions(operationLog)
        );
    }

    @Test
    void detectsBlockingRelationshipConflictAndPersistsResult() {
        CheckTaskEntity task = pendingTask(11L, 7L, 101L);
        AuditRecordEntity revision = new AuditRecordEntity();
        revision.setId(101L);
        revision.setClanId(7L);
        revision.setTargetType("relationship");
        revision.setTargetId(88L);
        revision.setNewPayload("{\"fromPersonId\":9,\"toPersonId\":9}");

        when(checkTaskRepository.findAllById(List.of(11L))).thenReturn(List.of(task));
        when(auditRecordRepository.findAllById(List.of(101L))).thenReturn(List.of(revision));

        ReviewQualityCheckAcceptedResponse accepted = service.trigger(
                7L,
                new ReviewQualityCheckTriggerRequest("TASK_IDS", "REVIEW_GATE", List.of(11L), null, null),
                3L
        );

        assertEquals("ISSUES_FOUND", accepted.status());
    }

    @Test
    void rejectsNonPendingTaskBeforeExecution() {
        CheckTaskEntity task = pendingTask(12L, 7L, 102L);
        task.setStatus("approved");
        when(checkTaskRepository.findAllById(List.of(12L))).thenReturn(List.of(task));

        BusinessException exception = assertThrows(BusinessException.class, () -> service.trigger(
                7L,
                new ReviewQualityCheckTriggerRequest("TASK_IDS", "FULL", List.of(12L), null, null),
                3L
        ));

        assertEquals("REVIEW_QUALITY_TASK_STATE_CONFLICT", exception.getCode());
    }

    @Test
    void rejectsNullRequestExplicitly() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.trigger(7L, null, 3L)
        );
        assertEquals("REVIEW_QUALITY_REQUEST_REQUIRED", exception.getCode());
    }

    private CheckTaskEntity pendingTask(Long id, Long clanId, Long revisionId) {
        CheckTaskEntity task = new CheckTaskEntity();
        task.setId(id);
        task.setClanId(clanId);
        task.setRevisionId(revisionId);
        task.setStatus("pending");
        task.setCreatedAt(LocalDateTime.now());
        return task;
    }
}
