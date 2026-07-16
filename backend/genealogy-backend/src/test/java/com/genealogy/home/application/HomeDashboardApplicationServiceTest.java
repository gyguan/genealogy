package com.genealogy.home.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.home.dto.HomeDashboardBucketResponse;
import com.genealogy.home.dto.HomeDashboardResponse;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HomeDashboardApplicationServiceTest {

    private static final Long CLAN_ID = 7L;
    private static final Long ACTOR_ID = 9L;
    private static final String OFFICIAL = "official";

    @Mock
    private PersonRepository personRepository;
    @Mock
    private BranchRepository branchRepository;
    @Mock
    private SourceRepository sourceRepository;
    @Mock
    private ReviewTaskRepository reviewTaskRepository;
    @Mock
    private AuthorizationApplicationService authorizationApplicationService;

    private HomeDashboardApplicationService service;

    @BeforeEach
    void setUp() {
        service = new HomeDashboardApplicationService(
                personRepository,
                branchRepository,
                sourceRepository,
                reviewTaskRepository,
                authorizationApplicationService
        );
    }

    @Test
    void returnsZeroDashboardForEmptyClan() {
        when(personRepository.countByClanIdAndDeletedAtIsNullAndDataStatus(CLAN_ID, OFFICIAL)).thenReturn(0L);
        when(branchRepository.countByClanId(CLAN_ID)).thenReturn(0L);
        when(sourceRepository.countByClanId(CLAN_ID)).thenReturn(0L);
        when(reviewTaskRepository.countByClanIdAndStatusIn(eq(CLAN_ID), anyCollection())).thenReturn(0L);
        when(personRepository.countDashboardByGender(CLAN_ID, OFFICIAL)).thenReturn(List.of());
        when(personRepository.countDashboardByLivingStatus(CLAN_ID, OFFICIAL)).thenReturn(List.of());
        when(personRepository.countDashboardByGenerationNo(CLAN_ID, OFFICIAL)).thenReturn(List.of());
        when(personRepository.countDashboardGenerationMaintained(CLAN_ID, OFFICIAL)).thenReturn(0L);
        when(personRepository.countDashboardVitalDatesMaintained(CLAN_ID, OFFICIAL)).thenReturn(0L);
        when(personRepository.countDashboardBiographyMaintained(CLAN_ID, OFFICIAL)).thenReturn(0L);
        when(personRepository.countDashboardCoveredBranches(CLAN_ID, OFFICIAL)).thenReturn(0L);

        HomeDashboardResponse response = service.getDashboard(CLAN_ID, ACTOR_ID);

        verify(authorizationApplicationService).requirePermission(CLAN_ID, ACTOR_ID, "person:view");
        assertThat(response.peopleTotal()).isZero();
        assertThat(response.branchCount()).isZero();
        assertThat(response.sourceCount()).isZero();
        assertThat(response.pendingReviewCount()).isZero();
        assertThat(response.asOf()).isNotNull();
        assertThat(response.genderDistribution()).extracting(HomeDashboardBucketResponse::key)
                .containsExactly("male", "female", "unknown");
        assertThat(response.livingDistribution()).extracting(HomeDashboardBucketResponse::key)
                .containsExactly("living", "deceased", "unknown");
        assertThat(response.generationDistribution()).isEmpty();
        assertThat(response.completeness().generationMaintainedRate()).isZero();
        assertThat(response.branchCoverage().coverageRate()).isZero();
    }

    @Test
    void aggregatesExactlyTwoHundredPeopleFromRepositoryCounts() {
        stubCommonCounts(200L, 8L, 6L, 3L, 150L, 120L, 90L, 7L);
        when(personRepository.countDashboardByGender(CLAN_ID, OFFICIAL)).thenReturn(List.of(
                row("male", 110L),
                row("female", 90L)
        ));
        when(personRepository.countDashboardByLivingStatus(CLAN_ID, OFFICIAL)).thenReturn(List.of(
                row(Boolean.TRUE, 180L),
                row(Boolean.FALSE, 20L)
        ));
        when(personRepository.countDashboardByGenerationNo(CLAN_ID, OFFICIAL)).thenReturn(List.of(
                row(1, 60L),
                row(2, 140L)
        ));

        HomeDashboardResponse response = service.getDashboard(CLAN_ID, ACTOR_ID);

        assertThat(response.peopleTotal()).isEqualTo(200L);
        assertThat(response.completeness().generationMaintainedCount()).isEqualTo(150L);
        assertThat(response.completeness().generationMaintainedRate()).isEqualTo(75.0);
        assertThat(response.branchCoverage().coveredBranchCount()).isEqualTo(7L);
        assertThat(response.branchCoverage().coverageRate()).isEqualTo(87.5);
        assertThat(response.generationDistribution()).extracting(HomeDashboardBucketResponse::label)
                .containsExactly("1世", "2世");
    }

    @Test
    void aggregatesMoreThanTwoHundredPeopleWithoutPageSizeLimitAndKeepsUnknownBuckets() {
        stubCommonCounts(201L, 9L, 12L, 4L, 151L, 121L, 91L, 8L);
        when(personRepository.countDashboardByGender(CLAN_ID, OFFICIAL)).thenReturn(List.of(
                row("male", 100L),
                row("female", 100L),
                row(null, 1L)
        ));
        when(personRepository.countDashboardByLivingStatus(CLAN_ID, OFFICIAL)).thenReturn(List.of(
                row(Boolean.TRUE, 180L),
                row(Boolean.FALSE, 20L),
                row(null, 1L)
        ));
        when(personRepository.countDashboardByGenerationNo(CLAN_ID, OFFICIAL)).thenReturn(List.of(
                row(null, 1L),
                row(1, 100L),
                row(2, 100L)
        ));

        HomeDashboardResponse response = service.getDashboard(CLAN_ID, ACTOR_ID);

        assertThat(response.peopleTotal()).isEqualTo(201L);
        assertThat(response.genderDistribution()).filteredOn(bucket -> "unknown".equals(bucket.key()))
                .singleElement()
                .extracting(HomeDashboardBucketResponse::count)
                .isEqualTo(1L);
        assertThat(response.livingDistribution()).filteredOn(bucket -> "unknown".equals(bucket.key()))
                .singleElement()
                .extracting(HomeDashboardBucketResponse::count)
                .isEqualTo(1L);
        assertThat(response.generationDistribution()).last()
                .extracting(HomeDashboardBucketResponse::key, HomeDashboardBucketResponse::label, HomeDashboardBucketResponse::count)
                .containsExactly("unmaintained", "未维护", 1L);
        assertThat(response.completeness().vitalDatesMaintainedRate()).isEqualTo(60.2);
        assertThat(response.branchCoverage().coverageRate()).isEqualTo(88.89);
    }

    private void stubCommonCounts(
            long peopleTotal,
            long branchCount,
            long sourceCount,
            long pendingReviewCount,
            long generationMaintainedCount,
            long vitalDatesMaintainedCount,
            long biographyMaintainedCount,
            long coveredBranchCount
    ) {
        when(personRepository.countByClanIdAndDeletedAtIsNullAndDataStatus(CLAN_ID, OFFICIAL)).thenReturn(peopleTotal);
        when(branchRepository.countByClanId(CLAN_ID)).thenReturn(branchCount);
        when(sourceRepository.countByClanId(CLAN_ID)).thenReturn(sourceCount);
        when(reviewTaskRepository.countByClanIdAndStatusIn(eq(CLAN_ID), anyCollection())).thenReturn(pendingReviewCount);
        when(personRepository.countDashboardGenerationMaintained(CLAN_ID, OFFICIAL)).thenReturn(generationMaintainedCount);
        when(personRepository.countDashboardVitalDatesMaintained(CLAN_ID, OFFICIAL)).thenReturn(vitalDatesMaintainedCount);
        when(personRepository.countDashboardBiographyMaintained(CLAN_ID, OFFICIAL)).thenReturn(biographyMaintainedCount);
        when(personRepository.countDashboardCoveredBranches(CLAN_ID, OFFICIAL)).thenReturn(coveredBranchCount);
    }

    private Object[] row(Object key, long count) {
        return new Object[]{key, count};
    }
}
