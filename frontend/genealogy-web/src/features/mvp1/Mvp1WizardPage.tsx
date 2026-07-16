import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  captureWizardStepDraft,
  createLocalWizardSessionStore,
  createWizardSession,
  readWizardStepFromUrl,
  restoreWizardStepDraft,
  writeWizardStepToUrl,
  type WizardSession,
  type WizardStepDraft
} from './services/wizardSessionService';
import { loadWizardStateSnapshot } from './services/wizardStepStateService';
import { WizardShell, type WizardGateNotice } from './WizardShell';

type Notice = { message: string; id?: string | number };
type Props = { notify: (data: unknown, error?: boolean) => void };
type SaveState = { status: 'unsaved' | 'saved' | 'error'; savedAt?: string };
type SkipState = { relationship: boolean; source: boolean };
type DraftState = Partial<Record<Mvp1StepKey, WizardStepDraft>>;

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
  url.searchParams.delete('step');
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

function displaySavedAt(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function Mvp1WizardPage({ notify }: Props) {
  const workspace = useWorkspace();
  const sessionStore = useMemo(() => createLocalWizardSessionStore(), []);
  const [storedSession] = useState<WizardSession | undefined>(() => sessionStore.load());
  const urlStep = useMemo(() => readWizardStepFromUrl(new URL(window.location.href)), []);
  const [active, setActive] = useState<Mvp1StepKey>(urlStep || storedSession?.activeStep || 'clan');
  const [result, setResult] = useState<Notice | undefined>();
  const [saveState, setSaveState] = useState<SaveState>(storedSession
    ? { status: 'saved', savedAt: displaySavedAt(storedSession.savedAt) }
    : { status: 'unsaved' });
  const [skipState, setSkipState] = useState<SkipState>(storedSession?.skipped || { relationship: false, source: false });
  const [drafts, setDrafts] = useState<DraftState>(storedSession?.drafts || {});
  const [wizardSnapshot, setWizardSnapshot] = useState<WizardStateSnapshot>(emptyWizardStateSnapshot);
  const [stateLoading, setStateLoading] = useState(true);
  const [gateNotice, setGateNotice] = useState<WizardGateNotice<Mvp1StepKey> | undefined>();
  const [sessionReady, setSessionReady] = useState(!storedSession);
  const promptShown = useRef(false);

  function restoreWorkspace(session: WizardSession) {
    workspace.patch({
      clanId: session.workspace.clanId,
      branchId: session.workspace.branchId,
      personId: session.workspace.personId,
      relationshipId: session.workspace.relationshipId,
      sourceId: session.workspace.sourceId,
      reviewTaskId: session.workspace.reviewTaskId
    });
    setSkipState(session.skipped);
    setDrafts(session.drafts);
    setSaveState({ status: 'saved', savedAt: displaySavedAt(session.savedAt) });
  }

  function startNewSession() {
    sessionStore.clear();
    workspace.patch({
      clanId: '',
      branchId: '',
      personId: '',
      relationshipId: '',
      sourceId: '',
      sourceFocusReason: '',
      attachmentId: '',
      reviewTaskId: ''
    });
    setSkipState({ relationship: false, source: false });
    setDrafts({});
    setActive('clan');
    setSaveState({ status: 'unsaved' });
    setResult({ message: '已开始新的建谱会话；之前创建的业务数据不会被删除。' });
    window.history.replaceState(window.history.state, '', writeWizardStepToUrl(new URL(window.location.href), 'clan'));
    setSessionReady(true);
  }

  useEffect(() => {
    if (!storedSession || promptShown.current) return;
    promptShown.current = true;
    Modal.confirm({
      title: '继续上次建谱？',
      content: `上次保存于 ${new Date(storedSession.savedAt).toLocaleString('zh-CN')}，停留在“${stepOrder.find(step => step.key === storedSession.activeStep)?.title || '建谱'}”步骤。`,
      okText: '继续上次建谱',
      cancelText: '开始新的建谱',
      closable: false,
      maskClosable: false,
      onOk: () => {
        restoreWorkspace(storedSession);
        setActive(urlStep || storedSession.activeStep);
        setSessionReady(true);
      },
      onCancel: startNewSession
    });
  }, []);

  useEffect(() => {
    setSkipState({ relationship: false, source: false });
  }, [workspace.clanId, workspace.branchId, workspace.personId]);

  useEffect(() => {
    setSkipState(current => current.source ? { ...current, source: false } : current);
  }, [workspace.relationshipId]);

  useEffect(() => {
    if (!sessionReady) return;
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
    sessionReady,
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
    ? { label: saveState.savedAt ? `草稿已保存 · ${saveState.savedAt}` : '草稿已保存', color: 'success' }
    : saveState.status === 'error'
      ? { label: '草稿保存失败，输入仍保留', color: 'error' }
      : { label: '存在未保存进度', color: 'warning' };

  function persistSession(nextDrafts = drafts, showNotice = false) {
    try {
      const session = createWizardSession({
        activeStep: active,
        workspace: {
          clanId: workspace.clanId,
          branchId: workspace.branchId,
          personId: workspace.personId,
          relationshipId: workspace.relationshipId,
          sourceId: workspace.sourceId,
          reviewTaskId: workspace.reviewTaskId
        },
        skipped: skipState,
        drafts: nextDrafts
      });
      sessionStore.save(session);
      const savedAt = displaySavedAt(session.savedAt);
      setSaveState({ status: 'saved', savedAt });
      if (showNotice) {
        setResult({ message: '当前步骤、选择上下文和未提交表单已保存到本机。' });
        notify({ message: '建谱草稿已保存' });
      }
    } catch (error) {
      setSaveState({ status: 'error' });
      setResult({ message: (error as Error).message || '草稿保存失败；当前输入仍保留在页面中。' });
      if (showNotice) notify({ message: '草稿保存失败，当前输入仍保留' }, true);
    }
  }

  function captureCurrentDraft() {
    const root = document.querySelector('.wizard-step-content');
    if (!root) return drafts;
    const nextDrafts = { ...drafts, [active]: captureWizardStepDraft(root) };
    setDrafts(nextDrafts);
    return nextDrafts;
  }

  function markUnsaved() {
    setSaveState({ status: 'unsaved' });
    const nextDrafts = captureCurrentDraft();
    window.setTimeout(() => persistSession(nextDrafts), 0);
  }

  function changeStepUnchecked(step: Mvp1StepKey, historyMode: 'push' | 'replace' = 'push') {
    const nextDrafts = captureCurrentDraft();
    setActive(step);
    setResult(undefined);
    setGateNotice(undefined);
    setSaveState({ status: 'unsaved' });
    const nextUrl = writeWizardStepToUrl(new URL(window.location.href), step);
    if (historyMode === 'replace') window.history.replaceState(window.history.state, '', nextUrl);
    else window.history.pushState(window.history.state, '', nextUrl);
    window.setTimeout(() => persistSession(nextDrafts), 0);
  }

  function nearestEnterableStep(target: Mvp1StepKey) {
    const targetIndex = stepOrder.findIndex(step => step.key === target);
    for (let index = targetIndex; index >= 0; index -= 1) {
      const key = stepOrder[index].key;
      if (getWizardStepGate(stepDecisions, key).allowed) return key;
    }
    return 'clan' as Mvp1StepKey;
  }

  function requestStepChange(step: Mvp1StepKey, historyMode: 'push' | 'replace' = 'push') {
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
    changeStepUnchecked(step, historyMode);
    return true;
  }

  useEffect(() => {
    if (!sessionReady || stateLoading) return;
    const requested = readWizardStepFromUrl(new URL(window.location.href)) || active;
    const gate = getWizardStepGate(stepDecisions, requested);
    if (gate.allowed) {
      if (requested !== active) changeStepUnchecked(requested, 'replace');
      else window.history.replaceState(window.history.state, '', writeWizardStepToUrl(new URL(window.location.href), active));
      return;
    }
    const fallback = nearestEnterableStep(requested);
    setGateNotice({
      title: `无法恢复到“${stepOrder.find(step => step.key === requested)?.title || requested}”步骤`,
      reason: gate.reason || '当前会话不满足该步骤前置条件，已安全回退。',
      action: gate.action || '请先完成前置步骤',
      blockingStep: gate.blockingStep
    });
    if (fallback !== active) setActive(fallback);
    window.history.replaceState(window.history.state, '', writeWizardStepToUrl(new URL(window.location.href), fallback));
  }, [sessionReady, stateLoading]);

  useEffect(() => {
    if (!sessionReady) return;
    const frame = window.requestAnimationFrame(() => {
      const root = document.querySelector('.wizard-step-content');
      if (root) restoreWizardStepDraft(root, drafts[active]);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sessionReady, active]);

  useEffect(() => {
    if (!sessionReady) return;
    const popstate = () => {
      const requested = readWizardStepFromUrl(new URL(window.location.href));
      if (!requested) {
        window.history.replaceState(window.history.state, '', writeWizardStepToUrl(new URL(window.location.href), active));
        return;
      }
      const gate = getWizardStepGate(stepDecisions, requested);
      if (gate.allowed) changeStepUnchecked(requested, 'replace');
      else {
        const fallback = nearestEnterableStep(requested);
        setActive(fallback);
        setGateNotice({
          title: '历史步骤当前不可进入',
          reason: gate.reason || '前置条件已变化，已回退到最近可进入步骤。',
          action: gate.action || '请重新完成前置步骤',
          blockingStep: gate.blockingStep
        });
        window.history.replaceState(window.history.state, '', writeWizardStepToUrl(new URL(window.location.href), fallback));
      }
    };
    window.addEventListener('popstate', popstate);
    return () => window.removeEventListener('popstate', popstate);
  }, [sessionReady, active, stepDecisions]);

  function handleSubmittedReview(taskId: string) {
    if (taskId) workspace.setReviewTaskId(taskId);
    setResult({ message: '审核任务已提交；当前步骤将在审核通过后标记为完成。', id: taskId });
    setGateNotice(undefined);
    window.setTimeout(() => persistSession(), 0);
  }

  function saveWizardProgress() {
    persistSession(captureCurrentDraft(), true);
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
      content: '当前会话会自动保存在本机；已创建并保存的业务数据不会删除。',
      okText: '保存并退出',
      cancelText: '继续建谱',
      onOk: () => {
        persistSession(captureCurrentDraft());
        navigateToView('home');
      }
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
        ? '确认后，关系步骤将按“已跳过”完成，并随本地建谱会话保存。'
        : '确认后，来源步骤将按“已跳过”完成，并随本地建谱会话保存。',
      okText: relationship ? '确认暂不维护' : '确认暂不绑定',
      cancelText: '取消',
      onOk: () => {
        setSkipState(current => ({ ...current, [step]: true }));
        setGateNotice(undefined);
        setResult({ message: relationship ? '已确认本次暂不维护人物关系。' : '已确认本次暂不绑定来源。' });
      }
    });
  }

  useEffect(() => {
    if (sessionReady) persistSession();
  }, [
    sessionReady,
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
      loaded={sessionReady}
      result={result}
      gateNotice={gateNotice}
      onExit={confirmExit}
      onStepChange={requestStepChange}
      onGateAction={requestStepChange}
      onContentChange={markUnsaved}
      navigation={{
        previousDisabled: activeIndex === 0 || !sessionReady,
        saveDisabled: !sessionReady,
        nextDisabled: stateLoading || !sessionReady,
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
        onStepChange={step => changeStepUnchecked(step)}
        onSubmittedReview={handleSubmittedReview}
      />
    </WizardShell>
  );
}
