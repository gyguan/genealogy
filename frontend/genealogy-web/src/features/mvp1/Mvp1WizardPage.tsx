import { useEffect, useMemo, useState } from 'react';
import { Button, Modal } from 'antd';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import {
  deriveWizardStepStates,
  emptyWizardStateSnapshot,
  getWizardStepGate,
  type Mvp1StepKey,
  type WizardStateSnapshot
} from './domain/wizardStepState';
import { StepRenderer } from './StepRenderer';
import { loadWizardStateSnapshot } from './services/wizardStepStateService';
import { WizardShell, type WizardGateNotice } from './WizardShell';

type Notice = { message: string; id?: string | number };
type Props = { notify: (data: unknown, error?: boolean) => void };
type SaveState = { status: 'unsaved' | 'saved'; savedAt?: string };
type SkipState = { relationship: boolean; source: boolean };

const stepOrder: { key: Mvp1StepKey; title: string; desc: string }[] = [
  { key: 'clan', title: '宗族', desc: '创建宗族基础信息，完成后进入支派维护。' },
  { key: 'branch', title: '支派', desc: '建立支派并提交审核，通过后可用于字辈和人物。' },
  { key: 'generation', title: '字辈', desc: '维护字辈方案和明细，通过审核后可用于人物。' },
  { key: 'person', title: '人物', desc: '录入人物档案，通过审核后可建立亲属关系。' },
  { key: 'relationship', title: '关系', desc: '在已通过审核的人物之间建立亲属关系。' },
  { key: 'source', title: '来源', desc: '为已通过审核的对象绑定可追溯来源。' },
  { key: 'review', title: '审核', desc: '查看待审任务并补充提交草稿对象。' }
];

function clanLabel(clan?: { clanName?: unknown; surname?: unknown }) {
  return String(clan?.clanName || clan?.surname || '已选择宗族');
}

function navigateToView(view: 'home' | 'reviewCenter') {
  const url = new URL(window.location.href);
  if (view === 'home') url.searchParams.delete('view');
  else url.searchParams.set('view', view);
  window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function loadFailureSnapshot(active: Mvp1StepKey, message: string): WizardStateSnapshot {
  const snapshot = emptyWizardStateSnapshot();
  snapshot.errors[active] = message;
  return snapshot;
}

export function Mvp1WizardPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [active, setActive] = useState<Mvp1StepKey>('clan');
  const [result, setResult] = useState<Notice | undefined>();
  const [saveState, setSaveState] = useState<SaveState>({ status: 'unsaved' });
  const [skipState, setSkipState] = useState<SkipState>({ relationship: false, source: false });
  const [wizardSnapshot, setWizardSnapshot] = useState<WizardStateSnapshot>(emptyWizardStateSnapshot);
  const [stateLoading, setStateLoading] = useState(true);
  const [gateNotice, setGateNotice] = useState<WizardGateNotice<Mvp1StepKey> | undefined>();

  useEffect(() => {
    setSkipState({ relationship: false, source: false });
  }, [workspace.clanId, workspace.branchId, workspace.personId]);

  useEffect(() => {
    setSkipState(current => current.source ? { ...current, source: false } : current);
  }, [workspace.relationshipId]);

  useEffect(() => {
    let cancelled = false;
    setStateLoading(true);
    void loadWizardStateSnapshot({
      clanId: workspace.clanId,
      branchId: workspace.branchId,
      personId: workspace.personId,
      relationshipId: workspace.relationshipId,
      sourceId: workspace.sourceId,
      skipped: skipState
    }).then(snapshot => {
      if (!cancelled) setWizardSnapshot(snapshot);
    }).catch(error => {
      if (!cancelled) {
        const message = error instanceof Error && error.message ? error.message : '加载向导状态失败';
        setWizardSnapshot(loadFailureSnapshot(active, message));
      }
    }).finally(() => {
      if (!cancelled) setStateLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [
    active,
    workspace.clanId,
    workspace.branchId,
    workspace.personId,
    workspace.relationshipId,
    workspace.sourceId,
    workspace.reviewTaskId,
    skipState.relationship,
    skipState.source
  ]);

  const stepDecisions = useMemo(() => deriveWizardStepStates({
    ...wizardSnapshot,
    clanId: workspace.clanId,
    branchId: workspace.branchId,
    personId: workspace.personId,
    relationshipId: workspace.relationshipId,
    sourceId: workspace.sourceId,
    skipped: skipState
  }), [
    wizardSnapshot,
    workspace.clanId,
    workspace.branchId,
    workspace.personId,
    workspace.relationshipId,
    workspace.sourceId,
    skipState
  ]);

  const steps = useMemo(() => stepOrder.map(meta => {
    const decision = stepDecisions.find(item => item.key === meta.key);
    return {
      ...meta,
      state: decision?.state || 'waiting',
      stateLabel: decision?.stateLabel || '待开放',
      canEnter: decision?.canEnter || false,
      reason: decision?.reason || '正在计算步骤状态。',
      action: decision?.action || '请稍后重试'
    };
  }), [stepDecisions]);

  const activeIndex = Math.max(0, stepOrder.findIndex(step => step.key === active));
  const activeDecision = stepDecisions.find(step => step.key === active);
  const selectedClan = wizardSnapshot.clans.find(clan => String(clan.id || '') === String(workspace.clanId || ''));
  const currentClanLabel = workspace.clanId ? clanLabel(selectedClan as { clanName?: unknown; surname?: unknown } | undefined) : '尚未选择宗族';
  const saveStatus = saveState.status === 'saved'
    ? { label: saveState.savedAt ? `本次会话已保存 · ${saveState.savedAt}` : '本次会话已保存', color: 'success' }
    : { label: '存在未保存进度', color: 'warning' };

  function markUnsaved() {
    setSaveState(current => current.status === 'unsaved' ? current : { status: 'unsaved' });
  }

  function changeStepUnchecked(step: Mvp1StepKey) {
    setActive(step);
    setResult(undefined);
    setGateNotice(undefined);
    setSaveState({ status: 'unsaved' });
  }

  function requestStepChange(step: Mvp1StepKey) {
    const gate = getWizardStepGate(stepDecisions, step);
    if (!gate.allowed) {
      setGateNotice({
        title: gate.title || '该步骤暂未开放',
        reason: gate.reason || '前置条件尚未满足。',
        action: gate.action || '请先完成前置步骤',
        blockingStep: gate.blockingStep
      });
      return false;
    }
    changeStepUnchecked(step);
    return true;
  }

  function handleSubmittedReview(taskId: string) {
    if (taskId) workspace.setReviewTaskId(taskId);
    setResult({ message: '审核任务已提交；当前步骤将在审核通过后标记为完成。', id: taskId });
    setSaveState({ status: 'saved', savedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) });
    setGateNotice(undefined);
  }

  function saveWizardProgress() {
    const savedAt = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setSaveState({ status: 'saved', savedAt });
    setResult({ message: '当前建谱进度已保留在本次会话中；业务对象仍以步骤内保存结果为准。' });
    notify({ message: '建谱进度已保存' });
  }

  function goPrevious() {
    const previous = stepOrder[activeIndex - 1];
    if (previous) requestStepChange(previous.key);
  }

  function goNext() {
    const next = stepOrder[activeIndex + 1];
    if (next) {
      requestStepChange(next.key);
      return;
    }
    navigateToView('reviewCenter');
  }

  function confirmExit() {
    Modal.confirm({
      title: '退出建谱向导？',
      content: '已创建并保存的业务数据不会删除；当前步骤中尚未执行保存的输入可能丢失。',
      okText: '退出向导',
      cancelText: '继续建谱',
      onOk: () => navigateToView('home')
    });
  }

  function toggleSkip(step: 'relationship' | 'source') {
    if (skipState[step]) {
      setSkipState(current => ({ ...current, [step]: false }));
      setResult({ message: step === 'relationship' ? '已恢复人物关系维护要求。' : '已恢复来源绑定要求。' });
      return;
    }
    const relationship = step === 'relationship';
    Modal.confirm({
      title: relationship ? '确认本次暂不维护人物关系？' : '确认本次暂不绑定来源？',
      content: relationship
        ? '确认后，关系步骤将按“已跳过”完成。本次确认仅在当前建谱会话中有效。'
        : '确认后，来源步骤将按“已跳过”完成。本次确认仅在当前建谱会话中有效。',
      okText: relationship ? '确认暂不维护' : '确认暂不绑定',
      cancelText: '取消',
      onOk: () => {
        setSkipState(current => ({ ...current, [step]: true }));
        setGateNotice(undefined);
        setResult({ message: relationship ? '已确认本次暂不维护人物关系。' : '已确认本次暂不绑定来源。' });
      }
    });
  }

  const skipAction = active === 'relationship' && (skipState.relationship || activeDecision?.state !== 'completed')
    ? <Button onClick={() => toggleSkip('relationship')}>{skipState.relationship ? '恢复维护关系' : '暂不维护关系'}</Button>
    : active === 'source' && (skipState.source || activeDecision?.state !== 'completed')
      ? <Button onClick={() => toggleSkip('source')}>{skipState.source ? '恢复绑定来源' : '暂不绑定来源'}</Button>
      : undefined;

  return (
    <WizardShell
      title="建谱向导"
      description="按宗族、支派、字辈、人物、关系、来源和审核顺序完成建谱。"
      contextLabel={currentClanLabel}
      saveStatus={saveStatus}
      steps={steps}
      activeStep={active}
      loaded
      result={result}
      gateNotice={gateNotice}
      onExit={confirmExit}
      onStepChange={requestStepChange}
      onGateAction={requestStepChange}
      onContentChange={markUnsaved}
      navigation={{
        previousDisabled: activeIndex === 0,
        nextDisabled: stateLoading,
        nextLoading: stateLoading,
        onPrevious: goPrevious,
        onSaveDraft: saveWizardProgress,
        onNext: goNext,
        nextLabel: activeIndex === stepOrder.length - 1 ? '进入审核中心' : '下一步',
        extra: skipAction
      }}
    >
      <StepRenderer
        activeStep={active}
        notify={notify}
        onStepChange={changeStepUnchecked}
        onSubmittedReview={handleSubmittedReview}
      />
    </WizardShell>
  );
}
