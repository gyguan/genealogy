import { useMemo, useState } from 'react';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { StepRenderer, type Mvp1StepKey } from './StepRenderer';
import { WizardShell } from './WizardShell';

type Notice = { message: string; id?: string | number };
type Props = { notify: (data: unknown, error?: boolean) => void };

const stepOrder: { key: Mvp1StepKey; title: string; desc: string }[] = [
  { key: 'clan', title: '宗族', desc: '创建宗族基础信息，完成后进入支派维护。' },
  { key: 'branch', title: '支派', desc: '建立支派并提交审核，通过后可用于字辈和人物。' },
  { key: 'generation', title: '字辈', desc: '维护字辈方案和明细，通过审核后可用于人物。' },
  { key: 'person', title: '人物', desc: '录入人物档案，通过审核后可建立亲属关系。' },
  { key: 'relationship', title: '关系', desc: '在已通过审核的人物之间建立亲属关系。' },
  { key: 'source', title: '来源', desc: '为已通过审核的对象绑定可追溯来源。' },
  { key: 'review', title: '审核', desc: '查看待审任务并补充提交草稿对象。' }
];

export function Mvp1WizardPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [active, setActive] = useState<Mvp1StepKey>('clan');
  const [result, setResult] = useState<Notice | undefined>();

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

  function changeStep(step: Mvp1StepKey) {
    setActive(step);
    setResult(undefined);
  }

  function handleSubmittedReview(taskId: string) {
    if (taskId) workspace.setReviewTaskId(taskId);
    setResult({ message: '审核任务已提交', id: taskId });
    setActive('review');
  }

  return (
    <WizardShell
      steps={steps}
      activeStep={active}
      loaded
      result={result}
      onStepChange={changeStep}
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
