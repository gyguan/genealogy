package com.genealogy.integration;

import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.review.application.ApprovalApplicationService;
import com.genealogy.review.dto.ReviewDecisionRequest;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("integration-test")
class ReviewDecisionPostgreSqlIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("genealogy_review_it")
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
    @Autowired ClanRepository clanRepository;

    @Test
    void ftPerm004_selfApprovalIsRejectedBeforeStateMutation() {
        ClanEntity clan = new ClanEntity();
        String token = UUID.randomUUID().toString();
        clan.setClanCode("REVIEW-IT-" + token);
        clan.setClanName("审核隔离集成测试-" + token);
        clan.setSurname("黄");
        clan.setStatus("pending_review");
        clan.setCreatedAt(LocalDateTime.now());
        clan.setUpdatedAt(LocalDateTime.now());
        clan = clanRepository.saveAndFlush(clan);

        AuditRecordEntity revision = new AuditRecordEntity();
        revision.setClanId(clan.getId());
        revision.setTargetType("clan");
        revision.setTargetId(clan.getId());
        revision.setChangeType("submit_review");
        revision.setOldPayload("{}");
        revision.setNewPayload("{}");
        revision.setSubmitterId(77L);
        revision.setSubmitTime(LocalDateTime.now());
        revision.setStatus("pending");
        revision = auditRecordRepository.saveAndFlush(revision);

        CheckTaskEntity task = new CheckTaskEntity();
        task.setClanId(clan.getId());
        task.setRevisionId(revision.getId());
        task.setReviewLevel(1);
        task.setReviewerRole("clan_admin");
        task.setStatus("pending");
        task.setCreatedAt(LocalDateTime.now());
        task = checkTaskRepository.saveAndFlush(task);

        Long taskId = task.getId();
        Long revisionId = revision.getId();
        assertThatThrownBy(() -> approvalApplicationService.approve(
                taskId,
                new ReviewDecisionRequest(77L, "提交人尝试自审")
        )).isInstanceOfSatisfying(BusinessException.class, exception ->
                assertThat(exception.getCode()).isEqualTo("REVIEW_SELF_DECISION_FORBIDDEN")
        );

        CheckTaskEntity unchangedTask = checkTaskRepository.findById(taskId).orElseThrow();
        AuditRecordEntity unchangedRevision = auditRecordRepository.findById(revisionId).orElseThrow();
        assertThat(unchangedTask.getStatus()).isEqualTo("pending");
        assertThat(unchangedTask.getReviewerId()).isNull();
        assertThat(unchangedTask.getReviewedAt()).isNull();
        assertThat(unchangedRevision.getStatus()).isEqualTo("pending");
        assertThat(unchangedRevision.getApprovedAt()).isNull();
    }
}
