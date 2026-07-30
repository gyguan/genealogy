package com.genealogy.home.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.home.dto.HomeDashboardBucketResponse;
import com.genealogy.home.dto.HomeDashboardResponse;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.person.repository.query.PersonDashboardBucket;
import com.genealogy.person.repository.query.PersonDashboardDailyCount;
import com.genealogy.person.repository.query.PersonDashboardData;
import com.genealogy.person.repository.query.PersonDashboardSummary;
import com.genealogy.review.entity.ReviewTaskEntity;
import com.genealogy.review.repository.ReviewTaskRepository;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HomeDashboardApplicationServiceTest {

    private static final Long CLAN_ID = 7L;
    private static final Long ACTOR_ID = 9L;

    @Mock private PersonRepository personRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private SourceRepository sourceRepository;
    @Mock private ReviewTaskRepository reviewTaskRepository;
    @Mock private AuthorizationApplicationService authorizationApplicationService;

    private HomeDashboardApplicationService service;

    @BeforeEach
    void setUp() {
        service = new HomeDashboardApplicationService(personRepository, branchRepository, sourceRepository, reviewTaskRepository, authorizationApplicationService);
        lenient().when(personRepository.loadDashboardData(eq(CLAN_ID), eq("official"), any(LocalDateTime.class), eq(4)))
                .thenReturn(data(new PersonDashboardSummary(0L, 0L, 0L, 0L, 0L, 0L), List.of(), List.of(), List.of()));
        lenient().when(branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(CLAN_ID)).thenReturn(List.of());
        lenient().when(sourceRepository.countDashboardBySourceType(CLAN_ID)).thenReturn(List.of());
        lenient().when(reviewTaskRepository.countByClanIdAndStatusInAndCreatedAtBefore(eq(CLAN_ID), anyCollection(), any(LocalDateTime.class))).thenReturn(0L);
        lenient().when(sourceRepository.findRecentDashboardSources(eq(CLAN_ID), any(Pageable.class))).thenReturn(List.of());
        lenient().when(reviewTaskRepository.findRecentDashboardTasks(eq(CLAN_ID), any(Pageable.class))).thenReturn(List.of());
    }

    @Test
    void returnsZeroDashboardForEmptyClan() {
        HomeDashboardResponse response = service.getDashboard(CLAN_ID, ACTOR_ID);

        verify(authorizationApplicationService).requirePermission(CLAN_ID, ACTOR_ID, "person:view");
        assertThat(response.peopleTotal()).isZero();
        assertThat(response.genderDistribution()).extracting(HomeDashboardBucketResponse::key).containsExactly("male", "female", "unknown");
        assertThat(response.livingDistribution()).extracting(HomeDashboardBucketResponse::key).containsExactly("living", "deceased", "unknown");
        assertThat(response.trendPoints()).hasSize(30);
        assertThat(response.recentActivities()).isEmpty();
    }

    @Test
    void usesStronglyTypedPersonDashboardReadModel() {
        PersonDashboardSummary summary = new PersonDashboardSummary(200L, 150L, 120L, 90L, 50L, 7L);
        List<PersonDashboardBucket> buckets = List.of(
                bucket("gender", "male", 110), bucket("gender", "female", 90),
                bucket("living", "living", 180), bucket("living", "deceased", 20),
                bucket("generation", "1", 60), bucket("generation", "2", 140),
                bucket("branch", "1", 120), bucket("branch", "2", 80)
        );
        when(personRepository.loadDashboardData(eq(CLAN_ID), eq("official"), any(LocalDateTime.class), eq(4)))
                .thenReturn(data(summary, buckets, List.of(), List.of()));
        when(branchRepository.countByClanId(CLAN_ID)).thenReturn(8L);
        when(sourceRepository.countByClanId(CLAN_ID)).thenReturn(6L);
        when(reviewTaskRepository.countByClanIdAndStatusIn(eq(CLAN_ID), anyCollection())).thenReturn(3L);
        when(branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(CLAN_ID)).thenReturn(List.of(branch(1L, "长沙支"), branch(2L, "湘潭支")));
        when(sourceRepository.countDashboardBySourceType(CLAN_ID)).thenReturn(List.of(row("genealogy_book", 4L), row("oral_record", 2L)));

        HomeDashboardResponse response = service.getDashboard(CLAN_ID, ACTOR_ID);

        assertThat(response.peopleTotal()).isEqualTo(200L);
        assertThat(response.completeness().generationMaintainedRate()).isEqualTo(75.0);
        assertThat(response.branchCoverage().coverageRate()).isEqualTo(87.5);
        assertThat(response.generationDistribution()).extracting(HomeDashboardBucketResponse::label).containsExactly("1世", "2世");
        assertThat(response.branchDistribution()).extracting(HomeDashboardBucketResponse::label).containsExactly("长沙支", "湘潭支");
    }

    @Test
    void buildsTrendRiskAndRecentActivityFromBoundedReadModel() {
        LocalDateTime now = LocalDateTime.now();
        PersonEntity person = person("黄一", now.minusDays(1), now);
        PersonDashboardData dashboardData = data(
                new PersonDashboardSummary(201L, 151L, 121L, 91L, 80L, 8L),
                List.of(
                        bucket("gender", "male", 100), bucket("gender", "female", 100), bucket("gender", "unknown", 1),
                        bucket("living", "living", 180), bucket("living", "deceased", 20), bucket("living", "unknown", 1),
                        bucket("generation", "1", 100), bucket("generation", "2", 100), bucket("generation", "unmaintained", 1)
                ),
                List.of(new PersonDashboardDailyCount(LocalDate.now().minusDays(1), 3L)),
                List.of(person)
        );
        when(personRepository.loadDashboardData(eq(CLAN_ID), eq("official"), any(LocalDateTime.class), eq(4))).thenReturn(dashboardData);
        when(branchRepository.countByClanId(CLAN_ID)).thenReturn(9L);
        when(sourceRepository.countByClanId(CLAN_ID)).thenReturn(12L);
        when(reviewTaskRepository.countByClanIdAndStatusIn(eq(CLAN_ID), anyCollection())).thenReturn(4L);
        when(reviewTaskRepository.countByClanIdAndStatusInAndCreatedAtBefore(eq(CLAN_ID), anyCollection(), any(LocalDateTime.class))).thenReturn(1L);
        when(sourceRepository.findRecentDashboardSources(eq(CLAN_ID), any(Pageable.class))).thenReturn(List.of(source("黄氏谱卷一", now.minusDays(2))));
        when(reviewTaskRepository.findRecentDashboardTasks(eq(CLAN_ID), any(Pageable.class))).thenReturn(List.of(reviewTask("approved", now.minusDays(3), now.minusDays(1))));

        HomeDashboardResponse response = service.getDashboard(CLAN_ID, ACTOR_ID);

        assertThat(response.peopleTotal()).isEqualTo(201L);
        assertThat(response.trendPoints()).anySatisfy(point -> assertThat(point.peopleCreatedCount()).isEqualTo(3L));
        assertThat(response.risks()).extracting("key").contains("pending_review", "overdue_review", "missing_key_info", "empty_branch");
        assertThat(response.recentActivities()).extracting("objectName").contains("黄一", "黄氏谱卷一", "审核事项");
    }

    private PersonDashboardData data(PersonDashboardSummary summary, List<PersonDashboardBucket> buckets, List<PersonDashboardDailyCount> daily, List<PersonEntity> recent) {
        return new PersonDashboardData(summary, buckets, daily, recent);
    }

    private PersonDashboardBucket bucket(String dimension, String key, long count) { return new PersonDashboardBucket(dimension, key, count); }
    private Object[] row(Object key, long count) { return new Object[]{key, count}; }
    private BranchEntity branch(Long id, String name) { BranchEntity branch = new BranchEntity(); branch.setId(id); branch.setBranchName(name); return branch; }
    private PersonEntity person(String name, LocalDateTime createdAt, LocalDateTime updatedAt) { PersonEntity person = new PersonEntity(); person.setId(1L); person.setName(name); person.setDataStatus("official"); person.setCreatedAt(createdAt); person.setUpdatedAt(updatedAt); return person; }
    private SourceEntity source(String name, LocalDateTime createdAt) { SourceEntity source = new SourceEntity(); source.setSourceName(name); source.setSourceType("genealogy_book"); source.setVerificationStatus("approved"); source.setCreatedAt(createdAt); source.setUpdatedAt(createdAt); return source; }
    private ReviewTaskEntity reviewTask(String status, LocalDateTime createdAt, LocalDateTime reviewedAt) { ReviewTaskEntity task = new ReviewTaskEntity(); task.setStatus(status); task.setCreatedAt(createdAt); task.setReviewedAt(reviewedAt); return task; }
}
