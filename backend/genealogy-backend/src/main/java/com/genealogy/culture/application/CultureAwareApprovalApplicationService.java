package com.genealogy.culture.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.culture.domain.CulturePermissionPolicyService;
import com.genealogy.culture.entity.CultureItemEntity;
import com.genealogy.culture.repository.CultureItemRepository;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.generation.repository.GenWordRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.application.ApprovalApplicationService;
import com.genealogy.review.application.RevisionApplyService;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.dto.ReviewDecisionRequest;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Primary
@Service
public class CultureAwareApprovalApplicationService extends ApprovalApplicationService {

    private final AuditRecordRepository governedAuditRecordRepository;
    private final CheckTaskRepository governedCheckTaskRepository;
    private final CultureItemRepository cultureItemRepository;
    private final CulturePermissionPolicyService culturePermissionPolicy;

    public CultureAwareApprovalApplicationService(
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            SourceRepository sourceRepository,
            BranchRepository branchRepository,
            GenSchemeRepository genSchemeRepository,
            GenWordRepository genWordRepository,
            AuditRecordRepository auditRecordRepository,
            CheckTaskRepository checkTaskRepository,
            OperationLogApplicationService operationLogApplicationService,
            AuthorizationApplicationService authorizationApplicationService,
            RevisionApplyService revisionApplyService,
            ObjectMapper objectMapper,
            CultureItemRepository cultureItemRepository,
            CulturePermissionPolicyService culturePermissionPolicy
    ) {
        super(
                personRepository,
                relationshipRepository,
                sourceRepository,
                branchRepository,
                genSchemeRepository,
                genWordRepository,
                auditRecordRepository,
                checkTaskRepository,
                operationLogApplicationService,
                authorizationApplicationService,
                revisionApplyService,
                objectMapper
        );
        this.governedAuditRecordRepository = auditRecordRepository;
        this.governedCheckTaskRepository = checkTaskRepository;
        this.cultureItemRepository = cultureItemRepository;
        this.culturePermissionPolicy = culturePermissionPolicy;
    }

    @Override
    @Transactional
    public CheckTaskResponse approve(Long taskId, ReviewDecisionRequest request) {
        validateCultureDecision(taskId, request, false);
        return super.approve(taskId, request);
    }

    @Override
    @Transactional
    public CheckTaskResponse reject(Long taskId, ReviewDecisionRequest request) {
        validateCultureDecision(taskId, request, true);
        return super.reject(taskId, request);
    }

    private void validateCultureDecision(Long taskId, ReviewDecisionRequest request, boolean rejecting) {
        CheckTaskEntity task = governedCheckTaskRepository.findById(taskId)
                .orElseThrow(() -> new BusinessException("REVIEW_TASK_NOT_FOUND", "审核任务不存在"));
        AuditRecordEntity revision = governedAuditRecordRepository.findById(task.getRevisionId())
                .orElseThrow(() -> new BusinessException("REVIEW_RECORD_NOT_FOUND", "审核版本不存在"));
        if (!CultureItemGovernanceApplicationService.TARGET_TYPE.equals(normalize(revision.getTargetType()))) {
            return;
        }
        CultureItemEntity item = cultureItemRepository.findByIdAndDeletedAtIsNull(revision.getTargetId())
                .orElseThrow(() -> new BusinessException("CULTURE_ITEM_NOT_FOUND", "文化资料不存在或不可见"));
        if (!Objects.equals(item.getClanId(), revision.getClanId())
                || !Objects.equals(item.getBranchId(), task.getBranchId())) {
            throw new BusinessException("CULTURE_REVIEW_SCOPE_MISMATCH", "审核任务范围与文化资料不一致");
        }
        culturePermissionPolicy.requireAction(item, request.reviewerId(), CulturePermissionPolicyService.REVIEW);
        if (rejecting && (request.comment() == null || request.comment().isBlank())) {
            throw new BusinessException("CULTURE_REVIEW_REASON_REQUIRED", "驳回文化资料必须填写原因");
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }
}
