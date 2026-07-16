import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Empty, Segmented, Select, Space, Steps, Tabs, Tag, Typography } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { AsyncImportExecutionPanel } from './AsyncImportExecutionPanel';
import { ImportJobManagementPanel } from './ImportJobManagementPanel';
import { ImportReviewHistoryPanel } from './ImportReviewHistoryPanel';
import { PersonImportWorkspace } from './PersonImportWorkspace';
import { RelationshipImportWorkspace } from './RelationshipImportWorkspace';
import { SourceImportWorkspace } from './SourceImportWorkspace';
import { emptyImportWorkspaceProgress } from './import-workspace-progress';
import type { ImportWorkspaceProgress } from './import-workspace-progress';
import { importTypeRegistry } from './import-type-registry';
import type { ImportTypeKey } from './import-type-registry';
import './import-workbench.css';

type Props = { notify: (data: unknown, error?: boolean) => void };
type ImportViewKey = 'create' | 'executions' | 'history';

type BranchOption = {
  id: number | string;
  branchName?: string;
  status?: string;
};

function stepIndex(branchSelected: boolean, progress: ImportWorkspaceProgress) {
  if (!branchSelected) return 0;
  if (!progress.hasFile) return 1;
  if (!progress.previewReady) return 2;
  return 3;
}

export function ImportPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [activeView, setActiveView] = useState<ImportViewKey>('create');
  const [activeType, setActiveType] = useState<ImportTypeKey>('person');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState('');
  const [jobRefreshKey, setJobRefreshKey] = useState(0);
  const [progress, setProgress] = useState<ImportWorkspaceProgress>(emptyImportWorkspaceProgress);
  const [invalidationMessage, setInvalidationMessage] = useState('');

  useEffect(() => {
    let active = true;
    const preferredBranchId = workspace.branchId;

    setBranches([]);
    setSelectedBranchId('');
    setBranchError('');
    setProgress(emptyImportWorkspaceProgress);
    workspace.setBranchId('');

    if (!workspace.clanId) {
      return () => { active = false; };
    }

    setBranchLoading(true);
    void apiClient.get<BranchOption[]>(`/clans/${workspace.clanId}/branches`)
      .then(data => {
        if (!active) return;
        const records = Array.isArray(data) ? data : [];
        setBranches(records);
        const preferred = records.some(branch => String(branch.id) === preferredBranchId) ? preferredBranchId : '';
        setSelectedBranchId(preferred);
        workspace.setBranchId(preferred);
      })
      .catch(error => {
        if (!active) return;
        setBranchError((error as Error).message || '目标支派加载失败');
      })
      .finally(() => {
        if (active) setBranchLoading(false);
      });

    return () => { active = false; };
  }, [workspace.clanId]);

  const selectedBranch = useMemo(
    () => branches.find(branch => String(branch.id) === selectedBranchId),
    [branches, selectedBranchId]
  );

  function refreshJobs() {
    setJobRefreshKey(current => current + 1);
  }

  function invalidateProgress(message: string) {
    setProgress(emptyImportWorkspaceProgress);
    setInvalidationMessage(message);
  }

  function changeBranch(value: string) {
    if (value !== selectedBranchId && (progress.hasFile || progress.previewReady)) {
      invalidateProgress('目标支派已变更，原文件和预检结果已失效，请重新上传并预检。');
    } else {
      setInvalidationMessage('');
    }
    setSelectedBranchId(value);
    workspace.setBranchId(value);
    refreshJobs();
  }

  function changeType(value: string | number) {
    const nextType = String(value) as ImportTypeKey;
    if (nextType === activeType) return;
    if (progress.hasFile || progress.previewReady) {
      invalidateProgress('导入对象已变更，原文件和预检结果已失效，请使用对应模板重新上传。');
    } else {
      setProgress(emptyImportWorkspaceProgress);
      setInvalidationMessage('');
    }
    setActiveType(nextType);
  }

  function updateProgress(next: ImportWorkspaceProgress) {
    setProgress(next);
    if (next.hasFile) setInvalidationMessage('');
  }

  function handleBatchCreated() {
    setProgress({ hasFile: false, previewReady: false, batchCreated: true });
    refreshJobs();
    setActiveView('executions');
  }

  function targetSummary() {
    if (!selectedBranch) return '';
    const branchName = selectedBranch.branchName || '未命名支派';
    if (activeType === 'relationship') return `批次管理支派：${branchName}；关系双方仍按各自支派权限校验。`;
    if (activeType === 'source') return `批次管理支派：${branchName}。`;
    return `导入人物归属：${branchName}。`;
  }

  const workspaceProps = {
    notify,
    clanId: workspace.clanId,
    branchId: selectedBranchId,
    branchName: selectedBranch?.branchName || '',
    onBatchCreated: handleBatchCreated,
    onProgressChange: updateProgress
  };

  const createContent = (
    <Space direction="vertical" size={16} className="import-workbench-stack">
      <Card className="import-progress-card">
        <Steps
          className="import-workbench-steps"
          current={stepIndex(Boolean(selectedBranch), progress)}
          status={progress.batchCreated ? 'finish' : 'process'}
          responsive
          items={[
            { title: '选择目标', description: selectedBranch ? '已完成' : '选择支派' },
            { title: '上传文件', description: progress.hasFile ? '已选择文件' : '使用标准模板' },
            { title: '数据预检', description: progress.previewReady ? '预检完成' : '校验错误与重复' },
            { title: '创建批次', description: progress.batchCreated ? '已创建' : '生成导入草稿' }
          ]}
        />
      </Card>

      <Card title="选择导入对象与目标范围">
        <Space direction="vertical" size="middle" className="import-workbench-stack">
          <div>
            <Typography.Text strong>导入对象</Typography.Text>
            <div className="import-type-selector">
              <Segmented
                block
                value={activeType}
                onChange={changeType}
                options={importTypeRegistry.map(type => ({
                  value: type.key,
                  label: type.availability === 'planned' ? `${type.title}（规划中）` : type.title,
                  disabled: type.availability === 'planned'
                }))}
              />
            </div>
          </div>

          {!workspace.clanId ? <Alert type="warning" showIcon message="请先在应用顶部选择所属宗族。" /> : null}
          {branchError ? <Alert type="error" showIcon message={branchError} /> : null}
          {invalidationMessage ? <Alert type="warning" showIcon message={invalidationMessage} closable onClose={() => setInvalidationMessage('')} /> : null}

          <div className="import-target-field">
            <Typography.Text strong>目标支派</Typography.Text>
            <Select
              showSearch
              allowClear
              loading={branchLoading}
              disabled={!workspace.clanId || branchLoading || branches.length === 0}
              placeholder="请选择本次导入的目标支派"
              value={selectedBranchId || undefined}
              optionFilterProp="label"
              options={branches.map(branch => ({
                value: String(branch.id),
                label: branch.branchName || '未命名支派',
                disabled: String(branch.status || '').toLowerCase() === 'archived'
              }))}
              onChange={value => changeBranch(value || '')}
            />
          </div>

          {workspace.clanId && !branchLoading && !branchError && branches.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可选支派，请先建立支派" />
          ) : null}
          {selectedBranch ? <Typography.Text type="secondary">{targetSummary()}</Typography.Text> : null}
        </Space>
      </Card>

      {activeType === 'person' ? <PersonImportWorkspace {...workspaceProps} /> : null}
      {activeType === 'relationship' ? <RelationshipImportWorkspace {...workspaceProps} /> : null}
      {activeType === 'source' ? <SourceImportWorkspace {...workspaceProps} /> : null}
    </Space>
  );

  return (
    <div className="import-center-page">
      <header className="import-page-header">
        <div>
          <Typography.Title level={3}>数据导入</Typography.Title>
          <Typography.Paragraph type="secondary">
            通过标准模板批量导入人物、关系和来源资料。导入数据先生成草稿，经审核后进入正式谱库。
          </Typography.Paragraph>
        </div>
        <Space wrap>
          <Tag color={workspace.clanId ? 'processing' : 'warning'}>{workspace.clanId ? '已选择宗族' : '未选择宗族'}</Tag>
          {selectedBranch ? <Tag>{selectedBranch.branchName || '未命名支派'}</Tag> : null}
        </Space>
      </header>

      <Tabs
        activeKey={activeView}
        onChange={key => setActiveView(key as ImportViewKey)}
        items={[
          { key: 'create', label: '新建导入', children: createContent },
          {
            key: 'executions',
            label: '执行任务',
            children: (
              <AsyncImportExecutionPanel
                notify={notify}
                clanId={workspace.clanId}
                branchId={selectedBranchId}
                refreshKey={jobRefreshKey}
                onChanged={refreshJobs}
              />
            )
          },
          {
            key: 'history',
            label: '导入记录',
            children: (
              <Space direction="vertical" size={16} className="import-workbench-stack">
                <ImportJobManagementPanel notify={notify} refreshKey={jobRefreshKey} />
                <ImportReviewHistoryPanel notify={notify} refreshKey={jobRefreshKey} />
              </Space>
            )
          }
        ]}
      />
    </div>
  );
}
