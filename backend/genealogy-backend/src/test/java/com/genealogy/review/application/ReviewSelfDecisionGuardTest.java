package com.genealogy.review.application;

import com.genealogy.common.exception.BusinessException;
import com.genealogy.review.dto.ReviewDecisionRequest;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import org.aspectj.lang.JoinPoint;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewSelfDecisionGuardTest {

    @Mock CheckTaskRepository checkTaskRepository;
    @Mock AuditRecordRepository auditRecordRepository;
    @Mock JoinPoint joinPoint;

    @Test
    void blocksSubmitterFromApprovingOwnRevision() {
        CheckTaskEntity task = new CheckTaskEntity();
        task.setId(31L);
        task.setRevisionId(41L);
        AuditRecordEntity revision = new AuditRecordEntity();
        revision.setId(41L);
        revision.setSubmitterId(7L);

        when(joinPoint.getArgs()).thenReturn(new Object[]{31L, new ReviewDecisionRequest(7L, "同意")});
        when(checkTaskRepository.findById(31L)).thenReturn(Optional.of(task));
        when(auditRecordRepository.findById(41L)).thenReturn(Optional.of(revision));

        ReviewSelfDecisionGuard guard = new ReviewSelfDecisionGuard(checkTaskRepository, auditRecordRepository);

        assertThatThrownBy(() -> guard.preventSubmitterDecision(joinPoint))
                .isInstanceOfSatisfying(BusinessException.class, exception -> {
                    assertThat(exception.getCode()).isEqualTo("REVIEW_SELF_DECISION_FORBIDDEN");
                    assertThat(exception.getMessage()).isEqualTo("提交人不能审核自己的变更");
                });
    }

    @Test
    void allowsIndependentReviewerToContinue() {
        CheckTaskEntity task = new CheckTaskEntity();
        task.setId(31L);
        task.setRevisionId(41L);
        AuditRecordEntity revision = new AuditRecordEntity();
        revision.setId(41L);
        revision.setSubmitterId(7L);

        when(joinPoint.getArgs()).thenReturn(new Object[]{31L, new ReviewDecisionRequest(8L, "同意")});
        when(checkTaskRepository.findById(31L)).thenReturn(Optional.of(task));
        when(auditRecordRepository.findById(41L)).thenReturn(Optional.of(revision));

        ReviewSelfDecisionGuard guard = new ReviewSelfDecisionGuard(checkTaskRepository, auditRecordRepository);
        guard.preventSubmitterDecision(joinPoint);
    }
}
