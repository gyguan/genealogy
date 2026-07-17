package com.genealogy.workbench.application;

import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.entity.BranchEntity;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.common.api.PageResponse;
import com.genealogy.person.entity.PersonEntity;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.source.repository.SourceRepository;
import com.genealogy.workbench.dto.WorkbenchSummaryResponse;
import com.genealogy.workbench.dto.WorkbenchTaskResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class WorkbenchApplicationService {

    private static final int BUILD_TASK_LIMIT = 200;
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_PENDING_REVIEW = "pending_review";
    private static final String CREATOR_SYSTEM_RULE = "系统规则";
    private static final String CREATOR_REVIEW_FLOW = "审核流程";

    private final AuthorizationApplicationService authorizationApplicationService;
    private final ClanRepository clanRepository;
    private final PersonRepository personRepository;
    private final BranchRepository branchRepository;
    private final SourceRepository sourceRepository;
    private final CheckTaskRepository checkTaskRepository;

    public WorkbenchApplicationService(
            AuthorizationApplicationService authorizationApplicationService,
            ClanRepository clanRepository,
            PersonRepository personRepository,
            BranchRepository branchRepository,
            SourceRepository sourceRepository,
            CheckTaskRepository checkTaskRepository
    ) {
        this.authorizationApplicationService = authorizationApplicationService;
        this.clanRepository = clanRepository;
        this.personRepository = personRepository;
        this.branchRepository = branchRepository;
        this.sourceRepository = sourceRepository;
        this.checkTaskRepository = checkTaskRepository;
    }

    @Transactional(readOnly = true)
    public WorkbenchSummaryResponse summary(Long clanId, Long branchId, Long actorId) {
        authorizationApplicationService.requireClanMember(clanId, actorId);
        List<WorkbenchTaskResponse> tasks = buildTasks(clanId, branchId);
        return new WorkbenchSummaryResponse(
                tasks.size(),
                tasks.stream().filter(task -> "high".equals(task.risk())).count(),
                tasks.stream().filter(task -> "missing_source".equals(task.type())).count(),
                tasks.stream().filter(task -> "generation_mismatch".equals(task.type())).count()
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<WorkbenchTaskResponse> tasks(
            Long clanId,
            Long branchId,
            String taskName,
            String keyword,
            List<String> types,
            List<String> statuses,
            List<String> risks,
            String creator,
            LocalDate createdFrom,
            LocalDate createdTo,
            int pageNo,
            int pageSize,
            Long actorId
    ) {
        authorizationApplicationService.requireClanMember(clanId, actorId);
        String creatorName = creatorNameOf(creator);
        List<WorkbenchTaskResponse> filtered = buildTasks(clanId, branchId).stream()
                .filter(task -> containsIgnoreCase(task.taskName(), taskName))
                .filter(task -> matchesKeyword(task, keyword))
                .filter(task -> matchesAny(types, task.type()))
                .filter(task -> matchesAny(statuses, task.status()))
                .filter(task -> matchesAny(risks, task.risk()))
                .filter(task -> isBlank(creatorName) || Objects.equals(task.creatorName(), creatorName))
                .filter(task -> withinCreatedDate(task.createdAt(), createdFrom, createdTo))
                .toList();
        int normalizedPageNo = Math.max(1, pageNo);
        int normalizedPageSize = Math.max(1, Math.min(pageSize, BUILD_TASK_LIMIT));
        int fromIndex = Math.min((normalizedPageNo - 1) * normalizedPageSize, filtered.size());
        int toIndex = Math.min(fromIndex + normalizedPageSize, filtered.size());
        return PageResponse.of(filtered.subList(fromIndex, toIndex), filtered.size(), normalizedPageNo, normalizedPageSize);
    }

    private List<WorkbenchTaskResponse> buildTasks(Long clanId, Long branchId) {
        Map<Long, BranchEntity> branchMap = branchRepository.findByClanIdOrderByLevelAscSortOrderAscIdAsc(clanId).stream()
                .collect(Collectors.toMap(BranchEntity::getId, Function.identity(), (left, right) -> left));
        List<PersonEntity> people = branchId == null
                ? personRepository.findByClanIdAndDeletedAtIsNull(clanId)
                : personRepository.findByClanIdAndBranchIdAndDeletedAtIsNull(clanId, branchId);
        long sourceCount = sourceRepository.findByClanId(clanId, PageRequest.of(0, 1)).getTotalElements();
        List<CheckTaskEntity> reviewTasks = checkTaskRepository.findByClanIdAndStatus(clanId, STATUS_PENDING).stream()
                .filter(task -> branchId == null || Objects.equals(task.getBranchId(), branchId))
                .limit(BUILD_TASK_LIMIT)
                .toList();
        String bookName = bookName(clanId);

        List<WorkbenchTaskResponse> tasks = new ArrayList<>();
        reviewTasks.forEach(task -> tasks.add(reviewFollowUpTask(task, bookName)));
        people.stream()
                .filter(this::hasGenerationIssue)
                .limit(BUILD_TASK_LIMIT)
                .map(person -> generationMismatchTask(person, branchMap, bookName))
                .forEach(tasks::add);
        if (!people.isEmpty() && sourceCount == 0) {
            LocalDateTime createdAt = people.stream().map(PersonEntity::getCreatedAt).filter(Objects::nonNull).min(LocalDateTime::compareTo).orElse(null);
            tasks.add(missingSourceTask(branchId, branchMap, sourceCount, bookName, createdAt));
        }
        if (people.size() >= 2) {
            tasks.add(relationshipCheckTask(people.get(0), people.get(1), branchMap, bookName));
        }
        return tasks.stream().limit(BUILD_TASK_LIMIT).toList();
    }

    private WorkbenchTaskResponse reviewFollowUpTask(CheckTaskEntity task, String bookName) {
        String currentStatus = statusText(task.getStatus());
        return new WorkbenchTaskResponse(
                "review-" + task.getId(),
                "审核任务跟进",
                bookName,
                CREATOR_REVIEW_FLOW,
                task.getCreatedAt(),
                "review_follow_up",
                "审核跟进",
                "审核任务",
                task.getBranchId() == null ? "按审核范围查看" : "支派范围内",
                "medium",
                "processing",
                currentStatus,
                "进入审核中心查看差异并处理审核结论",
                "该任务已经进入审核流程，工作台只负责提醒和解释，不直接提供审批通过或驳回动作。",
                "审核任务",
                "审核任务可能包含正式入谱前的关键变更，需要由审核中心按规则处理，避免绕过审核。",
                false,
                "reviewCenter",
                String.valueOf(task.getId()),
                "进入审核中心",
                "当前审核状态：" + currentStatus + "。请进入审核中心查看差异、流转记录和审核意见。",
                task.getCreatedAt()
        );
    }

    private WorkbenchTaskResponse generationMismatchTask(PersonEntity person, Map<Long, BranchEntity> branchMap, String bookName) {
        String name = personName(person);
        String missingFields = generationMissingFields(person);
        return new WorkbenchTaskResponse(
                "generation-" + person.getId(),
                "补充" + name + "字辈与代次",
                bookName,
                CREATOR_SYSTEM_RULE,
                person.getCreatedAt(),
                "generation_mismatch",
                "字辈/代次待补",
                name,
                branchName(person.getBranchId(), branchMap),
                "medium",
                "pending",
                "待补全",
                "进入人物档案补充代次与字辈，提交审核前完成校验",
                "该人物档案缺少代次或字辈信息，可能影响世系排序、字辈校验和谱牒展示。",
                "人物档案：" + name,
                "代次或字辈缺失会导致人物在世系中的位置不清晰，审核前建议补齐。",
                false,
                "personArchive",
                String.valueOf(person.getId()),
                "进入人物档案",
                "仍缺失字段：" + missingFields + "。补齐后刷新工作台，若不再命中该问题，说明校验已通过或不再符合当前筛选条件。",
                person.getUpdatedAt() == null ? person.getCreatedAt() : person.getUpdatedAt()
        );
    }

    private WorkbenchTaskResponse missingSourceTask(
            Long branchId,
            Map<Long, BranchEntity> branchMap,
            long sourceCount,
            String bookName,
            LocalDateTime createdAt
    ) {
        return new WorkbenchTaskResponse(
                "missing-source-" + (branchId == null ? "all" : branchId),
                "补充族谱来源证据",
                bookName,
                CREATOR_SYSTEM_RULE,
                createdAt,
                "missing_source",
                "来源证据缺失",
                "当前宗族人物档案",
                branchId == null ? "全宗族" : branchName(branchId, branchMap),
                "high",
                "blocked",
                "阻塞入谱",
                "进入来源资料库维护老谱、口述、照片等证据后再绑定对象",
                "当前宗族已有入谱人物，但尚未维护来源资料，正式提交审核前缺少证据支撑。",
                branchId == null ? "当前宗族人物档案" : "支派人物档案：" + branchName(branchId, branchMap),
                "来源证据缺失会降低谱牒可信度，也会阻塞正式入谱审核。",
                true,
                "sourceLibrary",
                null,
                "进入来源资料库",
                "当前来源资料数量：" + sourceCount + "。新增或选择来源资料后刷新工作台，若该任务消失，通常表示缺来源问题已处理或不再符合当前筛选条件。",
                LocalDateTime.now()
        );
    }

    private WorkbenchTaskResponse relationshipCheckTask(
            PersonEntity left,
            PersonEntity right,
            Map<Long, BranchEntity> branchMap,
            String bookName
    ) {
        String objectName = personName(left) + " 与 " + personName(right);
        return new WorkbenchTaskResponse(
                "relationship-check-candidate",
                "复核" + objectName + "关系",
                bookName,
                CREATOR_SYSTEM_RULE,
                left.getCreatedAt(),
                "relationship_check",
                "关系复核建议",
                objectName,
                branchName(left.getBranchId(), branchMap),
                "low",
                "pending",
                "待复核",
                "进入世系图谱或建谱向导核对亲属关系，避免重复或错连",
                "系统发现当前宗族已有多个人物档案，建议在提交前复核关键亲属关系是否完整、重复或错连。",
                "关系对象：" + personName(left) + "、" + personName(right),
                "关系复核可以提前发现断代、错连、重复关系等问题，降低后续审核返工。",
                false,
                "treeProduct",
                String.valueOf(left.getId()),
                "进入世系图谱",
                "当前为低风险复核建议。若世系图谱已确认关系完整，可继续关注更高风险任务。",
                LocalDateTime.now()
        );
    }

    private boolean matchesKeyword(WorkbenchTaskResponse task, String keyword) {
        if (isBlank(keyword)) return true;
        return containsIgnoreCase(task.taskName(), keyword)
                || containsIgnoreCase(task.bookName(), keyword)
                || containsIgnoreCase(task.typeText(), keyword)
                || containsIgnoreCase(task.objectName(), keyword)
                || containsIgnoreCase(task.branchName(), keyword)
                || containsIgnoreCase(task.suggestion(), keyword);
    }

    private boolean matchesAny(List<String> expected, String actual) {
        return expected == null || expected.isEmpty() || expected.contains(actual);
    }

    private boolean containsIgnoreCase(String actual, String expected) {
        return isBlank(expected) || (actual != null && actual.toLowerCase().contains(expected.trim().toLowerCase()));
    }

    private boolean withinCreatedDate(LocalDateTime createdAt, LocalDate from, LocalDate to) {
        if (from == null && to == null) return true;
        if (createdAt == null) return false;
        LocalDate date = createdAt.toLocalDate();
        return (from == null || !date.isBefore(from)) && (to == null || !date.isAfter(to));
    }

    private String creatorNameOf(String creator) {
        if ("system_rule".equals(creator)) return CREATOR_SYSTEM_RULE;
        if ("review_flow".equals(creator)) return CREATOR_REVIEW_FLOW;
        return "";
    }

    private String bookName(Long clanId) {
        ClanEntity clan = clanRepository.findById(clanId).orElse(null);
        if (clan == null || isBlank(clan.getClanName())) return "未命名族谱";
        return clan.getClanName().endsWith("族谱") ? clan.getClanName() : clan.getClanName() + "族谱";
    }

    private boolean hasGenerationIssue(PersonEntity person) {
        return person.getGenerationNo() == null || isBlank(person.getGenerationWord());
    }

    private String generationMissingFields(PersonEntity person) {
        List<String> fields = new ArrayList<>();
        if (person.getGenerationNo() == null) fields.add("代次");
        if (isBlank(person.getGenerationWord())) fields.add("字辈");
        return fields.isEmpty() ? "无" : String.join("、", fields);
    }

    private String personName(PersonEntity person) {
        return isBlank(person.getName()) ? "未命名人物" : person.getName();
    }

    private String branchName(Long branchId, Map<Long, BranchEntity> branchMap) {
        BranchEntity branch = branchMap.get(branchId);
        return branch == null || isBlank(branch.getBranchName()) ? "支派待维护" : branch.getBranchName();
    }

    private String statusText(String status) {
        if (STATUS_PENDING.equals(status) || STATUS_PENDING_REVIEW.equals(status)) return "待审核";
        if ("rejected".equals(status)) return "已退回";
        if ("approved".equals(status) || "official".equals(status)) return "已完成";
        return isBlank(status) ? "待处理" : "处理中";
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
