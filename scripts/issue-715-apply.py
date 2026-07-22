from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str, label: str) -> None:
    text = read(path)
    if old not in text:
        raise RuntimeError(f'{label} anchor missing')
    write(path, text.replace(old, new, 1))


# Backend: add clan submission to the existing review application service.
approval = 'backend/genealogy-backend/src/main/java/com/genealogy/review/application/ApprovalApplicationService.java'
text = read(approval)
text = text.replace(
    'import com.genealogy.branch.repository.BranchRepository;\n',
    'import com.genealogy.branch.repository.BranchRepository;\nimport com.genealogy.clan.entity.ClanEntity;\nimport com.genealogy.clan.repository.ClanRepository;\n',
    1,
)
text = text.replace(
    'import org.springframework.stereotype.Service;\n',
    'import org.springframework.beans.factory.annotation.Autowired;\nimport org.springframework.stereotype.Service;\n',
    1,
)
text = text.replace(
    '    private static final String TARGET_GENERATION_SCHEME = "generation_scheme";\n',
    '    private static final String TARGET_GENERATION_SCHEME = "generation_scheme";\n    private static final String TARGET_CLAN = "clan";\n',
    1,
)
text = text.replace(
    '    private static final String SOURCE_UPDATE = "source:update";\n',
    '    private static final String SOURCE_UPDATE = "source:update";\n    private static final String CLAN_UPDATE = "clan:update";\n',
    1,
)
text = text.replace(
    '    private final BranchRepository branchRepository;\n',
    '    private final BranchRepository branchRepository;\n    private ClanRepository clanRepository;\n',
    1,
)
constructor_anchor = '''        this.revisionApplyService = revisionApplyService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CheckTaskResponse submitPerson'''
constructor_replacement = '''        this.revisionApplyService = revisionApplyService;
        this.objectMapper = objectMapper;
    }

    @Autowired
    void setClanRepository(ClanRepository clanRepository) {
        this.clanRepository = clanRepository;
    }

    @Transactional
    public CheckTaskResponse submitClan(Long clanId, TargetSubmitRequest request) {
        ClanEntity clan = clanRepository.findById(clanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLAN_NOT_FOUND));
        authorizationApplicationService.requirePermission(clanId, request.submitterId(), CLAN_UPDATE);
        ensureReviewSubmitAllowed(TARGET_CLAN, clanId, clan.getStatus());
        String beforePayload = toJson(clan);
        clan.setStatus(OBJECT_STATUS_PENDING_REVIEW);
        clan.setUpdatedAt(LocalDateTime.now());
        String afterPayload = toJson(clan);
        CheckTaskResponse response = submitTarget(
                clanId, TARGET_CLAN, clanId, null, request.submitterId(), request.diffSummary(),
                "submit clan review: " + clan.getClanName(), beforePayload, afterPayload
        );
        clanRepository.save(clan);
        return response;
    }

    @Transactional
    public CheckTaskResponse submitPerson'''
if constructor_anchor not in text:
    raise RuntimeError('approval constructor anchor missing')
text = text.replace(constructor_anchor, constructor_replacement, 1)
generic_anchor = '''        return switch (normalize(request.targetType())) {
            case TARGET_PERSON -> submitPerson(request.targetId(), new PersonSubmitReviewRequest(submitterId, request.comment()));'''
generic_replacement = '''        return switch (normalize(request.targetType())) {
            case TARGET_CLAN -> {
                if (!Objects.equals(clanId, request.targetId())) {
                    throw new BusinessException("REVIEW_TARGET_SCOPE_MISMATCH", "宗族审核目标与当前宗族不一致");
                }
                yield submitClan(request.targetId(), targetRequest);
            }
            case TARGET_PERSON -> submitPerson(request.targetId(), new PersonSubmitReviewRequest(submitterId, request.comment()));'''
if generic_anchor not in text:
    raise RuntimeError('approval generic switch anchor missing')
text = text.replace(generic_anchor, generic_replacement, 1)
text = text.replace(
    '            case "generation_scheme" -> "字辈方案审核";\n',
    '            case "generation_scheme" -> "字辈方案审核";\n            case "clan" -> "宗族变更审核";\n',
    1,
)
write(approval, text)

# Backend: apply/reject clan revisions through the same revision service.
revision = 'backend/genealogy-backend/src/main/java/com/genealogy/review/application/RevisionApplyService.java'
text = read(revision)
text = text.replace(
    'import com.genealogy.branch.repository.BranchRepository;\n',
    'import com.genealogy.branch.repository.BranchRepository;\nimport com.genealogy.clan.entity.ClanEntity;\nimport com.genealogy.clan.repository.ClanRepository;\n',
    1,
)
text = text.replace(
    'import org.springframework.stereotype.Service;\n',
    'import org.springframework.beans.factory.annotation.Autowired;\nimport org.springframework.stereotype.Service;\n',
    1,
)
text = text.replace(
    '    private static final String TARGET_GENERATION_SCHEME = "generation_scheme";\n',
    '    private static final String TARGET_GENERATION_SCHEME = "generation_scheme";\n    private static final String TARGET_CLAN = "clan";\n',
    1,
)
text = text.replace(
    '    private final BranchRepository branchRepository;\n',
    '    private final BranchRepository branchRepository;\n    private ClanRepository clanRepository;\n',
    1,
)
constructor_anchor = '''        this.importJobRowRepository = importJobRowRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void apply'''
constructor_replacement = '''        this.importJobRowRepository = importJobRowRepository;
        this.objectMapper = objectMapper;
    }

    @Autowired
    void setClanRepository(ClanRepository clanRepository) {
        this.clanRepository = clanRepository;
    }

    @Transactional
    public void apply'''
if constructor_anchor not in text:
    raise RuntimeError('revision constructor anchor missing')
text = text.replace(constructor_anchor, constructor_replacement, 1)
text = text.replace(
    '        if (TARGET_PERSON.equals(targetType)) { applyPerson(revision, applyTime); return; }\n',
    '        if (TARGET_CLAN.equals(targetType)) { applyClan(revision, applyTime); return; }\n        if (TARGET_PERSON.equals(targetType)) { applyPerson(revision, applyTime); return; }\n',
    1,
)
text = text.replace(
    '        if (TARGET_PERSON.equals(targetType)) { rejectPerson(revision, rejectTime); return; }\n',
    '        if (TARGET_CLAN.equals(targetType)) { rejectClan(revision, rejectTime); return; }\n        if (TARGET_PERSON.equals(targetType)) { rejectPerson(revision, rejectTime); return; }\n',
    1,
)
apply_anchor = '''    private void applyPerson(AuditRecordEntity revision, LocalDateTime applyTime) {'''
apply_methods = '''    private void applyClan(AuditRecordEntity revision, LocalDateTime applyTime) {
        ClanEntity snapshot = readPayload(revision.getNewPayload(), ClanEntity.class);
        if (snapshot == null) {
            clanRepository.findById(revision.getTargetId()).ifPresent(entity -> {
                entity.setStatus(STATUS_OFFICIAL);
                entity.setUpdatedAt(applyTime);
                clanRepository.save(entity);
            });
            return;
        }
        snapshot.setId(revision.getTargetId());
        snapshot.setStatus(STATUS_OFFICIAL);
        snapshot.setUpdatedAt(applyTime);
        clanRepository.save(snapshot);
    }

    private void rejectClan(AuditRecordEntity revision, LocalDateTime rejectTime) {
        clanRepository.findById(revision.getTargetId()).ifPresent(entity -> {
            entity.setStatus(STATUS_REJECTED);
            entity.setUpdatedAt(rejectTime);
            clanRepository.save(entity);
        });
    }

    private void applyPerson(AuditRecordEntity revision, LocalDateTime applyTime) {'''
if apply_anchor not in text:
    raise RuntimeError('revision apply method anchor missing')
text = text.replace(apply_anchor, apply_methods, 1)
write(revision, text)

# Frontend generic review service supports clans.
review_service = 'frontend/genealogy-web/src/features/mvp1/services/reviewTaskService.ts'
replace_once(
    review_service,
    "export type ReviewTaskTargetType = 'person' | 'relationship' | 'source' | 'branch' | 'generation_scheme';",
    "export type ReviewTaskTargetType = 'clan' | 'person' | 'relationship' | 'source' | 'branch' | 'generation_scheme';",
    'review target type',
)

# Frontend clan step: expose submission and visible feedback.
clan_step = 'frontend/genealogy-web/src/features/mvp1/steps/clan/ClanStep.tsx'
text = read(clan_step)
text = text.replace(
    "import { DraftDeleteButton } from '../../../../shared/ui/DraftDeleteButton';\n",
    "import { DraftDeleteButton } from '../../../../shared/ui/DraftDeleteButton';\nimport { submitReviewTask } from '../../services/reviewTaskService';\n",
    1,
)
text = text.replace(
    "  if (value === 'official' || value === 'approved') return { text: '正式', color: 'success' };\n",
    "  if (value === 'pending' || value === 'pending_review') return { text: '待审核', color: 'processing' };\n  if (value === 'official' || value === 'approved') return { text: '正式', color: 'success' };\n  if (value === 'rejected') return { text: '已驳回', color: 'error' };\n",
    1,
)
status_anchor = '''function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
'''
status_replacement = '''function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function canSubmitClanReview(clan: ClanRecord) {
  const status = String(clan.status || 'draft').trim().toLowerCase();
  return status === 'draft' || status === 'rejected';
}
'''
if status_anchor not in text:
    raise RuntimeError('clan status helper anchor missing')
text = text.replace(status_anchor, status_replacement, 1)
text = text.replace(
    "  const [clanDeleteError, setClanDeleteError] = useState('');\n",
    "  const [clanDeleteError, setClanDeleteError] = useState('');\n  const [clanReviewError, setClanReviewError] = useState('');\n  const [reviewSubmittingClanId, setReviewSubmittingClanId] = useState('');\n",
    1,
)
create_anchor = '''      toast({ message: '宗族创建成功。宗族暂不纳入审核流，可继续创建支派。', id: data?.id });'''
if create_anchor not in text:
    raise RuntimeError('clan create message anchor missing')
text = text.replace(
    create_anchor,
    "      toast({ message: '宗族创建成功，可在下方列表提交审核并继续维护建谱资料。', id: data?.id });",
    1,
)
submit_anchor = '''  async function deleteClan(clan: ClanRecord) {
    setClanDeleteError('');
    await apiClient.delete(`/clans/${clan.id}`);
  }
'''
submit_replacement = '''  async function submitClanReview(clan: ClanRecord) {
    const clanId = String(clan.id || '');
    if (!clanId || reviewSubmittingClanId) return;
    setClanReviewError('');
    setReviewSubmittingClanId(clanId);
    try {
      await submitReviewTask({ clanId, targetType: 'clan', targetId: clanId, comment: null });
      await loadClans();
      toast({ message: `宗族“${clanDisplayName(clan)}”已提交审核` });
    } catch (error) {
      const text = errorMessage(error, '宗族提交审核失败');
      setClanReviewError(text);
      toast({ message: text }, true);
    } finally {
      setReviewSubmittingClanId('');
    }
  }

  async function deleteClan(clan: ClanRecord) {
    setClanDeleteError('');
    await apiClient.delete(`/clans/${clan.id}`);
  }
'''
if submit_anchor not in text:
    raise RuntimeError('clan submit function anchor missing')
text = text.replace(submit_anchor, submit_replacement, 1)
text = text.replace("      width: 220,", "      width: 300,", 1)
action_anchor = '''          <DraftDeleteButton
            object={clan}'''
action_replacement = '''          {canSubmitClanReview(clan) ? (
            <Button
              type="link"
              size="small"
              loading={reviewSubmittingClanId === String(clan.id || '')}
              disabled={Boolean(reviewSubmittingClanId) && reviewSubmittingClanId !== String(clan.id || '')}
              onClick={() => void submitClanReview(clan)}
            >
              提交审核
            </Button>
          ) : null}
          <DraftDeleteButton
            object={clan}'''
if action_anchor not in text:
    raise RuntimeError('clan action anchor missing')
text = text.replace(action_anchor, action_replacement, 1)
text = text.replace(
    "            buttonProps={{ type: 'link', size: 'small' }}",
    "            buttonProps={{ type: 'link', size: 'small', disabled: Boolean(reviewSubmittingClanId) }}",
    1,
)
text = text.replace(
    '  const resultNotice = clanDeleteError || clanListError ? (',
    '  const resultNotice = clanReviewError || clanDeleteError || clanListError ? (',
    1,
)
notice_anchor = '''    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      {clanDeleteError ? ('''
notice_replacement = '''    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      {clanReviewError ? (
        <Alert
          type="error"
          showIcon
          closable
          message="宗族提交审核失败"
          description={clanReviewError}
          onClose={() => setClanReviewError('')}
        />
      ) : null}
      {clanDeleteError ? ('''
if notice_anchor not in text:
    raise RuntimeError('clan notice anchor missing')
text = text.replace(notice_anchor, notice_replacement, 1)
text = text.replace(
    '<Panel title="创建宗族" description="宗族作为建谱容器暂不进入审核流；创建后继续维护支派。">',
    '<Panel title="创建宗族" description="宗族创建后为草稿，可在下方列表提交审核；审核期间仍可继续完善建谱资料。">',
    1,
)
write(clan_step, text)

# Backend regression tests for submission and apply/reject transitions.
backend_test = 'backend/genealogy-backend/src/test/java/com/genealogy/review/application/ClanReviewWorkflowTest.java'
write(backend_test, '''package com.genealogy.review.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.auth.application.AuthorizationApplicationService;
import com.genealogy.branch.repository.BranchRepository;
import com.genealogy.clan.entity.ClanEntity;
import com.genealogy.clan.repository.ClanRepository;
import com.genealogy.generation.repository.GenSchemeRepository;
import com.genealogy.generation.repository.GenWordRepository;
import com.genealogy.imports.repository.ImportJobRepository;
import com.genealogy.imports.repository.ImportJobRowRepository;
import com.genealogy.operationlog.application.OperationLogApplicationService;
import com.genealogy.person.repository.PersonRepository;
import com.genealogy.relationship.repository.RelationshipRepository;
import com.genealogy.review.dto.CheckTaskResponse;
import com.genealogy.review.dto.ReviewSubmitRequest;
import com.genealogy.review.entity.AuditRecordEntity;
import com.genealogy.review.entity.CheckTaskEntity;
import com.genealogy.review.repository.AuditRecordRepository;
import com.genealogy.review.repository.CheckTaskRepository;
import com.genealogy.source.repository.SourceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClanReviewWorkflowTest {

    @Mock private PersonRepository personRepository;
    @Mock private RelationshipRepository relationshipRepository;
    @Mock private SourceRepository sourceRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private ClanRepository clanRepository;
    @Mock private GenSchemeRepository genSchemeRepository;
    @Mock private GenWordRepository genWordRepository;
    @Mock private AuditRecordRepository auditRecordRepository;
    @Mock private CheckTaskRepository checkTaskRepository;
    @Mock private OperationLogApplicationService operationLogApplicationService;
    @Mock private AuthorizationApplicationService authorizationApplicationService;
    @Mock private RevisionApplyService revisionApplyService;
    @Mock private ImportJobRepository importJobRepository;
    @Mock private ImportJobRowRepository importJobRowRepository;

    @Test
    void submitsDraftClanThroughGenericReviewEndpoint() {
        ApprovalApplicationService service = new ApprovalApplicationService(
                personRepository, relationshipRepository, sourceRepository, branchRepository,
                genSchemeRepository, genWordRepository, auditRecordRepository, checkTaskRepository,
                operationLogApplicationService, authorizationApplicationService, revisionApplyService,
                new ObjectMapper()
        );
        service.setClanRepository(clanRepository);

        ClanEntity clan = clan(8L, "draft");
        when(clanRepository.findById(8L)).thenReturn(Optional.of(clan));
        when(auditRecordRepository.existsByTargetTypeAndTargetIdAndStatus("clan", 8L, "pending")).thenReturn(false);
        when(auditRecordRepository.save(any(AuditRecordEntity.class))).thenAnswer(invocation -> {
            AuditRecordEntity record = invocation.getArgument(0);
            record.setId(101L);
            record.setTraceId(UUID.randomUUID());
            return record;
        });
        when(checkTaskRepository.save(any(CheckTaskEntity.class))).thenAnswer(invocation -> {
            CheckTaskEntity task = invocation.getArgument(0);
            task.setId(202L);
            return task;
        });

        CheckTaskResponse response = service.submitGeneric(
                8L, new ReviewSubmitRequest("clan", 8L, null, "提交宗族审核"), 7L
        );

        assertEquals("pending_review", clan.getStatus());
        assertEquals("clan", response.targetType());
        assertEquals(8L, response.targetId());
        verify(authorizationApplicationService).requirePermission(8L, 7L, "clan:update");
        verify(clanRepository).save(clan);
    }

    @Test
    void appliesAndRejectsClanReviewState() {
        RevisionApplyService service = new RevisionApplyService(
                personRepository, relationshipRepository, sourceRepository, branchRepository,
                genSchemeRepository, importJobRepository, importJobRowRepository, new ObjectMapper()
        );
        service.setClanRepository(clanRepository);
        ClanEntity clan = clan(8L, "pending_review");
        when(clanRepository.findById(8L)).thenReturn(Optional.of(clan));

        AuditRecordEntity record = new AuditRecordEntity();
        record.setClanId(8L);
        record.setTargetType("clan");
        record.setTargetId(8L);

        service.apply(record, LocalDateTime.now());
        assertEquals("official", clan.getStatus());

        clan.setStatus("pending_review");
        service.reject(record, LocalDateTime.now());
        assertEquals("rejected", clan.getStatus());
    }

    private ClanEntity clan(Long id, String status) {
        ClanEntity clan = new ClanEntity();
        clan.setId(id);
        clan.setClanName("江夏堂黄氏宗族");
        clan.setSurname("黄");
        clan.setStatus(status);
        return clan;
    }
}
''')

# Frontend structural regression test.
frontend_test = 'frontend/genealogy-web/src/features/mvp1/steps/clan/ClanStepReviewEntry.test.mjs'
write(frontend_test, '''import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const clanStepSource = readFileSync(new URL('./ClanStep.tsx', import.meta.url), 'utf8');
const reviewServiceSource = readFileSync(new URL('../../services/reviewTaskService.ts', import.meta.url), 'utf8');

test('draft clan exposes a real review submission entry', () => {
  assert.match(reviewServiceSource, /ReviewTaskTargetType = 'clan' \|/);
  assert.match(clanStepSource, /targetType: 'clan'/);
  assert.match(clanStepSource, />\s*提交审核\s*<\/Button>/);
  assert.match(clanStepSource, /await loadClans\(\)/);
  assert.match(clanStepSource, /status === 'draft' \|\| status === 'rejected'/);
});

test('clan step no longer claims clans are outside review flow', () => {
  assert.doesNotMatch(clanStepSource, /宗族暂不纳入审核流|宗族作为建谱容器暂不进入审核流/);
  assert.match(clanStepSource, /宗族创建后为草稿，可在下方列表提交审核/);
  assert.match(clanStepSource, /value === 'pending' \|\| value === 'pending_review'/);
  assert.match(clanStepSource, /value === 'rejected'/);
});
''')

# Add the static regression test to the existing wizard test gate.
package_path = 'frontend/genealogy-web/package.json'
text = read(package_path)
old = 'node --test src/features/mvp1/domain/wizardStepState.test.mjs; status=$?;'
new = 'node --test src/features/mvp1/domain/wizardStepState.test.mjs src/features/mvp1/steps/clan/ClanStepReviewEntry.test.mjs; status=$?;'
if old not in text:
    raise RuntimeError('package wizard test anchor missing')
write(package_path, text.replace(old, new, 1))

# Update execution record.
task_path = 'tasks/issue-715-execution.md'
text = read(task_path)
text = text.replace('- [ ] 定位审核任务领域模型及宗族接入点', '- [x] 定位审核任务领域模型及宗族接入点')
text = text.replace('- [ ] 实现宗族提交审核与审核通过状态流转', '- [x] 实现宗族提交审核与审核通过状态流转')
text = text.replace('- [ ] 增加建谱向导提交审核入口与反馈', '- [x] 增加建谱向导提交审核入口与反馈')
text = text.replace('- [ ] 增加前后端测试', '- [x] 增加前后端测试')
write(task_path, text)
