package com.genealogy.review.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.generation.repository.GenWordRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.dto.ReviewSubmitRequest;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClanReviewWorkflowTest {

    @Mock private PersonRepository personRepository;
    @Mock private RelationshipRepository relationshipRepository;
    @Mock private SourceRepository sourceRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private ClanRepository clanRepository;
    @Mock private GenSchemeRepository genSchemeRepository;
    @Mock private GenWordRepository genWordRepository;
    @Mock private AuditRecordRepository auditRecordRepository;
    @Mock private CheckTaskRepository checkTaskRepository;
    @Mock private OperationLogApplicationService operationLogApplicationService;
    @Mock private AuthorizationApplicationService authorizationApplicationService;
    @Mock private RevisionApplyService revisionApplyService;
    @Mock private ImportJobRepository importJobRepository;
    @Mock private ImportJobRowRepository importJobRowRepository;

    @Test
    void submitsDraftClanThroughGenericReviewEndpoint() {
        ApprovalApplicationService service = new ApprovalApplicationService(
                personRepository, relationshipRepository, sourceRepository, branchRepository,
                genSchemeRepository, genWordRepository, auditRecordRepository, checkTaskRepository,
                operationLogApplicationService, authorizationApplicationService, revisionApplyService,
                new ObjectMapper()
        );
        service.setClanRepository(clanRepository);

        ClanEntity clan = clan(8L, "draft");
        when(clanRepository.findById(8L)).thenReturn(Optional.of(clan));
        when(auditRecordRepository.existsByTargetTypeAndTargetIdAndStatus("clan", 8L, "pending")).thenReturn(false);
        when(auditRecordRepository.save(any(AuditRecordEntity.class))).thenAnswer(invocation -> {
            AuditRecordEntity record = invocation.getArgument(0);
            record.setId(101L);
            record.setTraceId(UUID.randomUUID());
            return record;
        });
        when(checkTaskRepository.save(any(CheckTaskEntity.class))).thenAnswer(invocation -> {
            CheckTaskEntity task = invocation.getArgument(0);
            task.setId(202L);
            return task;
        });

        CheckTaskResponse response = service.submitGeneric(
                8L, new ReviewSubmitRequest("clan", 8L, null, "提交宗族审核"), 7L
        );

        assertEquals("pending_review", clan.getStatus());
        assertEquals("clan", response.targetType());
        assertEquals(8L, response.targetId());
        verify(authorizationApplicationService).requirePermission(8L, 7L, "clan:update");
        verify(clanRepository).save(clan);
    }

    @Test
    void appliesAndRejectsClanReviewState() {
        RevisionApplyService service = new RevisionApplyService(
                personRepository, relationshipRepository, sourceRepository, branchRepository,
                genSchemeRepository, importJobRepository, importJobRowRepository, new ObjectMapper()
        );
        service.setClanRepository(clanRepository);
        ClanEntity clan = clan(8L, "pending_review");
        when(clanRepository.findById(8L)).thenReturn(Optional.of(clan));

        AuditRecordEntity record = new AuditRecordEntity();
        record.setClanId(8L);
        record.setTargetType("clan");
        record.setTargetId(8L);

        service.apply(record, LocalDateTime.now());
        assertEquals("official", clan.getStatus());

        clan.setStatus("pending_review");
        service.reject(record, LocalDateTime.now());
        assertEquals("rejected", clan.getStatus());
    }

    private ClanEntity clan(Long id, String status) {
        ClanEntity clan = new ClanEntity();
        clan.setId(id);
        clan.setClanName("江夏堂黄氏宗族");
        clan.setSurname("黄");
        clan.setStatus(status);
        return clan;
    }
}
