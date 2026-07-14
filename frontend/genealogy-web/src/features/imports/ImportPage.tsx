import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Empty, Select, Space, Tabs, Tag, Typography } from 'antd';
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

  const activeDefinition = importTypeRegistry.find(type => type.key === activeType) || importTypeRegistry[0];

  function refreshJobs() {
    setJobRefreshKey(current => current + 1);
  }

  function changeBranch(value: string) {
    setSelectedBranchId(value);
    workspace.setBranchId(value);
    refreshJobs();
  }

  function targetMessage() {
    if (!selectedBranch) return '';
    const branchName = selectedBranch.branchName || '未命名支派';
    if (activeType === 'relationship') {
      return `“${branchName}”将作为本次关系导入的批次管理支派，关系双方仍按各自支派权限校验。`;
    }
    if (activeType === 'source') {
      return `“${branchName}”将作为本次来源资料导入的批次管理支派，模板中无需也不允许填写宗族、支派或资料技术 ID。`;
    }
    return `本批次中的全部人物将归入“${branchName}”，文件中无需填写支派信息。`;
  }

  return (
    <div className="import-center-page">
      <Card>
        <Typography.Title level={3} style={{ marginTop: 0 }}>数据导入</Typography.Title>
        <Typography.Paragraph type="secondary">
          统一创建、修正、审核和追踪族谱数据导入批次。当前支持人物、人物关系和来源资料导入，其他数据类型将复用同一批次与审核流程逐步接入。
        </Typography.Paragraph>
        <Tabs
          activeKey={activeType}
          onChange={key => setActiveType(key as ImportTypeKey)}
          items={importTypeRegistry.map(type => ({
            key: type.key,
            disabled: type.availability === 'planned',
            label: (
              <Space size={6}>
                <span>{type.title}</span>
                <Tag color={type.availability === 'available' ? 'success' : 'default'}>
                  {type.availability === 'available' ? '已支持' : '规划中'}
                </Tag>
              </Space>
            )
          }))}
        />
        <Typography.Text type="secondary">{activeDefinition.description}</Typography.Text>
      </Card>

      <Card title="导入目标" style={{ marginTop: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {!workspace.clanId ? <Alert type="warning" showIcon message="请先在应用顶部选择所属宗族，再选择本次导入的目标支派。" /> : null}
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
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前宗族暂无可选支派，请先建立支派。" />
          ) : null}
          {selectedBranch ? (
            <Alert type="success" showIcon message={targetMessage()} />
          ) : (
            workspace.clanId && branches.length > 0 ? <Alert type="info" showIcon message="请选择目标支派后再上传文件。" /> : null
          )}
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
