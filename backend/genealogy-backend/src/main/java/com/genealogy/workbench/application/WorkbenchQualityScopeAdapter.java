package com.genealogy.workbench.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.common.exception.BusinessException;
import com.genealogy.quality.check.QualityCheckScopeAdapter;
import com.genealogy.quality.check.QualityCheckScopeType;
import com.genealogy.quality.check.QualityCheckSubject;
import com.genealogy.workbench.dto.WorkbenchTaskResponse;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Component
public class WorkbenchQualityScopeAdapter implements QualityCheckScopeAdapter {

    private static final int LIMIT = 200;
    private final WorkbenchApplicationService workbenchApplicationService;
    private final ObjectMapper objectMapper;

    public WorkbenchQualityScopeAdapter(WorkbenchApplicationService workbenchApplicationService, ObjectMapper objectMapper) {
        this.workbenchApplicationService = workbenchApplicationService;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean supports(QualityCheckScopeType scopeType) {
        return scopeType == QualityCheckScopeType.WORKBENCH_SESSION
                || scopeType == QualityCheckScopeType.DRAFT_IDS
                || scopeType == QualityCheckScopeType.QUERY;
    }

    @Override
    public ResolvedQualityScope resolve(QualityCheckScopeRequest request) {
        if (!supports(request.scopeType())) {
            throw new BusinessException("WORKBENCH_QUALITY_INVALID_SCOPE", "不支持的修谱质量检查范围");
        }
        Map<String, Object> query = request.query() == null ? Map.of() : request.query();
        Long branchId = longValue(query.get("branchId"));
        List<String> types = strings(query.get("types"));
        List<String> statuses = strings(query.get("statuses"));
        List<String> risks = strings(query.get("risks"));
        List<WorkbenchTaskResponse> tasks = workbenchApplicationService.tasks(
                request.clanId(), branchId, text(query.get("taskName")), text(query.get("keyword")),
                types, statuses, risks, text(query.get("creator")), date(query.get("createdFrom")),
                date(query.get("createdTo")), 1, LIMIT, request.actorId()).records();

        if (request.scopeType() == QualityCheckScopeType.DRAFT_IDS) {
            Set<String> selected = Set.copyOf(request.subjectIds() == null ? List.of() : request.subjectIds());
            if (selected.isEmpty()) {
                throw new BusinessException("WORKBENCH_QUALITY_INVALID_SCOPE", "请选择至少一个草稿或任务");
            }
            tasks = tasks.stream().filter(task -> selected.contains(task.key())).toList();
        }
        if (tasks.isEmpty()) {
            throw new BusinessException("WORKBENCH_QUALITY_NOT_REVIEWABLE", "当前范围没有可检查的修谱草稿或任务");
        }
        List<QualityCheckSubject> subjects = tasks.stream().map(this::toSubject).toList();
        return new ResolvedQualityScope(request.scopeType(), subjects, subjects.stream().map(QualityCheckSubject::subjectId).toList());
    }

    private QualityCheckSubject toSubject(WorkbenchTaskResponse task) {
        String targetType = switch (task.type()) {
            case "relationship_check" -> "relationship";
            case "generation_mismatch", "missing_source" -> "person";
            default -> "workbench_task";
        };
        Map<String, Object> payload = switch (task.type()) {
            case "relationship_check" -> Map.of(
                    "fromPersonId", task.relatedEntryId() == null ? "candidate" : task.relatedEntryId(),
                    "toPersonId", task.relatedEntryId() == null ? "candidate" : task.relatedEntryId(),
                    "evidence", List.of());
            case "generation_mismatch" -> Map.of(
                    "generationNo", nullValue(),
                    "generationWord", "",
                    "evidence", List.of("workbench-task"));
            case "missing_source" -> Map.of(
                    "generationNo", 1,
                    "generationWord", "待核",
                    "evidence", List.of());
            default -> Map.of("taskType", task.type(), "evidence", List.of("workflow"));
        };
        try {
            return new QualityCheckSubject(task.key(), targetType, objectMapper.writeValueAsString(payload));
        } catch (JsonProcessingException ex) {
            throw new BusinessException("WORKBENCH_QUALITY_EXECUTION_FAILED", "修谱检查对象无法序列化");
        }
    }

    private Object nullValue() {
        return "";
    }

    private String text(Object value) {
        String result = value == null ? "" : String.valueOf(value).trim();
        return result.isEmpty() ? null : result;
    }

    private Long longValue(Object value) {
        if (value == null || String.valueOf(value).isBlank()) return null;
        try {
            return Long.valueOf(String.valueOf(value));
        } catch (NumberFormatException ex) {
            throw new BusinessException("WORKBENCH_QUALITY_INVALID_SCOPE", "支派范围无效");
        }
    }

    private LocalDate date(Object value) {
        String text = text(value);
        return text == null ? null : LocalDate.parse(text);
    }

    private List<String> strings(Object value) {
        if (value instanceof List<?> values) {
            return values.stream().filter(Objects::nonNull).map(String::valueOf).filter(item -> !item.isBlank()).toList();
        }
        String text = text(value);
        return text == null ? List.of() : List.of(text);
    }
}
