package com.genealogy.integration;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.auth.entity.AppUserEntity;
import com.genealogy.auth.repository.AppUserRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.review.application.ApprovalApplicationService;
import com.genealogy.review.application.RevisionApplyService;
import com.genealogy.review.dto.ReviewDecisionRequest;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("integration-test")
class ReviewDecisionConcurrencyPostgreSqlIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("genealogy_review_concurrency_it")
            .withUsername("genealogy")
            .withPassword("genealogy");

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
        registry.add("spring.flyway.enabled", () -> true);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired ApprovalApplicationService approvalApplicationService;
    @Autowired AuditRecordRepository auditRecordRepository;
    @Autowired CheckTaskRepository checkTaskRepository;
    @Autowired AppUserRepository appUserRepository;
    @Autowired ClanRepository clanRepository;

    @MockBean AuthorizationApplicationService authorizationApplicationService;
    @MockBean RevisionApplyService revisionApplyService;
    @MockBean OperationLogApplicationService operationLogApplicationService;

    @Test
    void ftReview005_sameTaskConcurrentApprovalOnlyAppliesOnce() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        AppUserEntity submitter = saveUser("submitter");
        AppUserEntity reviewer = saveUser("reviewer");
        ClanEntity clan = saveClan(now);

        AuditRecordEntity revision = new AuditRecordEntity();
        revision.setClanId(clan.getId());
        revision.setTargetType("person");
        revision.setTargetId(910001L);
        revision.setChangeType("submit_review");
        revision.setOldPayload("{}");
        revision.setNewPayload("{}");
        revision.setSubmitterId(submitter.getId());
        revision.setSubmitTime(now);
        revision.setStatus("pending");
        revision = auditRecordRepository.saveAndFlush(revision);

        CheckTaskEntity task = new CheckTaskEntity();
        task.setClanId(clan.getId());
        task.setRevisionId(revision.getId());
        task.setReviewLevel(1);
        task.setReviewerRole("reviewer");
        task.setStatus("pending");
        task.setCreatedAt(now);
        task = checkTaskRepository.saveAndFlush(task);

        when(authorizationApplicationService.requirePermission(any(), any(), any())).thenReturn(null);

        Long taskId = task.getId();
        Long reviewerId = reviewer.getId();
        Long revisionId = revision.getId();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            List<Future<Object>> futures = new ArrayList<>();
            for (int index = 0; index < 2; index++) {
                int decisionIndex = index;
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    start.await();
                    try {
                        return approvalApplicationService.approve(
                                taskId,
                                new ReviewDecisionRequest(reviewerId, "并发批准-" + decisionIndex)
                        );
                    } catch (BusinessException exception) {
                        return exception;
                    }
                }));
            }
            ready.await();
            start.countDown();

            List<Object> outcomes = futures.stream().map(future -> {
                try {
                    return future.get();
                } catch (Exception exception) {
                    throw new RuntimeException(exception);
                }
            }).toList();

            assertThat(outcomes.stream().filter(BusinessException.class::isInstance)).hasSize(1);
            BusinessException rejected = outcomes.stream()
                    .filter(BusinessException.class::isInstance)
                    .map(BusinessException.class::cast)
                    .findFirst()
                    .orElseThrow();
            assertThat(rejected.getCode()).isEqualTo("REVIEW_TASK_ALREADY_HANDLED");

            CheckTaskEntity savedTask = checkTaskRepository.findById(taskId).orElseThrow();
            AuditRecordEntity savedRevision = auditRecordRepository.findById(revisionId).orElseThrow();
            assertThat(savedTask.getStatus()).isEqualTo("approved");
            assertThat(savedTask.getReviewerId()).isEqualTo(reviewerId);
            assertThat(savedRevision.getStatus()).isEqualTo("approved");
            verify(revisionApplyService, times(1)).apply(any(), any());
        } finally {
            executor.shutdownNow();
        }
    }

    private ClanEntity saveClan(LocalDateTime now) {
        String token = UUID.randomUUID().toString();
        ClanEntity clan = new ClanEntity();
        clan.setClanCode("REVIEW-CONCURRENCY-" + token);
        clan.setClanName("审核并发集成测试-" + token);
        clan.setSurname("黄");
        clan.setStatus("pending_review");
        clan.setCreatedAt(now);
        clan.setUpdatedAt(now);
        return clanRepository.saveAndFlush(clan);
    }

    private AppUserEntity saveUser(String prefix) {
        LocalDateTime now = LocalDateTime.now();
        AppUserEntity user = new AppUserEntity();
        user.setUsername(prefix + "-" + UUID.randomUUID());
        user.setPasswordHash("not-used-in-integration-test");
        user.setDisplayName(prefix);
        user.setStatus("active");
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        return appUserRepository.saveAndFlush(user);
    }
}
