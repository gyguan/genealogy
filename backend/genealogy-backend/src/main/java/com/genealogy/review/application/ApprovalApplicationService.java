package com.genealogy.review.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.generation.entity.GenerationSchemeEntity;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.entity.RelationshipEntity;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.dto.AuditRecordResponse;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.dto.PersonSubmitReviewRequest;
import com.genealogy.review.dto.ReviewDecisionRequest;
import com.genealogy.review.dto.TargetSubmitRequest;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.source.entity.SourceEntity;
import com.genealogy.source.repository.SourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ApprovalApplicationService {

    private static final String TARGET_PERSON = "person";
    private static final String TARGET_RELATIONSHIP = "relationship";
    private static final String TARGET_SOURCE = "source";
    private static final String TARGET_BRANCH = "branch";
    private static final String TARGET_GENERATION_SCHEME = "generation_scheme";
    private static final String CHANGE_SUBMIT_REVIEW = "submit_review";
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";
    private static final String PERSON_STATUS_DRAFT = "draft";
    private static final String PERSON_STATUS_PENDING_REVIEW = "pending_review";
    private static final String PERSON_STATUS_OFFICIAL = "official";

    private final PersonRepository personRepository;
    private final RelationshipRepository relationshipRepository;
    private final SourceRepository sourceRepository;
    private final BranchRepository branchRepository;
    private final GenSchemeRepository genSchemeRepository;
    private final AuditRecordRepository auditRecordRepository;
    private final CheckTaskRepository checkTaskRepository;
    private final OperationLogApplicationService operationLogApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ApprovalApplicationService(
            PersonRepository personRepository,
            RelationshipRepository relationshipRepository,
            SourceRepository sourceRepository,
            BranchRepository branchRepository,
            GenSchemeRepository genSchemeRepository,
            AuditRecordRepository auditRecordRepository,
            CheckTaskRepository checkTaskRepository,
            OperationLogApplicationService operationLogApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.personRepository = personRepository;
        this.relationshipRepository = relationshipRepository;
        this.sourceRepository = sourceRepository;
        this.branchRepository = branchRepository;
        this.genSchemeRepository = genSchemeRepository;
        this.auditRecordRepository = auditRecordRepository;
        this.checkTaskRepository = checkTaskRepository;
        this.operationLogApplicationService = operationLogApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Transactional
    public CheckTaskResponse submitPerson(Long personId, PersonSubmitReviewRequest request) {
        PersonEntity person = getPerson(personId);
        authorizationApplicationService.requireClanMember(person.getClanId(), request.submitterId());
        CheckTaskResponse response = submitTarget(person.getClanId(), TARGET_PERSON, personId, person.getBranchId(), request.submitterId(), request.diffSummary(), "提交人物审核：" + person.getName());
        person.setDataStatus(PERSON_STATUS_PENDING_REVIEW);
        person.setUpdatedAt(LocalDateTime.now());
        personRepository.save(person);
        return response;
    }

    @Transactional
    public CheckTaskResponse submitRelationship(Long relationshipId, TargetSubmitRequest request) {
        RelationshipEntity relationship = relationshipRepository.findById(relationshipId)
                .filter(entity -> entity.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.RELATIONSHIP_NOT_FOUND));
        authorizationApplicationService.requireClanMember(relationship.getClanId(), request.submitterId());
        CheckTaskResponse response = submitTarget(relationship.getClanId(), TARGET_RELATIONSHIP, relationshipId, null, request.submitterId(), request.diffSummary(), "提交关系审核");
        relationship.setDataStatus(PERSON_STATUS_PENDING_REVIEW);
        relationship.setUpdatedAt(LocalDateTime.now());
        relationshipRepository.save(relationship);
        return response;
    }

    @Transactional
    public CheckTaskResponse submitSource(Long sourceId, TargetSubmitRequest request) {
        SourceEntity source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> new BusinessException("SOURCE_NOT_FOUND", "资料来源不存在"));
        authorizationApplicationService.requireClanMember(source.getClanId(), request.submitterId());
        CheckTaskResponse response = submitTarget(source.getClanId(), TARGET_SOURCE, sourceId, null, request.submitterId(), request.diffSummary(), "提交资料来源审核：" + source.getSourceName());
        source.setVerificationStatus(PERSON_STATUS_PENDING_REVIEW);
        sourceRepository.save(source);
        return response;
    }

    @Transactional
    public CheckTaskResponse submitBranch(Long branchId, TargetSubmitRequest request) {
        BranchEntity branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new BusinessException(ErrorCode.BRANCH_NOT_FOUND));
        authorizationApplicationService.requireClanMember(branch.getClanId(), request.submitterId());
        CheckTaskResponse response = submitTarget(branch.getClanId(), TARGET_BRANCH, branchId, branchId, request.submitterId(), request.diffSummary(), "提交支派审核：" + branch.getBranchName());
        branch.setStatus(PERSON_STATUS_PENDING_REVIEW);
        branch.setUpdatedAt(LocalDateTime.now());
        branchRepository.save(branch);
        return response;
    }

    @Transactional
    public CheckTaskResponse submitGenerationScheme(Long schemeId, TargetSubmitRequest request) {
        GenerationSchemeEntity scheme = genSchemeRepository.findById(schemeId)
                .orElseThrow(() -> new BusinessException("GENERATION_SCHEME_NOT_FOUND", "字辈方案不存在"));
        authorizationApplicationService.requireClanMember(scheme.getClanId(), request.submitterId());
        CheckTaskResponse response = submitTarget(scheme.getClanId(), TARGET_GENERATION_SCHEME, schemeId, scheme.getBranchId(), request.submitterId(), request.diffSummary(), "提交字辈方案审核：" + scheme.getSchemeName());
        scheme.setStatus(PERSON_STATUS_PENDING_REVIEW);
        genSchemeRepository.save(scheme);
        return response;
    }

    private CheckTaskResponse submitTarget(Long clanId, String targetType, Long targetId, Long branchId, Long submitterId, String diffSummary, String logSummary) {
        if (auditRecordRepository.existsByTargetTypeAndTargetIdAndStatus(targetType, targetId, STATUS_PENDING)) {
            throw new BusinessException("REVIEW_ALREADY_PENDING", "目标对象已存在待审核任务");
        }
        LocalDateTime now = LocalDateTime.now();
        AuditRecordEntity record = new AuditRecordEntity();
        record.setClanId(clanId);
        record.setTargetType(targetType);
        record.setTargetId(targetId);
        record.setChangeType(CHANGE_SUBMIT_REVIEW);
        record.setDiffSummary(trimToNull(diffSummary));
        record.setSubmitterId(submitterId);
        record.setSubmitTime(now);
        record.setStatus(STATUS_PENDING);
        AuditRecordEntity savedRecord = auditRecordRepository.save(record);

        CheckTaskEntity task = new CheckTaskEntity();
        task.setClanId(clanId);
        task.setRevisionId(savedRecord.getId());
        task.setReviewLevel(1);
        task.setReviewerRole("clan_admin");
        task.setBranchId(branchId);
        task.setStatus(STATUS_PENDING);
        task.setCreatedAt(now);
        CheckTaskEntity savedTask = checkTaskRepository.save(task);
        operationLogApplicationService.record(clanId, submitterId, "review_submit", targetType, targetId, logSummary, diffSummary);
        return toTaskResponse(savedTask);
    }

    @Transactional(readOnly = true)
    public List<CheckTaskResponse> listPending(Long clanId) {
        return checkTaskRepository.findByClanIdAndStatus(clanId, STATUS_PENDING).stream()
                .map(this::toTaskResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CheckTaskResponse getTask(Long taskId) {
        return toTaskResponse(getTaskEntity(taskId));
    }

    @Transactional(readOnly = true)
    public List<AuditRecordResponse> listPersonRecords(Long personId) {
        return auditRecordRepository.findByTargetTypeAndTargetIdOrderBySubmitTimeDesc(TARGET_PERSON, personId).stream()
                .map(this::toRecordResponse)
                .toList();
    }

    @Transactional
    public CheckTaskResponse approve(Long taskId, ReviewDecisionRequest request) {
        CheckTaskEntity task = getTaskEntity(taskId);
        ensurePending(task);
        AuditRecordEntity record = getRecord(task.getRevisionId());
        authorizationApplicationService.requireAnyRole(record.getClanId(), request.reviewerId(), "clan_admin");
        LocalDateTime now = LocalDateTime.now();
        record.setStatus(STATUS_APPROVED);
        record.setApprovedAt(now);
        auditRecordRepository.save(record);
        task.setStatus(STATUS_APPROVED);
        task.setReviewerId(request.reviewerId());
        task.setReviewComment(trimToNull(request.comment()));
        task.setReviewedAt(now);
        CheckTaskEntity savedTask = checkTaskRepository.save(task);
        applyTargetAfterApproval(record, now);
        operationLogApplicationService.record(record.getClanId(), request.reviewerId(), "review_approve", record.getTargetType(), record.getTargetId(), "审核通过", request.comment());
        return toTaskResponse(savedTask);
    }

    @Transactional
    public CheckTaskResponse reject(Long taskId, ReviewDecisionRequest request) {
        CheckTaskEntity task = getTaskEntity(taskId);
        ensurePending(task);
        AuditRecordEntity record = getRecord(task.getRevisionId());
        authorizationApplicationService.requireAnyRole(record.getClanId(), request.reviewerId(), "clan_admin");
        LocalDateTime now = LocalDateTime.now();
        String comment = trimToNull(request.comment());
        record.setStatus(STATUS_REJECTED);
        record.setRejectedReason(comment);
        auditRecordRepository.save(record);
        task.setStatus(STATUS_REJECTED);
        task.setReviewerId(request.reviewerId());
        task.setReviewComment(comment);
        task.setReviewedAt(now);
        CheckTaskEntity savedTask = checkTaskRepository.save(task);
        rollbackTargetAfterReject(record, now);
        operationLogApplicationService.record(record.getClanId(), request.reviewerId(), "review_reject", record.getTargetType(), record.getTargetId(), "审核驳回", comment);
        return toTaskResponse(savedTask);
    }

    private PersonEntity getPerson(Long personId) {
        return personRepository.findByIdAndDeletedAtIsNull(personId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PERSON_NOT_FOUND));
    }

    private CheckTaskEntity getTaskEntity(Long taskId) {
        return checkTaskRepository.findById(taskId)
                .orElseThrow(() -> new BusinessException(ErrorCode.REVIEW_TASK_NOT_FOUND));
    }

    private AuditRecordEntity getRecord(Long recordId) {
        return auditRecordRepository.findById(recordId)
                .orElseThrow(() -> new BusinessException("REVIEW_RECORD_NOT_FOUND", "审核记录不存在"));
    }

    private void ensurePending(CheckTaskEntity task) {
        if (!STATUS_PENDING.equals(task.getStatus())) {
            throw new BusinessException("REVIEW_TASK_ALREADY_HANDLED", "审核任务已处理，不能重复操作");
        }
    }

    private void applyTargetAfterApproval(AuditRecordEntity record, LocalDateTime now) {
        switch (record.getTargetType()) {
            case TARGET_PERSON -> {
                PersonEntity person = getPerson(record.getTargetId());
                person.setDataStatus(PERSON_STATUS_OFFICIAL);
                person.setUpdatedAt(now);
                personRepository.save(person);
            }
            case TARGET_RELATIONSHIP -> relationshipRepository.findById(record.getTargetId()).ifPresent(entity -> {
                entity.setDataStatus(PERSON_STATUS_OFFICIAL);
                entity.setUpdatedAt(now);
                relationshipRepository.save(entity);
            });
            case TARGET_SOURCE -> sourceRepository.findById(record.getTargetId()).ifPresent(entity -> {
                entity.setVerificationStatus("verified");
                sourceRepository.save(entity);
            });
            case TARGET_BRANCH -> branchRepository.findById(record.getTargetId()).ifPresent(entity -> {
                entity.setStatus("active");
                entity.setUpdatedAt(now);
                branchRepository.save(entity);
            });
            case TARGET_GENERATION_SCHEME -> genSchemeRepository.findById(record.getTargetId()).ifPresent(entity -> {
                entity.setStatus("active");
                genSchemeRepository.save(entity);
            });
            default -> { }
        }
    }

    private void rollbackTargetAfterReject(AuditRecordEntity record, LocalDateTime now) {
        switch (record.getTargetType()) {
            case TARGET_PERSON -> {
                PersonEntity person = getPerson(record.getTargetId());
                person.setDataStatus(PERSON_STATUS_DRAFT);
                person.setUpdatedAt(now);
                personRepository.save(person);
            }
            case TARGET_RELATIONSHIP -> relationshipRepository.findById(record.getTargetId()).ifPresent(entity -> {
                entity.setDataStatus(PERSON_STATUS_DRAFT);
                entity.setUpdatedAt(now);
                relationshipRepository.save(entity);
            });
            case TARGET_SOURCE -> sourceRepository.findById(record.getTargetId()).ifPresent(entity -> {
                entity.setVerificationStatus("unverified");
                sourceRepository.save(entity);
            });
            case TARGET_BRANCH -> branchRepository.findById(record.getTargetId()).ifPresent(entity -> {
                entity.setStatus("draft");
                entity.setUpdatedAt(now);
                branchRepository.save(entity);
            });
            case TARGET_GENERATION_SCHEME -> genSchemeRepository.findById(record.getTargetId()).ifPresent(entity -> {
                entity.setStatus("draft");
                genSchemeRepository.save(entity);
            });
            default -> { }
        }
    }

    private CheckTaskResponse toTaskResponse(CheckTaskEntity task) {
        return new CheckTaskResponse(
                task.getId(), task.getClanId(), task.getRevisionId(), task.getReviewLevel(), task.getReviewerId(),
                task.getReviewerRole(), task.getBranchId(), task.getStatus(), task.getReviewComment(),
                task.getReviewedAt(), task.getCreatedAt()
        );
    }

    private AuditRecordResponse toRecordResponse(AuditRecordEntity record) {
        return new AuditRecordResponse(
                record.getId(), record.getClanId(), record.getTargetType(), record.getTargetId(), record.getChangeType(),
                record.getDiffSummary(), record.getSubmitterId(), record.getSubmitTime(), record.getStatus(),
                record.getApprovedAt(), record.getRejectedReason()
        );
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
