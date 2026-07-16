import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'antd';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { StepRenderer, type Mvp1StepKey } from './StepRenderer';
import { loadClans, type ClanLike } from './services/clanService';
import { WizardShell } from './WizardShell';

type Notice = { message: string; id?: string | number };
type Props = { notify: (data: unknown, error?: boolean) => void };
type SaveState = { status: 'unsaved' | 'saved'; savedAt?: string };

const stepOrder: { key: Mvp1StepKey; title: string; desc: string }[] = [
  { key: 'clan', title: '宗族', desc: '创建宗族基础信息，完成后进入支派维护。' },
  { key: 'branch', title: '支派', desc: '建立支派并提交审核，通过后可用于字辈和人物。' },
  { key: 'generation', title: '字辈', desc: '维护字辈方案和明细，通过审核后可用于人物。' },
  { key: 'person', title: '人物', desc: '录入人物档案，通过审核后可建立亲属关系。' },
  { key: 'relationship', title: '关系', desc: '在已通过审核的人物之间建立亲属关系。' },
  { key: 'source', title: '来源', desc: '为已通过审核的对象绑定可追溯来源。' },
  { key: 'review', title: '审核', desc: '查看待审任务并补充提交草稿对象。' }
];

function clanLabel(clan?: ClanLike) {
  return clan?.clanName || clan?.surname || '已选择宗族';
}

function navigateToView(view: 'home' | 'reviewCenter') {
  const url = new URL(window.location.href);
  if (view === 'home') url.searchParams.delete('view');
  else url.searchParams.set('view', view);
  window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function Mvp1WizardPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [active, setActive] = useState<Mvp1StepKey>('clan');
  const [result, setResult] = useState<Notice | undefined>();
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [saveState, setSaveState] = useState<SaveState>({ status: 'unsaved' });

  useEffect(() => {
    let mounted = true;
    void loadClans().then(rows => {
      if (mounted) setClans(rows);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const steps = useMemo(() => [
    { ...stepOrder[0], ready: Boolean(workspace.clanId) },
    { ...stepOrder[1], ready: Boolean(workspace.branchId) },
    { ...stepOrder[2], ready: Boolean(workspace.branchId) },
    { ...stepOrder[3], ready: Boolean(workspace.personId) },
    { ...stepOrder[4], ready: Boolean(workspace.relationshipId) },
    { ...stepOrder[5], ready: Boolean(workspace.sourceId) },
    { ...stepOrder[6], ready: Boolean(workspace.reviewTaskId) }
  ], [
    workspace.clanId,
    workspace.branchId,
    workspace.personId,
    workspace.relationshipId,
    workspace.sourceId,
    workspace.reviewTaskId
  ]);

  const activeIndex = Math.max(0, stepOrder.findIndex(step => step.key === active));
  const selectedClan = clans.find(clan => String(clan.id || '') === String(workspace.clanId || ''));
  const currentClanLabel = workspace.clanId ? clanLabel(selectedClan) : '尚未选择宗族';
  const saveStatus = saveState.status === 'saved'
    ? { label: saveState.savedAt ? `本次会话已保存 · ${saveState.savedAt}` : '本次会话已保存', color: 'success' }
    : { label: '存在未保存进度', color: 'warning' };

  function markUnsaved() {
    setSaveState(current => current.status === 'unsaved' ? current : { status: 'unsaved' });
  }

  function changeStep(step: Mvp1StepKey) {
    setActive(step);
    setResult(undefined);
    setSaveState({ status: 'unsaved' });
  }

  function handleSubmittedReview(taskId: string) {
    if (taskId) workspace.setReviewTaskId(taskId);
    setResult({ message: '审核任务已提交', id: taskId });
    setSaveState({ status: 'saved', savedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) });
    setActive('review');
  }

  function saveWizardProgress() {
    const savedAt = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setSaveState({ status: 'saved', savedAt });
    setResult({ message: '当前建谱进度已保留在本次会话中；业务对象仍以步骤内保存结果为准。' });
    notify({ message: '建谱进度已保存' });
  }

  function goPrevious() {
    const previous = stepOrder[activeIndex - 1];
    if (previous) changeStep(previous.key);
  }

  function goNext() {
    const next = stepOrder[activeIndex + 1];
    if (next) {
      changeStep(next.key);
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
      onExit={confirmExit}
      onStepChange={changeStep}
      onContentChange={markUnsaved}
      navigation={{
        previousDisabled: activeIndex === 0,
        onPrevious: goPrevious,
        onSaveDraft: saveWizardProgress,
        onNext: goNext,
        nextLabel: activeIndex === stepOrder.length - 1 ? '进入审核中心' : '下一步'
      }}
    >
      <StepRenderer
        activeStep={active}
        notify={notify}
        onStepChange={changeStep}
        onSubmittedReview={handleSubmittedReview}
      />
    </WizardShell>
  );
}
