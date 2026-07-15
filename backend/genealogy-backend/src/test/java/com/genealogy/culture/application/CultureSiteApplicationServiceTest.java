package com.genealogy.culture.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.application.RbacAuthorizationApplicationService;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CultureSiteDomainService;
import com.genealogy.culture.domain.CultureSitePermissionPolicyService;
import com.genealogy.culture.dto.CultureSiteUpdateRequest;
import com.genealogy.culture.entity.CultureSiteEntity;
import com.genealogy.culture.repository.CultureSiteRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.review.repository.RevisionRepository;
import com.genealogy.source.repository.SourceAttachmentRepository;
import com.genealogy.source.repository.SourceBindingRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CultureSiteApplicationServiceTest {

    @Mock private CultureSiteRepository siteRepository;
    @Mock private CultureSitePermissionPolicyService permissionPolicyService;
    @Mock private CultureSiteGovernanceApplicationService governanceApplicationService;
    @Mock private ClanRepository clanRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private PersonRepository personRepository;
    @Mock private AppUserRepository appUserRepository;
    @Mock private SourceBindingRepository sourceBindingRepository;
    @Mock private SourceRepository sourceRepository;
    @Mock private SourceAttachmentRepository sourceAttachmentRepository;
    @Mock private RevisionRepository revisionRepository;
    @Mock private ReviewTaskRepository reviewTaskRepository;
    @Mock private AuthorizationApplicationService authorizationApplicationService;
    @Mock private RbacAuthorizationApplicationService rbacAuthorizationApplicationService;
    @Mock private OperationLogApplicationService operationLogApplicationService;

    private CultureSiteApplicationService service;

    @BeforeEach
    void setUp() {
        service = new CultureSiteApplicationService(
                siteRepository, new CultureSiteDomainService(), permissionPolicyService,
                governanceApplicationService, clanRepository, branchRepository, personRepository,
                appUserRepository, sourceBindingRepository, sourceRepository, sourceAttachmentRepository,
                revisionRepository, reviewTaskRepository, authorizationApplicationService,
                rbacAuthorizationApplicationService, operationLogApplicationService
        );
    }

    @Test
    void rejectsOfficialMoveToUnauthorizedBranchBeforeCreatingRevision() {
        CultureSiteEntity site = new CultureSiteEntity();
        site.setId(100L);
        site.setClanId(1L);
        site.setBranchId(10L);
        site.setDataStatus("official");
        site.setVersion(0L);

        BranchEntity targetBranch = new BranchEntity();
        targetBranch.setId(20L);
        targetBranch.setClanId(1L);

        when(siteRepository.findByIdAndDeletedAtIsNull(100L)).thenReturn(Optional.of(site));
        when(branchRepository.findByIdAndClanId(20L, 1L)).thenReturn(Optional.of(targetBranch));
        when(permissionPolicyService.canUpdate(1L, 20L, 7L)).thenReturn(false);

        CultureSiteUpdateRequest request = new CultureSiteUpdateRequest(
                20L, null, "ancestral_hall", "张氏宗祠", "长沙", "清代", "存续",
                "摘要", "说明", null, null, "high", "clan_only", "normal", false, 0, 0L
        );

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> service.update(100L, request, 7L, "req", "127.0.0.1")
        );

        assertEquals("AUTH_FORBIDDEN", exception.getCode());
        verify(governanceApplicationService, never()).submitOfficialUpdate(
                eq(site), any(CultureSiteUpdateRequest.class), eq(7L), eq("req"), eq("127.0.0.1")
        );
    }
}
