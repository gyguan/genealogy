package com.genealogy.culture.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CultureItemDomainService;
import com.genealogy.culture.dto.CultureItemCreateRequest;
import com.genealogy.culture.dto.CultureItemPageResponse;
import com.genealogy.culture.dto.CultureItemSearchCriteria;
import com.genealogy.culture.dto.CultureItemUpdateRequest;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.repository.SourceAttachmentRepository;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CultureItemApplicationServiceTest {

    @Mock private CultureItemRepository cultureItemRepository;
    @Mock private ClanRepository clanRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private AppUserRepository appUserRepository;
    @Mock private SourceBindingRepository sourceBindingRepository;
    @Mock private SourceRepository sourceRepository;
    @Mock private SourceAttachmentRepository sourceAttachmentRepository;
    @Mock private RevisionRepository revisionRepository;
    @Mock private ReviewTaskRepository reviewTaskRepository;
    @Mock private AuthorizationApplicationService authorizationApplicationService;
    @Mock private RbacAuthorizationApplicationService rbacAuthorizationApplicationService;
    @Mock private OperationLogApplicationService operationLogApplicationService;

    private CultureItemApplicationService service;

    @BeforeEach
    void setUp() {
        service = new CultureItemApplicationService(
                cultureItemRepository,
                new CultureItemDomainService(),
                new CultureItemMapper(),
                clanRepository,
                branchRepository,
                appUserRepository,
                sourceBindingRepository,
                sourceRepository,
                sourceAttachmentRepository,
                revisionRepository,
                reviewTaskRepository,
                authorizationApplicationService,
                rbacAuthorizationApplicationService,
                operationLogApplicationService
        );
    }

    @Test
    void rejectsBranchFromAnotherClanBeforeCreating() {
        ClanEntity clan = clan(1L);
        when(clanRepository.findById(1L)).thenReturn(Optional.of(clan));
        when(branchRepository.findByIdAndClanId(99L, 1L)).thenReturn(Optional.empty());

        CultureItemCreateRequest request = createRequest(99L);
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.create(1L, request, 7L, "req", "127.0.0.1")
        );

        assertEquals("CULTURE_ITEM_BRANCH_INVALID", exception.getCode());
        verify(cultureItemRepository, never()).save(any());
    }

    @Test
    void rejectsDirectUpdateOfOfficialData() {
        CultureItemEntity entity = cultureItem(10L, 1L, null, "official");
        when(cultureItemRepository.findByIdAndDeletedAtIsNull(10L)).thenReturn(Optional.of(entity));
        when(authorizationApplicationService.isCrossClanAdmin(7L)).thenReturn(false);
        when(rbacAuthorizationApplicationService.permissionDataScope(7L, 1L, "source:view"))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.full());
        when(rbacAuthorizationApplicationService.permissionDataScope(7L, 1L, "source:update"))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.full());

        CultureItemUpdateRequest request = new CultureItemUpdateRequest(
                null, "hall_name", "新标题", null, null, null, null,
                "high", "clan_only", "normal", false, 0, 0L
        );
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.update(10L, request, 7L, "req", "127.0.0.1")
        );

        assertEquals("CULTURE_ITEM_REVIEW_REQUIRED", exception.getCode());
        verify(cultureItemRepository, never()).save(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void usesDatabasePagingWithMaximumPageSizeAndReturnsSummaryOnly() {
        ClanEntity clan = clan(1L);
        CultureItemEntity entity = cultureItem(10L, 1L, null, "draft");
        when(clanRepository.findById(1L)).thenReturn(Optional.of(clan));
        when(authorizationApplicationService.isCrossClanAdmin(7L)).thenReturn(false);
        when(rbacAuthorizationApplicationService.permissionDataScope(eq(7L), eq(1L), any()))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.full());
        when(cultureItemRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));
        when(sourceBindingRepository.countActiveByTargets(eq(1L), eq("culture_item"), any(), eq("archived")))
                .thenReturn(List.of());
        when(sourceAttachmentRepository.countActiveByTargets(eq(1L), eq("culture_item"), any(), eq("archived")))
                .thenReturn(List.of());
        when(revisionRepository.countByTargets(eq(1L), eq("culture_item"), any())).thenReturn(List.of());
        when(branchRepository.findAllById(any())).thenReturn(List.of());
        when(appUserRepository.findAllById(any())).thenReturn(List.of());

        CultureItemPageResponse response = service.search(
                1L,
                new CultureItemSearchCriteria("堂", null, null, null, null, null, null, null),
                1,
                500,
                7L
        );

        assertEquals(100, response.page().pageSize());
        assertEquals(1, response.items().size());
        assertEquals("敦本堂", response.items().get(0).title());
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(cultureItemRepository).findAll(any(Specification.class), pageable.capture());
        assertEquals(100, pageable.getValue().getPageSize());
    }

    @Test
    void softDeletesMutableDraftAndWritesSafeLog() {
        CultureItemEntity entity = cultureItem(10L, 1L, 5L, "draft");
        when(cultureItemRepository.findByIdAndDeletedAtIsNull(10L)).thenReturn(Optional.of(entity));
        when(authorizationApplicationService.isCrossClanAdmin(7L)).thenReturn(false);
        when(rbacAuthorizationApplicationService.permissionDataScope(7L, 1L, "source:view"))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.branches(java.util.Set.of(5L)));
        when(rbacAuthorizationApplicationService.permissionDataScope(7L, 1L, "source:update"))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.branches(java.util.Set.of(5L)));
        when(rbacAuthorizationApplicationService.permissionDataScope(7L, 1L, "source:delete"))
                .thenReturn(RbacAuthorizationApplicationService.PermissionDataScope.branches(java.util.Set.of(5L)));
        when(cultureItemRepository.save(entity)).thenReturn(entity);

        service.delete(10L, 7L, "req", "127.0.0.1");

        assertNotNull(entity.getDeletedAt());
        verify(operationLogApplicationService).record(
                eq(1L), eq(7L), eq("culture_item_delete"), eq("culture_item"), eq(10L),
                any(), any(), eq("req"), eq("127.0.0.1")
        );
    }

    private CultureItemCreateRequest createRequest(Long branchId) {
        return new CultureItemCreateRequest(
                branchId, "hall_name", "敦本堂", "摘要", "正文", "清代", "长沙",
                "high", "clan_only", "normal", false, 0
        );
    }

    private ClanEntity clan(Long id) {
        ClanEntity clan = new ClanEntity();
        clan.setId(id);
        clan.setClanName("张氏宗族");
        return clan;
    }

    private CultureItemEntity cultureItem(Long id, Long clanId, Long branchId, String status) {
        CultureItemEntity entity = new CultureItemEntity();
        entity.setId(id);
        entity.setClanId(clanId);
        entity.setBranchId(branchId);
        entity.setCategory("hall_name");
        entity.setTitle("敦本堂");
        entity.setConfidenceLevel("high");
        entity.setPrivacyLevel("clan_only");
        entity.setSensitiveLevel("normal");
        entity.setDataStatus(status);
        entity.setSortOrder(0);
        entity.setVersion(0L);
        entity.setCreatedAt(OffsetDateTime.now());
        entity.setUpdatedAt(OffsetDateTime.now());
        assertNull(entity.getDeletedAt());
        return entity;
    }
}
