package com.genealogy.culture.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.culture.domain.CulturePermissionPolicyService;
import com.genealogy.culture.domain.MigrationEventPermissionPolicyService;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.culture.repository.MigrationEventRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.operationlog.application.OperationTraceContext;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.entity.RevisionEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.dto.SourceBindingCreateRequest;
import com.genealogy.source.dto.SourceBindingRevisionSubmitRequest;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CultureAwareSourceBindingReviewApplicationServiceTest {

    @Mock private SourceRepository sourceRepository;
    @Mock private SourceBindingRepository sourceBindingRepository;
    @Mock private RevisionRepository revisionRepository;
    @Mock private ReviewTaskRepository reviewTaskRepository;
    @Mock private ClanRepository clanRepository;
    @Mock private OperationLogApplicationService operationLogApplicationService;
    @Mock private AuthorizationApplicationService authorizationApplicationService;
    @Mock private CultureItemRepository cultureItemRepository;
    @Mock private CulturePermissionPolicyService culturePermissionPolicyService;
    @Mock private MigrationEventRepository migrationEventRepository;
    @Mock private MigrationEventPermissionPolicyService migrationEventPermissionPolicyService;

    private CultureAwareSourceBindingReviewApplicationService service;

    @BeforeEach
    void setUp() {
        service = new CultureAwareSourceBindingReviewApplicationService(
                sourceRepository,
                sourceBindingRepository,
                revisionRepository,
                reviewTaskRepository,
                clanRepository,
                operationLogApplicationService,
                authorizationApplicationService,
                new ObjectMapper(),
                cultureItemRepository,
                culturePermissionPolicyService,
                migrationEventRepository,
                migrationEventPermissionPolicyService
        );
    }

    @Test
    void submitCultureCreateShouldTraceTheCultureItemInsteadOfTheSourceBindingPlaceholder() {
        CultureItemEntity item = new CultureItemEntity();
        item.setId(100L);
        item.setClanId(1L);
        item.setBranchId(9L);
        item.setDataStatus("draft");

        SourceEntity source = new SourceEntity();
        source.setId(10L);
        source.setClanId(1L);
        source.setVerificationStatus("official");
        source.setConfidenceLevel("high");

        AtomicReference<RevisionEntity> revisionRef = new AtomicReference<>();
        when(clanRepository.existsById(1L)).thenReturn(true);
        when(cultureItemRepository.findByIdAndDeletedAtIsNull(100L)).thenReturn(Optional.of(item));
        when(sourceRepository.findById(10L)).thenReturn(Optional.of(source));
        when(sourceBindingRepository.existsBySourceIdAndTargetTypeAndTargetIdAndBindingStatusNot(
                10L, "culture_item", 100L, "archived")).thenReturn(false);
        when(revisionRepository.existsByTargetTypeAndTargetIdAndStatus("source_binding", 10L, "pending"))
                .thenReturn(false);
        when(revisionRepository.save(any(RevisionEntity.class))).thenAnswer(invocation -> {
            RevisionEntity revision = invocation.getArgument(0);
            revision.setId(500L);
            revision.setTraceId(UUID.fromString("22222222-2222-2222-2222-222222222222"));
            revisionRef.set(revision);
            return revision;
        });
        when(reviewTaskRepository.save(any(ReviewTaskEntity.class))).thenAnswer(invocation -> {
            ReviewTaskEntity task = invocation.getArgument(0);
            task.setId(600L);
            return task;
        });

        service.submitCreate(
                1L,
                new SourceBindingRevisionSubmitRequest(
                        new SourceBindingCreateRequest(
                                10L,
                                "culture_item",
                                100L,
                                "文化资料证据",
                                "摘录",
                                "high",
                                true,
                                null
                        ),
                        "新增证据"
                ),
                2L,
                "req-culture",
                "127.0.0.1"
        );

        ArgumentCaptor<OperationTraceContext> trace = ArgumentCaptor.forClass(OperationTraceContext.class);
        verify(operationLogApplicationService).record(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(2L),
                org.mockito.ArgumentMatchers.eq("culture_source_binding_submit"),
                org.mockito.ArgumentMatchers.eq("revision"),
                org.mockito.ArgumentMatchers.eq(500L),
                org.mockito.ArgumentMatchers.eq("提交文化对象来源绑定审核"),
                org.mockito.ArgumentMatchers.eq(revisionRef.get().getDiffSummary()),
                org.mockito.ArgumentMatchers.eq("req-culture"),
                org.mockito.ArgumentMatchers.eq("127.0.0.1"),
                trace.capture()
        );
        assertThat(revisionRef.get().getTargetType()).isEqualTo("source_binding");
        assertThat(revisionRef.get().getTargetId()).isEqualTo(10L);
        assertThat(trace.getValue().businessTargetType()).isEqualTo("culture_item");
        assertThat(trace.getValue().businessTargetId()).isEqualTo(100L);
    }
}
