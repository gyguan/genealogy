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
  { key: 'clan', title: '宗族', desc: '创建或选择宗族。' },
  { key: 'branch', title: '支派', desc: '维护宗族支派。' },
  { key: 'generation', title: '字辈', desc: '维护字辈方案与明细。' },
  { key: 'person', title: '人物', desc: '录入人物档案。' },
  { key: 'relationship', title: '关系', desc: '建立人物关系。' },
  { key: 'source', title: '来源', desc: '绑定资料来源。' },
  { key: 'review', title: '完成', desc: '检查并完成建谱。' }
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
    setResult({ message: '已开始新的建谱会话。' });
    window.history.replaceState(window.history.state, '', writeWizardStepToUrl(new URL(window.location.href), 'clan'));
    setSessionReady(true);
  }

  useEffect(() => {
    if (!storedSession || promptShown.current) return;
    promptShown.current = true;
    Modal.confirm({
      title: '继续上次建谱？',
      content: `上次保存于 ${new Date(storedSession.savedAt).toLocaleString('zh-CN')}，停留在“${stepOrder.find(step => step.key === storedSession.activeStep)?.title || '建谱'}”。`,
      okText: '继续',
      cancelText: '新建',
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
    ? { label: saveState.savedAt ? `已保存 ${saveState.savedAt}` : '已保存', color: 'success' }
    : saveState.status === 'error'
      ? { label: '保存失败', color: 'error' }
      : { label: '未保存', color: 'warning' };

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
        setResult({ message: '草稿已保存。' });
        notify({ message: '建谱草稿已保存' });
      }
    } catch (error) {
      setSaveState({ status: 'error' });
      setResult({ message: (error as Error).message || '草稿保存失败。' });
      if (showNotice) notify({ message: '草稿保存失败' }, true);
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
        title: gate.title || '暂不能进入',
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
      title: `无法进入“${stepOrder.find(step => step.key === requested)?.title || requested}”`,
      reason: gate.reason || '当前条件不满足，已回退。',
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
          title: '该步骤当前不可进入',
          reason: gate.reason || '条件已变化，已回退。',
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
    setResult({ message: '已提交审核。', id: taskId });
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

  function handleExit() {
    const hasProgress = saveState.status === 'unsaved'
      || Boolean(workspace.clanId || workspace.branchId || workspace.personId || workspace.relationshipId || workspace.sourceId)
      || Object.keys(drafts).length > 0;
    if (!hasProgress) {
      navigateToView('home');
      return;
    }
    Modal.confirm({
      title: '退出建谱？',
      content: saveState.status === 'saved' ? '当前进度已保存。' : '是否先保存当前进度？',
      okText: saveState.status === 'saved' ? '退出' : '保存并退出',
      cancelText: '继续建谱',
      onOk: () => {
        if (saveState.status !== 'saved') persistSession(captureCurrentDraft());
        navigateToView('home');
      }
    });
  }

  const gateActionStep = (step: Mvp1StepKey) => {
    changeStepUnchecked(step);
  };

  const skipActiveStep = active === 'relationship' || active === 'source'
    ? (
      <Button
        onClick={() => {
          const nextSkipState = { ...skipState, [active]: true };
          setSkipState(nextSkipState);
          setResult({ message: active === 'relationship' ? '已跳过关系。' : '已跳过来源。' });
          setSaveState({ status: 'unsaved' });
        }}
      >
        暂不维护
      </Button>
    )
    : undefined;

  return (
    <WizardShell
      title="建谱向导"
      description="按宗族、支派、字辈、人物、关系、来源和完成顺序完成建谱。"
      contextLabel={currentClanLabel}
      saveStatus={saveStatus}
      steps={steps}
      activeStep={active}
      loaded={sessionReady && !stateLoading}
      result={result}
      gateNotice={gateNotice}
      onExit={handleExit}
      onStepChange={requestStepChange}
      onGateAction={gateActionStep}
      onContentChange={markUnsaved}
      navigation={{
        previousDisabled: !sessionReady || activeIndex === 0,
        saveDisabled: !sessionReady,
        nextDisabled: !sessionReady || Boolean(activeDecision && !activeDecision.canEnter),
        saveLabel: '保存',
        nextLabel: active === 'review' ? '完成建谱' : '下一步',
        extra: skipActiveStep,
        onPrevious: goPrevious,
        onSaveDraft: saveWizardProgress,
        onNext: goNext
      }}
    >
      <StepRenderer
        activeStep={active}
        notify={notify}
        onSubmittedReview={handleSubmittedReview}
        onStepChange={requestStepChange}
      />
    </WizardShell>
  );
}
