import { isOfficial, statusOf, type StatusLike } from './status';

export type Mvp1StepKey = 'clan' | 'branch' | 'generation' | 'person' | 'relationship' | 'source' | 'review';

export type WizardBusinessState = 'waiting' | 'editing' | 'completed' | 'reviewing' | 'rejected' | 'invalid' | 'error';

export type WizardEntity = StatusLike & {
  id?: number | string;
  branchId?: number | string;
};

export type WizardTask = StatusLike & {
  id?: number | string;
  targetType?: string;
  targetId?: number | string;
};

export type WizardStateErrors = Partial<Record<Mvp1StepKey, string>>;

export type WizardStateSnapshot = {
  clanId: string;
  branchId: string;
  personId: string;
  relationshipId: string;
  sourceId: string;
  clans: WizardEntity[];
  branches: WizardEntity[];
  schemes: WizardEntity[];
  persons: WizardEntity[];
  relationships: WizardEntity[];
  sources: WizardEntity[];
  tasks: WizardTask[];
  generationItemCounts: Record<string, number>;
  sourceLinkCount: number;
  skipped: {
    relationship: boolean;
    source: boolean;
  };
  errors: WizardStateErrors;
};

export type WizardStepDecision = {
  key: Mvp1StepKey;
  state: WizardBusinessState;
  stateLabel: string;
  complete: boolean;
  canEnter: boolean;
  reason: string;
  action: string;
  blockingStep?: Mvp1StepKey;
};

export type WizardStepGate = {
  allowed: boolean;
  target: Mvp1StepKey;
  title?: string;
  reason?: string;
  action?: string;
  blockingStep?: Mvp1StepKey;
};

export const WIZARD_STEP_KEYS: Mvp1StepKey[] = ['clan', 'branch', 'generation', 'person', 'relationship', 'source', 'review'];

export const WIZARD_STEP_TITLES: Record<Mvp1StepKey, string> = {
  clan: '宗族',
  branch: '支派',
  generation: '字辈',
  person: '人物',
  relationship: '关系',
  source: '来源',
  review: '审核'
};

const STATE_LABELS: Record<WizardBusinessState, string> = {
  waiting: '待开放',
  editing: '待完成',
  completed: '已完成',
  reviewing: '审核中',
  rejected: '已驳回',
  invalid: '需重确认',
  error: '加载失败'
};

const PENDING_STATUSES = new Set(['pending', 'pending_review', 'reviewing', 'in_review', 'submitted', 'waiting']);
const REJECTED_STATUSES = new Set(['rejected', 'cancelled', 'canceled']);

export function emptyWizardStateSnapshot(): WizardStateSnapshot {
  return {
    clanId: '',
    branchId: '',
    personId: '',
    relationshipId: '',
    sourceId: '',
    clans: [],
    branches: [],
    schemes: [],
    persons: [],
    relationships: [],
    sources: [],
    tasks: [],
    generationItemCounts: {},
    sourceLinkCount: 0,
    skipped: { relationship: false, source: false },
    errors: {}
  };
}

function idOf(value: unknown) {
  return String(value ?? '').trim();
}

function findById(rows: WizardEntity[], id: string) {
  if (!id) return undefined;
  return rows.find(row => idOf(row.id) === id);
}

function isPending(row: StatusLike | undefined | null) {
  return PENDING_STATUSES.has(statusOf(row));
}

function isRejected(row: StatusLike | undefined | null) {
  return REJECTED_STATUSES.has(statusOf(row));
}

function taskMatches(task: WizardTask, targetType: string, targetId?: string) {
  if (String(task.targetType || '').trim().toLowerCase() !== targetType) return false;
  return !targetId || idOf(task.targetId) === targetId;
}

function hasPendingTask(tasks: WizardTask[], targetType: string, targetId?: string) {
  return tasks.some(task => taskMatches(task, targetType, targetId));
}

function decision(
  key: Mvp1StepKey,
  state: WizardBusinessState,
  reason: string,
  action: string,
  options?: { stateLabel?: string; blockingStep?: Mvp1StepKey; canEnter?: boolean }
): WizardStepDecision {
  return {
    key,
    state,
    stateLabel: options?.stateLabel || STATE_LABELS[state],
    complete: state === 'completed',
    canEnter: options?.canEnter ?? state !== 'waiting',
    reason,
    action,
    blockingStep: options?.blockingStep
  };
}

function waitingDecision(key: Mvp1StepKey, prerequisite: WizardStepDecision) {
  const prerequisiteTitle = WIZARD_STEP_TITLES[prerequisite.key];
  const isCompletionStep = key === 'review';
  return decision(
    key,
    'waiting',
    isCompletionStep
      ? `${prerequisiteTitle}步骤尚未完成（${prerequisite.stateLabel}）：${prerequisite.reason}`
      : `${prerequisiteTitle}步骤尚未完成，但可进入本步骤选择或维护已有数据。`,
    isCompletionStep
      ? `返回${prerequisiteTitle}步骤，${prerequisite.action}`
      : `在本步骤选择所需业务对象，提交时再校验依赖条件`,
    {
      blockingStep: prerequisite.key,
      canEnter: !isCompletionStep,
      stateLabel: isCompletionStep ? undefined : '可进入'
    }
  );
}

function entityDecision(input: {
  key: Mvp1StepKey;
  rows: WizardEntity[];
  selectedId: string;
  pendingTargetType: string;
  tasks: WizardTask[];
  noun: string;
  completedReason: string;
  editingReason: string;
  editingAction: string;
}): WizardStepDecision {
  const selected = findById(input.rows, input.selectedId);
  if (input.selectedId && !selected) {
    return decision(
      input.key,
      'invalid',
      `当前选择的${input.noun}已不存在、不属于当前宗族，或无权访问。`,
      `重新选择一个可用${input.noun}`
    );
  }

  if (selected) {
    if (hasPendingTask(input.tasks, input.pendingTargetType, input.selectedId) || isPending(selected)) {
      return decision(input.key, 'reviewing', `所选${input.noun}正在审核，审核通过前不能作为后续步骤前置条件。`, `等待审核完成，或前往审核中心查看进度`);
    }
    if (isRejected(selected)) {
      return decision(input.key, 'rejected', `所选${input.noun}已被驳回，需要修正后重新提交。`, `修正${input.noun}并重新提交审核`);
    }
    if (isOfficial(selected)) {
      return decision(input.key, 'completed', input.completedReason, `可继续进入下一步骤`);
    }
    return decision(input.key, 'editing', `所选${input.noun}尚未审核通过。`, input.editingAction);
  }

  if (hasPendingTask(input.tasks, input.pendingTargetType) || input.rows.some(isPending)) {
    return decision(input.key, 'reviewing', `已有${input.noun}正在审核，但尚未选择可用于后续步骤的正式数据。`, `等待审核通过后选择正式${input.noun}`);
  }
  if (input.rows.some(isRejected)) {
    return decision(input.key, 'rejected', `存在已驳回的${input.noun}，当前没有选中的正式数据。`, `修正已驳回${input.noun}，或选择其他已通过${input.noun}`);
  }
  return decision(input.key, 'editing', input.editingReason, input.editingAction);
}

export function deriveWizardStepStates(snapshot: WizardStateSnapshot): WizardStepDecision[] {
  const decisions: WizardStepDecision[] = [];

  const clan = snapshot.errors.clan
    ? decision('clan', 'error', snapshot.errors.clan, '在宗族步骤重试加载')
    : !snapshot.clanId
      ? decision('clan', 'editing', '尚未创建或选择宗族。', '创建或选择一个宗族')
      : !findById(snapshot.clans, snapshot.clanId)
        ? decision('clan', 'invalid', '当前宗族已不存在或无权访问。', '重新选择一个可用宗族')
        : decision('clan', 'completed', '已选择有效宗族。', '可继续维护支派');
  decisions.push(clan);

  const branch = !clan.complete
    ? waitingDecision('branch', clan)
    : snapshot.errors.branch
      ? decision('branch', 'error', snapshot.errors.branch, '在支派步骤重试加载')
      : entityDecision({
          key: 'branch',
          rows: snapshot.branches,
          selectedId: snapshot.branchId,
          pendingTargetType: 'branch',
          tasks: snapshot.tasks,
          noun: '支派',
          completedReason: '已选择审核通过的正式支派。',
          editingReason: '尚未选择审核通过的支派。',
          editingAction: '创建并审核支派，或选择一个已通过支派'
        });
  decisions.push(branch);

  let generation: WizardStepDecision;
  if (!branch.complete) {
    generation = waitingDecision('generation', branch);
  } else if (snapshot.errors.generation) {
    generation = decision('generation', 'error', snapshot.errors.generation, '在字辈步骤重试加载');
  } else {
    const relevantSchemes = snapshot.schemes.filter(row => !row.branchId || idOf(row.branchId) === snapshot.branchId);
    const completedScheme = relevantSchemes.find(row => isOfficial(row) && (snapshot.generationItemCounts[idOf(row.id)] || 0) > 0);
    if (completedScheme) {
      generation = decision('generation', 'completed', '已存在审核通过且包含有效明细的字辈方案。', '可继续录入人物');
    } else if (hasPendingTask(snapshot.tasks, 'generation_scheme') || relevantSchemes.some(isPending)) {
      generation = decision('generation', 'reviewing', '字辈方案正在审核，审核通过且存在有效明细后才能继续。', '等待审核完成，或前往审核中心查看进度');
    } else if (relevantSchemes.some(isRejected)) {
      generation = decision('generation', 'rejected', '字辈方案已被驳回，需要修正方案或明细。', '修正字辈方案并重新提交审核');
    } else if (relevantSchemes.some(isOfficial)) {
      generation = decision('generation', 'editing', '已有正式字辈方案，但缺少有效字辈明细。', '补充至少一条有效字辈明细');
    } else {
      generation = decision('generation', 'editing', '尚无审核通过的字辈方案。', '创建字辈方案、维护明细并完成审核');
    }
  }
  decisions.push(generation);

  const person = !generation.complete
    ? waitingDecision('person', generation)
    : snapshot.errors.person
      ? decision('person', 'error', snapshot.errors.person, '在人物步骤重试加载')
      : entityDecision({
          key: 'person',
          rows: snapshot.persons,
          selectedId: snapshot.personId,
          pendingTargetType: 'person',
          tasks: snapshot.tasks,
          noun: '人物',
          completedReason: '已选择审核通过的正式人物。',
          editingReason: '尚未选择审核通过的人物。',
          editingAction: '录入并审核人物，或选择一个已通过人物'
        });
  decisions.push(person);

  let relationship: WizardStepDecision;
  if (!person.complete) {
    relationship = waitingDecision('relationship', person);
  } else if (snapshot.skipped.relationship) {
    relationship = decision('relationship', 'completed', '已确认本次建谱暂不维护人物关系。', '可继续维护来源', { stateLabel: '已跳过' });
  } else if (snapshot.errors.relationship) {
    relationship = decision('relationship', 'error', snapshot.errors.relationship, '在关系步骤重试加载');
  } else {
    const selected = findById(snapshot.relationships, snapshot.relationshipId);
    if (snapshot.relationshipId && !selected) {
      relationship = decision('relationship', 'invalid', '当前选择的关系已不存在或不属于所选人物。', '重新选择或建立有效关系');
    } else if (selected && (hasPendingTask(snapshot.tasks, 'relationship', snapshot.relationshipId) || isPending(selected))) {
      relationship = decision('relationship', 'reviewing', '所选关系正在审核。', '等待审核完成，或前往审核中心查看进度');
    } else if (selected && isRejected(selected)) {
      relationship = decision('relationship', 'rejected', '所选关系已被驳回。', '修正关系并重新提交审核');
    } else if ((selected && isOfficial(selected)) || snapshot.relationships.some(isOfficial)) {
      relationship = decision('relationship', 'completed', '已存在可用人物关系。', '可继续维护来源');
    } else if (hasPendingTask(snapshot.tasks, 'relationship') || snapshot.relationships.some(isPending)) {
      relationship = decision('relationship', 'reviewing', '人物关系正在审核。', '等待审核完成，或确认本次暂不维护关系');
    } else if (snapshot.relationships.some(isRejected)) {
      relationship = decision('relationship', 'rejected', '存在已驳回的人物关系。', '修正关系，或确认本次暂不维护关系');
    } else {
      relationship = decision('relationship', 'editing', '尚未建立可用人物关系。', '建立关系，或明确确认本次暂不维护关系');
    }
  }
  decisions.push(relationship);

  let source: WizardStepDecision;
  if (!relationship.complete) {
    source = waitingDecision('source', relationship);
  } else if (snapshot.skipped.source) {
    source = decision('source', 'completed', '已确认本次建谱暂不绑定来源。', '可进入审核步骤', { stateLabel: '已跳过' });
  } else if (snapshot.errors.source) {
    source = decision('source', 'error', snapshot.errors.source, '在来源步骤重试加载');
  } else {
    const selected = findById(snapshot.sources, snapshot.sourceId);
    if (snapshot.sourceId && !selected) {
      source = decision('source', 'invalid', '当前选择的来源已不存在或不属于当前宗族。', '重新选择一个可用来源');
    } else if (selected && (hasPendingTask(snapshot.tasks, 'source', snapshot.sourceId) || isPending(selected))) {
      source = decision('source', 'reviewing', '所选来源正在审核，审核通过前不能完成绑定。', '等待审核完成，或前往审核中心查看进度');
    } else if (selected && isRejected(selected)) {
      source = decision('source', 'rejected', '所选来源已被驳回。', '修正来源并重新提交审核');
    } else if (selected && isOfficial(selected) && snapshot.sourceLinkCount > 0) {
      source = decision('source', 'completed', '已选择正式来源并完成至少一条有效绑定。', '可进入审核步骤');
    } else if (selected && isOfficial(selected)) {
      source = decision('source', 'editing', '所选来源已通过审核，但尚未绑定任何对象。', '至少完成一条来源绑定');
    } else if (hasPendingTask(snapshot.tasks, 'source') || snapshot.sources.some(isPending)) {
      source = decision('source', 'reviewing', '来源正在审核，当前没有可完成绑定的正式来源。', '等待审核通过后完成绑定');
    } else if (snapshot.sources.some(isRejected)) {
      source = decision('source', 'rejected', '存在已驳回的来源，当前未完成有效绑定。', '修正来源并完成绑定，或确认本次暂不绑定来源');
    } else {
      source = decision('source', 'editing', '尚未选择正式来源并完成绑定。', '创建或选择正式来源并绑定对象，或明确确认本次暂不绑定来源');
    }
  }
  decisions.push(source);

  const review = !source.complete
    ? waitingDecision('review', source)
    : snapshot.errors.review
      ? decision('review', 'error', snapshot.errors.review, '在审核步骤重试加载')
      : snapshot.tasks.length > 0
        ? decision('review', 'reviewing', `当前仍有 ${snapshot.tasks.length} 个审核任务处理中。`, '进入审核中心查看处理进度')
        : decision('review', 'completed', '所有前置步骤均已完成，当前没有待处理审核任务。', '可以进入审核中心或结束本次建谱');
  decisions.push(review);

  return decisions;
}

export function getWizardStepGate(steps: WizardStepDecision[], target: Mvp1StepKey): WizardStepGate {
  const targetStep = steps.find(step => step.key === target);
  if (!targetStep || targetStep.canEnter) return { allowed: true, target };
  return {
    allowed: false,
    target,
    title: `暂不能进入${WIZARD_STEP_TITLES[target]}步骤`,
    reason: targetStep.reason,
    action: targetStep.action,
    blockingStep: targetStep.blockingStep
  };
}
