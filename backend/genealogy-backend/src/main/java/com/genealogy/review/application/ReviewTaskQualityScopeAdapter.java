package com.genealogy.review.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.quality.check.QualityCheckScopeAdapter;
import com.genealogy.quality.check.QualityCheckScopeType;
import com.genealogy.quality.check.QualityCheckSubject;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

public class ReviewTaskQualityScopeAdapter implements QualityCheckScopeAdapter {

    private static final String REVIEW_APPROVE = "review_task:approve";
    private static final String STATUS_PENDING = "pending";

    private final CheckTaskRepository checkTaskRepository;
    private final AuditRecordRepository auditRecordRepository;
    private final AuthorizationApplicationService authorizationApplicationService;

    public ReviewTaskQualityScopeAdapter(
            CheckTaskRepository checkTaskRepository,
            AuditRecordRepository auditRecordRepository,
            AuthorizationApplicationService authorizationApplicationService
    ) {
        this.checkTaskRepository = checkTaskRepository;
        this.auditRecordRepository = auditRecordRepository;
        this.authorizationApplicationService = authorizationApplicationService;
    }

    @Override
    public boolean supports(QualityCheckScopeType scopeType) {
        return scopeType == QualityCheckScopeType.REVIEW_TASK || scopeType == QualityCheckScopeType.QUERY;
    }

    @Override
    public ResolvedQualityScope resolve(QualityCheckScopeRequest request) {
        if (!supports(request.scopeType())) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "审核质量检查不支持该检查范围");
        }
        List<CheckTaskEntity> tasks = request.scopeType() == QualityCheckScopeType.REVIEW_TASK
                ? resolveTaskIds(request.subjectIds())
                : resolveQuery(request.clanId(), request.query());
        validate(request.clanId(), request.actorId(), tasks);
        Map<Long, AuditRecordEntity> records = auditRecordRepository.findAllById(
                tasks.stream().map(CheckTaskEntity::getRevisionId).toList()
        ).stream().collect(Collectors.toMap(AuditRecordEntity::getId, Function.identity()));
        List<QualityCheckSubject> subjects = tasks.stream().map(task -> {
            AuditRecordEntity record = records.get(task.getRevisionId());
            String payload = record == null ? null : record.getNewPayload() == null ? record.getOldPayload() : record.getNewPayload();
            return new QualityCheckSubject(String.valueOf(task.getId()), record == null ? null : record.getTargetType(), payload);
        }).toList();
        return new ResolvedQualityScope(
                request.scopeType(),
                subjects,
                tasks.stream().map(task -> String.valueOf(task.getId())).sorted().toList()
        );
    }

    private List<CheckTaskEntity> resolveTaskIds(List<String> values) {
        if (values == null || values.isEmpty()) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "请选择至少一个审核任务");
        }
        List<Long> ids;
        try {
            ids = values.stream().filter(Objects::nonNull).map(Long::valueOf).distinct().toList();
        } catch (NumberFormatException ex) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "审核任务标识无效");
        }
        List<CheckTaskEntity> tasks = checkTaskRepository.findAllById(ids);
        if (tasks.size() != ids.size()) {
            throw new BusinessException("REVIEW_QUALITY_NOT_FOUND", "部分审核任务不存在");
        }
        return tasks;
    }

    private List<CheckTaskEntity> resolveQuery(Long clanId, Map<String, Object> query) {
        if (query == null) {
            throw new BusinessException("REVIEW_QUALITY_INVALID_SCOPE", "查询范围不能为空");
        }
        String view = lower(query.getOrDefault("view", "pending"));
        if (!"pending".equals(view)) {
            throw new BusinessException("REVIEW_QUALITY_NOT_REVIEWABLE", "仅待审核列表可触发质量检查");
        }
        List<CheckTaskEntity> tasks = checkTaskRepository.findByClanIdAndStatus(clanId, STATUS_PENDING);
        Long branchId = longValue(query.get("branchId"));
        if (branchId != null) tasks = tasks.stream().filter(task -> Objects.equals(branchId, task.getBranchId())).toList();
        String targetType = lower(query.get("targetType"));
        if (!targetType.isBlank()) {
            Map<Long, AuditRecordEntity> records = auditRecordRepository.findAllById(tasks.stream().map(CheckTaskEntity::getRevisionId).toList())
                    .stream().collect(Collectors.toMap(AuditRecordEntity::getId, Function.identity()));
            tasks = tasks.stream().filter(task -> {
                AuditRecordEntity record = records.get(task.getRevisionId());
                return record != null && targetType.equals(lower(record.getTargetType()));
            }).toList();
        }
        return tasks.stream().sorted(Comparator.comparing(CheckTaskEntity::getId)).limit(200).toList();
    }

    private void validate(Long clanId, Long actorId, List<CheckTaskEntity> tasks) {
        for (CheckTaskEntity task : tasks) {
            if (!Objects.equals(clanId, task.getClanId())) {
                throw new BusinessException("REVIEW_QUALITY_FORBIDDEN", "审核任务不属于当前宗族");
            }
            if (!STATUS_PENDING.equals(lower(task.getStatus()))) {
                throw new BusinessException("REVIEW_QUALITY_TASK_STATE_CONFLICT", "仅待审核任务可执行质量检查");
            }
            authorizationApplicationService.requireBranchPermission(clanId, actorId, task.getBranchId(), REVIEW_APPROVE);
        }
    }

    private Long longValue(Object value) {
        if (value instanceof Number number) return number.longValue();
        if (value == null || String.valueOf(value).isBlank()) return null;
        try {
            return Long.valueOf(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String lower(Object value) {
        return value == null ? "" : String.valueOf(value).trim().toLowerCase(Locale.ROOT);
    }
}
