import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Empty, Select, Space, Steps, Tabs, Tag, Typography } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { AsyncImportExecutionPanel } from './AsyncImportExecutionPanel';
import { ImportJobManagementPanel } from './ImportJobManagementPanel';
import { PersonImportWorkspace } from './PersonImportWorkspace';
import { RelationshipImportWorkspace } from './RelationshipImportWorkspace';
import { SourceImportWorkspace } from './SourceImportWorkspace';
import { importTypeRegistry } from './import-type-registry';
import type { ImportTypeKey } from './import-type-registry';

type Props = { notify: (data: unknown, error?: boolean) => void };

type BranchOption = {
  id: number | string;
  branchName?: string;
  status?: string;
};

export function ImportPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [activeType, setActiveType] = useState<ImportTypeKey>('person');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState('');
  const [jobRefreshKey, setJobRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const preferredBranchId = workspace.branchId;

    setBranches([]);
    setSelectedBranchId('');
    setBranchError('');
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

  function changeBranch(value: string) {
    setSelectedBranchId(value);
    workspace.setBranchId(value);
    refreshJobs();
  }

  function targetSummary() {
    if (!selectedBranch) return '';
    const branchName = selectedBranch.branchName || '未命名支派';
    if (activeType === 'relationship') return `批次管理支派：${branchName}；关系双方仍按各自支派权限校验。`;
    if (activeType === 'source') return `批次管理支派：${branchName}。`;
    return `导入人物归属：${branchName}。`;
  }

  return (
    <div className="import-center-page">
      <Card title="选择导入类型与目标">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Steps
            size="small"
            current={selectedBranch ? 1 : 0}
            items={[{ title: '选择目标' }, { title: '上传并预览' }, { title: '创建批次' }]}
          />
          <Tabs
            activeKey={activeType}
            onChange={key => setActiveType(key as ImportTypeKey)}
            items={importTypeRegistry.map(type => ({
              key: type.key,
              disabled: type.availability === 'planned',
              label: (
                <Space size={6}>
                  <span>{type.title}</span>
                  {type.availability === 'planned' ? <Tag>规划中</Tag> : null}
                </Space>
              )
            }))}
          />
          {!workspace.clanId ? <Alert type="warning" showIcon message="请先在应用顶部选择所属宗族。" /> : null}
          {branchError ? <Alert type="error" showIcon message={branchError} /> : null}
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
            style={{ width: '100%', maxWidth: 520 }}
            onChange={value => changeBranch(value || '')}
          />
          {workspace.clanId && !branchLoading && !branchError && branches.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可选支派，请先建立支派" />
          ) : null}
          {selectedBranch ? <Typography.Text type="secondary">{targetSummary()}</Typography.Text> : null}
        </Space>
      </Card>

      {activeType === 'person' ? (
        <PersonImportWorkspace
          notify={notify}
          clanId={workspace.clanId}
          branchId={selectedBranchId}
          branchName={selectedBranch?.branchName || ''}
          onBatchCreated={refreshJobs}
        />
      ) : null}

      {activeType === 'relationship' ? (
        <RelationshipImportWorkspace
          notify={notify}
          clanId={workspace.clanId}
          branchId={selectedBranchId}
          branchName={selectedBranch?.branchName || ''}
          onBatchCreated={refreshJobs}
        />
      ) : null}

      {activeType === 'source' ? (
        <SourceImportWorkspace
          notify={notify}
          clanId={workspace.clanId}
          branchId={selectedBranchId}
          branchName={selectedBranch?.branchName || ''}
          onBatchCreated={refreshJobs}
        />
      ) : null}

      <AsyncImportExecutionPanel
        notify={notify}
        clanId={workspace.clanId}
        branchId={selectedBranchId}
        refreshKey={jobRefreshKey}
        onChanged={refreshJobs}
      />
      <ImportJobManagementPanel notify={notify} refreshKey={jobRefreshKey} />
    </div>
  );
}
