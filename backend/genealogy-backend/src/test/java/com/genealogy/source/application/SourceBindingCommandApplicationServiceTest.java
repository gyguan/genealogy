package com.genealogy.source.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingRevisionResponse;
import com.genealogy.source.dto.SourceBindingRevisionSubmitRequest;
import com.genealogy.source.dto.SourceBindingReviewDecisionRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SourceBindingCommandApplicationServiceTest {

    @Mock
    private SourceApplicationService sourceApplicationService;

    @Mock
    private SourceBindingReviewApplicationService sourceBindingReviewApplicationService;

    @Mock
    private SourceBindingTargetValidationService targetValidationService;

    @Mock
    private RevisionRepository revisionRepository;

    private SourceBindingCommandApplicationService service;

    @BeforeEach
    void setUp() {
        service = new SourceBindingCommandApplicationService(
                sourceApplicationService,
                sourceBindingReviewApplicationService,
                targetValidationService,
                revisionRepository,
                new ObjectMapper()
        );
    }

    @Test
    void bindShouldValidateTargetInsideCommandTransaction() {
        SourceBindingCreateRequest request = generationWordRequest();

        service.bind(1L, request, 2L);

        InOrder order = inOrder(targetValidationService, sourceApplicationService);
        order.verify(targetValidationService).validate(1L, "generation_word", 100L);
        order.verify(sourceApplicationService).bind(1L, request, 2L);
    }

    @Test
    void submitCreateShouldValidateTargetAfterOriginalWorkflowChecks() {
        SourceBindingCreateRequest binding = generationWordRequest();
        SourceBindingRevisionSubmitRequest request = new SourceBindingRevisionSubmitRequest(binding, "新增字辈来源");

        service.submitCreate(1L, request, 2L, "req-1", "127.0.0.1");

        InOrder order = inOrder(sourceBindingReviewApplicationService, targetValidationService);
        order.verify(sourceBindingReviewApplicationService).submitCreate(1L, request, 2L, "req-1", "127.0.0.1");
        order.verify(targetValidationService).validate(1L, "generation_word", 100L);
    }

    @Test
    void submitReplaceShouldUseClanResolvedByReviewWorkflow() {
        SourceBindingCreateRequest binding = generationWordRequest();
        SourceBindingRevisionSubmitRequest request = new SourceBindingRevisionSubmitRequest(binding, "替换字辈来源");
        SourceBindingRevisionResponse response = revisionResponse(9L, 1L, "replace");
        when(sourceBindingReviewApplicationService.submitReplace(8L, request, 2L, "req-2", "127.0.0.1"))
                .thenReturn(response);

        service.submitReplace(8L, request, 2L, "req-2", "127.0.0.1");

        verify(targetValidationService).validate(1L, "generation_word", 100L);
    }

    @Test
    void approveShouldRevalidateTargetFromRevisionSnapshot() {
        SourceBindingReviewDecisionRequest request = new SourceBindingReviewDecisionRequest("同意");
        RevisionEntity revision = new RevisionEntity();
        revision.setId(9L);
        revision.setClanId(1L);
        revision.setTargetType("source_binding");
        revision.setChangeType("create");
        revision.setAfterData("{\"targetType\":\"generation_word\",\"targetId\":100}");
        when(sourceBindingReviewApplicationService.approve(9L, request, 3L, "req-3", "127.0.0.1"))
                .thenReturn(revisionResponse(9L, 1L, "create"));
        when(revisionRepository.findByIdAndTargetType(9L, "source_binding"))
                .thenReturn(Optional.of(revision));

        service.approve(9L, request, 3L, "req-3", "127.0.0.1");

        InOrder order = inOrder(targetValidationService, sourceBindingReviewApplicationService);
        order.verify(targetValidationService).validate(1L, "generation_word", 100L);
        order.verify(sourceBindingReviewApplicationService).approve(9L, request, 3L, "req-3", "127.0.0.1");
    }

    @Test
    void approveDeleteShouldSkipTargetValidation() {
        SourceBindingReviewDecisionRequest request = new SourceBindingReviewDecisionRequest("同意删除");
        RevisionEntity revision = new RevisionEntity();
        revision.setId(9L);
        revision.setClanId(1L);
        revision.setTargetType("source_binding");
        revision.setChangeType("delete");
        when(sourceBindingReviewApplicationService.approve(9L, request, 3L, "req-4", "127.0.0.1"))
                .thenReturn(revisionResponse(9L, 1L, "delete"));
        when(revisionRepository.findByIdAndTargetType(9L, "source_binding"))
                .thenReturn(Optional.of(revision));

        service.approve(9L, request, 3L, "req-4", "127.0.0.1");

        verify(targetValidationService, never()).validate(1L, "generation_word", 100L);
    }

    private SourceBindingCreateRequest generationWordRequest() {
        return new SourceBindingCreateRequest(10L, "generation_word", 100L, "reason", "excerpt", 2L);
    }

    private SourceBindingRevisionResponse revisionResponse(Long revisionId, Long clanId, String changeType) {
        return new SourceBindingRevisionResponse(
                revisionId,
                20L,
                clanId,
                8L,
                changeType,
                "pending",
                "summary",
                2L,
                null,
                null,
                null
        );
    }
}
