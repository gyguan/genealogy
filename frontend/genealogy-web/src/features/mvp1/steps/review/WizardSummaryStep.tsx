import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Result, Row, Space, Spin, Statistic, Tag, Typography } from 'antd';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Panel } from '../../../../shared/ui/Panel';
import type { Mvp1StepKey } from '../../domain/wizardStepState';
import type { SummarySection } from '../../domain/wizardSummaryModel';
import { loadWizardSummary } from '../../services/wizardSummaryService';
import './wizard-summary-step.css';

type Props = {
  notify?: (data: unknown, error?: boolean) => void;
  onStepChange: (step: Mvp1StepKey) => void;
};

type SummaryData = Awaited<ReturnType<typeof loadWizardSummary>>;

const statusMeta = [
  ['draft', '草稿', 'default'],
  ['reviewing', '审核中', 'processing'],
  ['approved', '已通过', 'success'],
  ['rejected', '已驳回', 'error'],
  ['invalid', '需重新确认', 'warning']
] as const;

function navigate(view: 'reviewCenter' | 'personArchive' | 'treeProduct') {
  const url = new URL(window.location.href);
  url.searchParams.set('view', view);
  url.searchParams.delete('step');
  window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function SectionCard({ section, onRetry }: { section: SummarySection; onRetry: () => void }) {
  return (
    <Card className="wizard-summary-section" size="small" title={section.title} extra={<Button type="link" onClick={() => onRetry()}>刷新</Button>}>
      {section.error ? <Alert type="error" showIcon message={section.error} action={<Button size="small" onClick={onRetry}>重试</Button>} /> : null}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8}><Statistic title="总数" value={section.counts.total} /></Col>
        {section.detailCount !== undefined ? <Col xs={12} sm={8}><Statistic title="明细/绑定" value={section.detailCount} /></Col> : null}
      </Row>
      <Space size={[6, 6]} wrap className="wizard-summary-statuses">
        {section.counts.unmaintained ? <Tag>未维护</Tag> : null}
        {statusMeta.map(([key, label, color]) => section.counts[key] ? <Tag key={key} color={color}>{label} {section.counts[key]}</Tag> : null)}
      </Space>
    </Card>
  );
}

export function WizardSummaryStep({ notify, onStepChange }: Props) {
  const workspace = useWorkspace();
  const [summary, setSummary] = useState<SummaryData>();
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loadError, setLoadError] = useState('');

  async function load() {
    if (!workspace.clanId) {
      setSummary(undefined);
      setLoadError('请先选择宗族，再生成建谱结果汇总。');
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      setSummary(await loadWizardSummary(workspace.clanId, workspace.personId));
    } catch (error) {
      setLoadError((error as Error).message || '加载建谱汇总失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [workspace.clanId, workspace.personId, workspace.relationshipId, workspace.sourceId]);

  function completeWizard() {
    if (!summary?.complete) return;
    setCompleted(true);
    notify?.({ message: '本次建谱已完成' });
  }

  if (completed) {
    return (
      <Result
        status="success"
        title="建谱完成"
        subTitle="本次宗族、支派、字辈、人物、关系和来源均已满足完成条件。"
        extra={[
          <Button key="persons" type="primary" onClick={() => navigate('personArchive')}>查看人物档案</Button>,
          <Button key="tree" onClick={() => navigate('treeProduct')}>查看世系图谱</Button>,
          <Button key="review" onClick={() => navigate('reviewCenter')}>进入审核中心</Button>
        ]}
      />
    );
  }

  return (
    <Panel title="建谱结果汇总" description="集中查看各步骤完成情况、审核状态和阻塞项；审批操作请进入独立审核中心。">
      <div className="wizard-summary-header-actions">
        <Button loading={loading} onClick={() => void load()}>刷新汇总</Button>
        <Button onClick={() => navigate('reviewCenter')}>进入审核中心</Button>
      </div>
      {loadError ? <Alert type="error" showIcon message={loadError} action={<Button size="small" onClick={() => void load()}>重试</Button>} /> : null}
      {loading && !summary ? <div className="wizard-summary-loading"><Spin /><Typography.Text type="secondary">正在汇总建谱结果…</Typography.Text></div> : null}
      {summary ? (
        <>
          <div className="wizard-summary-grid">
            {summary.sections.map(section => <SectionCard key={section.key} section={section} onRetry={() => void load()} />)}
          </div>

          <Card className="wizard-summary-blockers" title={`完成检查（${summary.blockers.length} 项阻塞）`}>
            {summary.blockers.length ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {summary.blockers.map(blocker => (
                  <Alert
                    key={blocker.key}
                    type="warning"
                    showIcon
                    message={blocker.title}
                    description={blocker.reason}
                    action={<Button size="small" onClick={() => onStepChange(blocker.step)}>返回处理</Button>}
                  />
                ))}
              </Space>
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有阻塞项，可以完成建谱" />}
          </Card>

          <Card className="wizard-summary-completion" size="small">
            <div>
              <Typography.Title level={4}>{summary.complete ? '所有完成条件均已满足' : '建谱尚未完成'}</Typography.Title>
              <Typography.Paragraph type="secondary">
                {summary.complete ? '确认后将进入建谱完成结果页。' : `请先处理上方 ${summary.blockers.length} 项阻塞；审核中的对象不会被计为完成。`}
              </Typography.Paragraph>
            </div>
            <Button type="primary" size="large" disabled={!summary.complete} onClick={completeWizard}>完成建谱</Button>
          </Card>
        </>
      ) : null}
    </Panel>
  );
}
