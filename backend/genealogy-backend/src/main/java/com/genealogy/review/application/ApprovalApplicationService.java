package com.genealogy.review.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.common.exception.ErrorCode;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.review.dto.AuditRecordResponse;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.dto.PersonSubmitReviewRequest;
import com.genealogy.review.dto.ReviewDecisionRequest;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ApprovalApplicationService {

    private static final String TARGET_PERSON = "person";
    private static final String CHANGE_SUBMIT_REVIEW = "submit_review";
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";
    private static final String PERSON_STATUS_DRAFT = "draft";
    private static final String PERSON_STATUS_PENDING_REVIEW = "pending_review";
    private static final String PERSON_STATUS_OFFICIAL = "official";

    private final PersonRepository personRepository;
    private final AuditRecordRepository auditRecordRepository;
    private final CheckTaskRepository checkTaskRepository;
    private final OperationLogApplicationService operationLogApplicationService;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ApprovalApplicationService(
            PersonRepository personRepository,
            AuditRecordRepository auditRecordRepository,
            CheckTaskRepository checkTaskRepository,
            OperationLogApplicationService operationLogApplicationService,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.personRepository = personRepository;
        this.auditRecordRepository = auditRecordRepository;
        this.checkTaskRepository = checkTaskRepository;
        this.operationLogApplicationService = operationLogApplicationService;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Transactional
    public CheckTaskResponse submitPerson(Long personId, PersonSubmitReviewRequest request) {
        PersonEntity person = getPerson(personId);
        authorizationApplicationService.requireClanMember(person.getClanId(), request.submitterId());
        if (auditRecordRepository.existsByTargetTypeAndTargetIdAndStatus(TARGET_PERSON, personId, STATUS_PENDING)) {
            throw new BusinessException("REVIEW_ALREADY_PENDING", "该人物已存在待审核任务");
        }

        LocalDateTime now = LocalDateTime.now();
        AuditRecordEntity record = new AuditRecordEntity();
        record.setClanId(person.getClanId());
        record.setTargetType(TARGET_PERSON);
        record.setTargetId(personId);
        record.setChangeType(CHANGE_SUBMIT_REVIEW);
        record.setDiffSummary(trimToNull(request.diffSummary()));
        record.setSubmitterId(request.submitterId());
        record.setSubmitTime(now);
        record.setStatus(STATUS_PENDING);
        AuditRecordEntity savedRecord = auditRecordRepository.save(record);

        CheckTaskEntity task = new CheckTaskEntity();
        task.setClanId(person.getClanId());
        task.setRevisionId(savedRecord.getId());
        task.setReviewLevel(1);
        task.setReviewerRole("clan_admin");
        task.setBranchId(person.getBranchId());
        task.setStatus(STATUS_PENDING);
        task.setCreatedAt(now);
        CheckTaskEntity savedTask = checkTaskRepository.save(task);

        person.setDataStatus(PERSON_STATUS_PENDING_REVIEW);
        person.setUpdatedAt(now);
        personRepository.save(person);

        operationLogApplicationService.record(person.getClanId(), request.submitterId(), "review_submit", TARGET_PERSON, personId, "提交人物审核：" + person.getName(), request.diffSummary());
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
        authorizationApplicationService.requireClanMember(record.getClanId(), request.reviewerId());
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
        authorizationApplicationService.requireClanMember(record.getClanId(), request.reviewerId());
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
        if (!TARGET_PERSON.equals(record.getTargetType())) {
            return;
        }
        PersonEntity person = getPerson(record.getTargetId());
        person.setDataStatus(PERSON_STATUS_OFFICIAL);
        person.setUpdatedAt(now);
        personRepository.save(person);
    }

    private void rollbackTargetAfterReject(AuditRecordEntity record, LocalDateTime now) {
        if (!TARGET_PERSON.equals(record.getTargetType())) {
            return;
        }
        PersonEntity person = getPerson(record.getTargetId());
        person.setDataStatus(PERSON_STATUS_DRAFT);
        person.setUpdatedAt(now);
        personRepository.save(person);
    }

    private CheckTaskResponse toTaskResponse(CheckTaskEntity task) {
        return new CheckTaskResponse(
                task.getId(),
                task.getClanId(),
                task.getRevisionId(),
                task.getReviewLevel(),
                task.getReviewerId(),
                task.getReviewerRole(),
                task.getBranchId(),
                task.getStatus(),
                task.getReviewComment(),
                task.getReviewedAt(),
                task.getCreatedAt()
        );
    }

    private AuditRecordResponse toRecordResponse(AuditRecordEntity record) {
        return new AuditRecordResponse(
                record.getId(),
                record.getClanId(),
                record.getTargetType(),
                record.getTargetId(),
                record.getChangeType(),
                record.getDiffSummary(),
                record.getSubmitterId(),
                record.getSubmitTime(),
                record.getStatus(),
                record.getApprovedAt(),
                record.getRejectedReason()
        );
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
