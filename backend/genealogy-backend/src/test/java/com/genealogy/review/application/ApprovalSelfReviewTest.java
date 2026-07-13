package com.genealogy.review.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.generation.repository.GenWordRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.dto.ReviewDecisionRequest;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApprovalSelfReviewTest {

    @Mock private PersonRepository personRepository;
    @Mock private RelationshipRepository relationshipRepository;
    @Mock private SourceRepository sourceRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private GenSchemeRepository genSchemeRepository;
    @Mock private GenWordRepository genWordRepository;
    @Mock private AuditRecordRepository auditRecordRepository;
    @Mock private CheckTaskRepository checkTaskRepository;
    @Mock private OperationLogApplicationService operationLogApplicationService;
    @Mock private AuthorizationApplicationService authorizationApplicationService;
    @Mock private RevisionApplyService revisionApplyService;

    private ApprovalApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ApprovalApplicationService(
                personRepository,
                relationshipRepository,
                sourceRepository,
                branchRepository,
                genSchemeRepository,
                genWordRepository,
                auditRecordRepository,
                checkTaskRepository,
                operationLogApplicationService,
                authorizationApplicationService,
                revisionApplyService,
                new ObjectMapper()
        );
    }

    @Test
    void submitterShouldNotApproveOwnReviewTask() {
        CheckTaskEntity task = new CheckTaskEntity();
        task.setId(401L);
        task.setRevisionId(301L);
        task.setStatus("pending");
        AuditRecordEntity record = new AuditRecordEntity();
        record.setId(301L);
        record.setClanId(1L);
        record.setTargetType("import_job");
        record.setTargetId(101L);
        record.setSubmitterId(9L);
        record.setStatus("pending");
        when(checkTaskRepository.findById(401L)).thenReturn(Optional.of(task));
        when(auditRecordRepository.findById(301L)).thenReturn(Optional.of(record));

        assertThatThrownBy(() -> service.approve(401L, new ReviewDecisionRequest(9L, "同意")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("审核员不能审核自己提交的变更");

        verify(revisionApplyService, never()).apply(any(), any());
        verify(checkTaskRepository, never()).save(any(CheckTaskEntity.class));
        verify(auditRecordRepository, never()).save(any(AuditRecordEntity.class));
    }
}
