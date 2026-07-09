import type { ReactNode } from 'react';
import { Card, Descriptions, Space, Steps, Tag, Typography } from 'antd';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export type WizardStepMeta<TKey extends string = string> = { key: TKey; title: string; desc: string; ready?: boolean };

type WizardShellProps<TKey extends string = string> = { steps: WizardStepMeta<TKey>[]; activeStep: TKey; loaded: boolean; result?: unknown; onStepChange: (step: TKey) => void; children: ReactNode };
type StepGuide = { prerequisite: string; operation: string; result: string; next: string };

const stepGuides: Record<string, StepGuide> = {
  clan: { prerequisite: '准备宗族名称、姓氏、堂号、祖籍等基础资料；无需填写系统标识。', operation: '录入宗族基础信息并创建宗族容器。', result: '宗族创建成功后成为后续支派、字辈、人物、来源的业务范围。', next: '进入“建立支派”，为该宗族维护支派结构。' },
  branch: { prerequisite: '已创建或选择宗族；父支派只能选择已审核通过的支派。', operation: '创建支派草稿，可保存后单独提交或批量提交审核。', result: '审核通过的支派可作为字辈、人物和来源资料的归属范围。', next: '进入“维护字辈”，为已通过支派维护字辈方案。' },
  generation: { prerequisite: '已选择宗族和可用支派；字辈方案需要与支派范围关联。', operation: '维护字辈方案与字辈明细，并提交审核。', result: '审核通过的字辈可用于人物代次、字辈录入与检索。', next: '进入“录入人物”，按支派和字辈录入族人档案。' },
  person: { prerequisite: '已选择宗族、支派和可用字辈；人物资料需来自真实录入或后端返回。', operation: '录入人物基础信息、世次字辈、出生/逝世等档案字段。', result: '人物保存为草稿后提交审核，审核通过后进入正式族谱。', next: '进入“建立关系”，基于已通过人物建立亲属关系。' },
  relationship: { prerequisite: '已存在审核通过的人物；关系两端都需要是可选择的业务人物。', operation: '选择起点人物、关联人物和关系类型，完成关系校验后提交。', result: '审核通过的关系用于世系图谱、家庭树和人物详情展示。', next: '进入“绑定来源”，为人物或关系补充来源资料。' },
  source: { prerequisite: '已选择宗族以及需要绑定来源的人物、关系或支派对象。', operation: '维护来源摘要、来源类型，并绑定到业务对象。', result: '来源资料可支撑人物、关系、支派的可信度和审核依据。', next: '进入“审核进度”，查看提交结果并处理待审事项。' },
  review: { prerequisite: '已有支派、字辈、人物、关系或来源等待审核对象。', operation: '查看审核任务状态，跟踪提交、通过、驳回等处理结果。', result: '通过审核的对象进入正式使用范围；驳回对象需补充资料后重提。', next: '进入“查看世系”，基于正式人物和关系查看图谱。' },
  tree: { prerequisite: '已有审核通过的人物和关系；图谱只基于后端返回数据生成。', operation: '选择中心人物或支派范围，查看上溯、下传和家庭关系。', result: '形成可浏览的世系视图，并暴露缺失数据的待维护提示。', next: '返回前序步骤继续补齐人物、关系、来源或审核数据。' }
};

function stepGuideOf(step: string): StepGuide { return stepGuides[step] || { prerequisite: '请按当前步骤要求准备业务资料。', operation: '完成当前步骤表单或列表操作。', result: '操作完成后由后端返回结果并刷新页面。', next: '按向导进入下一步。' }; }

export function WizardShell<TKey extends string = string>({ steps, activeStep, loaded, result, onStepChange, children }: WizardShellProps<TKey>) {
  const activeIndex = Math.max(0, steps.findIndex(step => step.key === activeStep));
  const activeMeta = steps[activeIndex];
  const guide = stepGuideOf(String(activeStep));

  function handleStepChange(index: number) { const nextStep = steps[index]; if (nextStep) onStepChange(nextStep.key); }

  return (
    <div className="mvp1-wizard-page">
      <Panel title="MVP1 建谱向导" description="对象先保存为草稿，可在创建页内提交审核；只有审核通过对象才能进入下一步关联。">
        <Steps className="wizard-ant-steps" direction="vertical" size="small" current={activeIndex} onChange={handleStepChange} items={steps.map(step => ({ title: step.title, description: step.desc, status: step.key === activeStep ? 'process' : step.ready ? 'finish' : 'wait' }))} />
      </Panel>
      {activeMeta ? (
        <Card title={<Space><Tag color="processing">当前步骤</Tag><Typography.Text strong>{activeMeta.title}</Typography.Text></Space>} style={{ marginBottom: 16 }}>
          <Descriptions size="small" bordered column={1}>
            <Descriptions.Item label="前置条件">{guide.prerequisite}</Descriptions.Item>
            <Descriptions.Item label="当前操作">{guide.operation}</Descriptions.Item>
            <Descriptions.Item label="完成结果">{guide.result}</Descriptions.Item>
            <Descriptions.Item label="下一步入口">{guide.next}</Descriptions.Item>
          </Descriptions>
        </Card>
      ) : null}
      {result ? <ResultNotice data={result} /> : null}
      {!loaded ? <div className="wizard-step-hint">点击步骤后加载本步骤数据。</div> : null}
      {children}
    </div>
  );
}
