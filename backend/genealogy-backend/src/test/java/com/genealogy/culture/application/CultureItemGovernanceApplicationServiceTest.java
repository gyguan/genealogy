package com.genealogy.culture.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CulturePermissionPolicyService;
import com.genealogy.culture.dto.CultureItemUpdateRequest;
import com.genealogy.culture.dto.CultureSubmitReviewRequest;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.entity.CultureRevisionPayloadEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.culture.repository.CultureRevisionPayloadRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.entity.SourceBindingEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CultureItemGovernanceApplicationServiceTest {

    @Mock private CultureItemRepository cultureItemRepository;
    @Mock private CultureRevisionPayloadRepository payloadRepository;
    @Mock private RevisionRepository revisionRepository;
    @Mock private ReviewTaskRepository reviewTaskRepository;
    @Mock private SourceBindingRepository sourceBindingRepository;
    @Mock private CulturePermissionPolicyService permissionPolicyService;
    @Mock private OperationLogApplicationService operationLogApplicationService;

    private CultureItemGovernanceApplicationService service;

    @BeforeEach
    void setUp() {
        service = new CultureItemGovernanceApplicationService(
                cultureItemRepository,
                payloadRepository,
                revisionRepository,
                reviewTaskRepository,
                sourceBindingRepository,
                permissionPolicyService,
                operationLogApplicationService,
                new ObjectMapper()
        );
        when(revisionRepository.save(any())).thenAnswer(invocation -> {
            RevisionEntity revision = invocation.getArgument(0);
            revision.setId(20L);
            return revision;
        });
        when(reviewTaskRepository.save(any())).thenAnswer(invocation -> {
            ReviewTaskEntity task = invocation.getArgument(0);
            task.setId(30L);
            return task;
        });
    }

    @Test
    void draftRequiresSourceBeforeReviewSubmission() {
        CultureItemEntity item = item("draft");
        when(cultureItemRepository.findByIdAndDeletedAtIsNull(10L)).thenReturn(Optional.of(item));
        when(sourceBindingRepository.findTop10ByClanIdAndTargetTypeAndTargetIdAndBindingStatusNotOrderByCreatedAtDesc(
                1L, "culture_item", 10L, "archived")).thenReturn(List.of());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.submitReview(10L, new CultureSubmitReviewRequest(null), 7L, "req", "127.0.0.1")
        );

        assertEquals("CULTURE_SOURCE_REQUIRED", exception.getCode());
    }

    @Test
    void draftSubmissionCreatesStandardRevisionWithoutFullContent() {
        CultureItemEntity item = item("draft");
        item.setContent("SEALED FAMILY CONTENT");
        when(cultureItemRepository.findByIdAndDeletedAtIsNull(10L)).thenReturn(Optional.of(item));
        when(sourceBindingRepository.findTop10ByClanIdAndTargetTypeAndTargetIdAndBindingStatusNotOrderByCreatedAtDesc(
                1L, "culture_item", 10L, "archived")).thenReturn(List.of(new SourceBindingEntity()));
        when(cultureItemRepository.save(item)).thenReturn(item);

        service.submitReview(10L, new CultureSubmitReviewRequest("提交审核"), 7L, "req", "127.0.0.1");

        ArgumentCaptor<RevisionEntity> revision = ArgumentCaptor.forClass(RevisionEntity.class);
        verify(revisionRepository).save(revision.capture());
        assertEquals("pending_review", item.getDataStatus());
        assertEquals("culture_item", revision.getValue().getTargetType());
        assertEquals("culture_publish", revision.getValue().getChangeType());
        assertFalse(revision.getValue().getAfterData().contains("SEALED FAMILY CONTENT"));
        assertTrue(revision.getValue().getAfterData().contains("contentLength"));
    }

    @Test
    void officialUpdateSeparatesSensitivePayloadFromRevisionDiff() {
        CultureItemEntity item = item("official");
        CultureItemUpdateRequest request = new CultureItemUpdateRequest(
                5L, "hall_name", "敦本堂新考", "摘要", "PRIVATE UPDATED CONTENT",
                "清代", "长沙", "high", "private", "sensitive", true, 1, 4L
        );
        when(revisionRepository.existsByTargetTypeAndTargetIdAndStatus("culture_item", 10L, "pending"))
                .thenReturn(false);

        service.submitOfficialUpdate(item, request, 7L, "req", "127.0.0.1");

        ArgumentCaptor<RevisionEntity> revision = ArgumentCaptor.forClass(RevisionEntity.class);
        ArgumentCaptor<CultureRevisionPayloadEntity> payload = ArgumentCaptor.forClass(CultureRevisionPayloadEntity.class);
        verify(revisionRepository).save(revision.capture());
        verify(payloadRepository).save(payload.capture());
        assertFalse(revision.getValue().getAfterData().contains("PRIVATE UPDATED CONTENT"));
        assertTrue(payload.getValue().getPayloadJson().contains("PRIVATE UPDATED CONTENT"));
        assertEquals(20L, payload.getValue().getRevisionId());
    }

    private CultureItemEntity item(String status) {
        CultureItemEntity item = new CultureItemEntity();
        item.setId(10L);
        item.setClanId(1L);
        item.setBranchId(5L);
        item.setCategory("hall_name");
        item.setTitle("敦本堂");
        item.setConfidenceLevel("high");
        item.setPrivacyLevel("clan_only");
        item.setSensitiveLevel("normal");
        item.setDataStatus(status);
        item.setSortOrder(0);
        item.setVersion(4L);
        return item;
    }
}
