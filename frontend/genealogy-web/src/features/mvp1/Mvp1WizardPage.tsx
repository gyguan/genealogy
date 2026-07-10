import { useMemo, useState } from 'react';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { StepRenderer, type Mvp1StepKey } from './StepRenderer';
import { WizardShell } from './WizardShell';

type Notice = { message: string; id?: string | number };
type Props = { notify: (data: unknown, error?: boolean) => void };

const stepOrder: { key: Mvp1StepKey; title: string; desc: string }[] = [
  { key: 'clan', title: '1. 创建宗族', desc: '独立创建宗族，创建后进入支派维护。' },
  { key: 'branch', title: '2. 建立支派', desc: '支派需审核通过后才能用于字辈和人物。' },
  { key: 'generation', title: '3. 维护字辈', desc: '字辈方案需审核通过后才能用于录入人物。' },
  { key: 'person', title: '4. 录入人物', desc: '人物需审核通过后才能建立关系。' },
  { key: 'relationship', title: '5. 建立关系', desc: '只允许选择已通过审核的人物。' },
  { key: 'source', title: '6. 绑定来源', desc: '只允许绑定已通过审核的对象。' },
  { key: 'review', title: '7. 审核进度', desc: '查看待审任务，也可补充提交草稿对象。' }
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
