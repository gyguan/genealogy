import { UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Tabs,
  Typography
} from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { QueryResultCard } from '../../shared/ui/QueryResultCards';
import { StandardQueryActions } from '../../shared/ui/StandardQueryActions';
import { StandardQueryField, StandardQueryGrid, StandardQueryPanel } from '../../shared/ui/StandardPagePatterns';
import { PageFeedback } from '../../shared/ui/Feedback';
import { AsyncImportExecutionPanel } from './AsyncImportExecutionPanel';
import { ImportFilterMultiSelect } from './ImportFilterMultiSelect';
import { ImportHistoryOverviewPanel } from './ImportHistoryOverviewPanel';
import { ImportJobManagementPanel } from './ImportJobManagementPanel';
import { ImportReviewHistoryPanel } from './ImportReviewHistoryPanel';
import { ImportTypeSelector } from './ImportTypeSelector';
import { PersonImportWorkspace } from './PersonImportWorkspace';
import { RelationshipImportWorkspace } from './RelationshipImportWorkspace';
import { SourceImportWorkspace } from './SourceImportWorkspace';
import { readImportPageUrl, writeImportPageUrl } from './import-page-state';
import { importTaskStatusOptions } from './import-task-model';
import {
  defaultImportTaskQuery,
  readImportTaskQuery,
  writeImportTaskQuery,
  type ImportTaskQueryState,
  type ImportTaskStatusFilter
} from './import-task-query-state';
import { importTypeRegistry, type ImportTypeKey } from './import-type-registry';
import './import-workbench.css';

const { RangePicker } = DatePicker;
type Props = {  };
type BranchOption = { id: number | string; branchName?: string; status?: string };
type QueryFormValues = {
  importTypes?: ImportTypeKey[];
  statuses?: ImportTaskStatusFilter[];
  keyword?: string;
  createdRange?: [Dayjs, Dayjs];
};

const availableImportTypes = importTypeRegistry
  .filter(item => item.availability === 'available')
  .map(item => ({ value: item.key, label: item.title.replace('导入', '') }));

export function ImportPage({}: Props) {
  const workspace = useWorkspace();
  const initialPageState = useMemo(() => readImportPageUrl(window.location.search), []);
  const initialQuery = useMemo(() => readImportTaskQuery(window.location.search), []);
  const [queryForm] = Form.useForm<QueryFormValues>();
  const [query, setQuery] = useState<ImportTaskQueryState>(initialQuery);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState(initialPageState.branchId || workspace.branchId);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState('');
  const [activeType, setActiveType] = useState<ImportTypeKey>(initialPageState.type);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [jobRefreshKey, setJobRefreshKey] = useState(0);
  const [taskTotal, setTaskTotal] = useState(0);

  const selectedBranch = useMemo(
    () => branches.find(branch => String(branch.id) === selectedBranchId),
    [branches, selectedBranchId]
  );

  useEffect(() => {
    queryForm.setFieldsValue({
      importTypes: query.importTypes,
      statuses: query.statuses,
      keyword: query.keyword,
      createdRange: query.createdFrom && query.createdTo
        ? [dayjs(query.createdFrom), dayjs(query.createdTo)]
        : undefined
    });
  }, [query, queryForm]);

  useEffect(() => {
    const onPopState = () => {
      const nextPageState = readImportPageUrl(window.location.search);
      setQuery(readImportTaskQuery(window.location.search));
      setActiveType(nextPageState.type);
      setSelectedBranchId(nextPageState.branchId);
      workspace.setBranchId(nextPageState.branchId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let active = true;
    setBranches([]);
    setBranchError('');
    if (!workspace.clanId) {
      setSelectedBranchId('');
      workspace.setBranchId('');
      writeImportPageUrl({ branchId: '' });
      return () => { active = false; };
    }
    setBranchLoading(true);
    void apiClient.get<BranchOption[]>(`/clans/${workspace.clanId}/branches`)
      .then(data => {
        if (!active) return;
        const records = (Array.isArray(data) ? data : []).filter(branch => ['official', 'approved', 'active'].includes(String(branch.status || '').trim().toLowerCase()));
        setBranches(records);
        const preferred = records.some(branch => String(branch.id) === selectedBranchId)
          ? selectedBranchId
          : records.some(branch => String(branch.id) === workspace.branchId)
            ? workspace.branchId
            : '';
        setSelectedBranchId(preferred);
        workspace.setBranchId(preferred);
        writeImportPageUrl({ branchId: preferred });
      })
      .catch(error => { if (active) setBranchError((error as Error).message || '目标支派加载失败'); })
      .finally(() => { if (active) setBranchLoading(false); });
    return () => { active = false; };
  }, [workspace.clanId]);

  function refreshJobs() {
    setJobRefreshKey(current => current + 1);
  }

  function applySearch(values: QueryFormValues) {
    const range = values.createdRange;
    const next: ImportTaskQueryState = {
      ...query,
      importTypes: values.importTypes || [],
      statuses: values.statuses || [],
      keyword: values.keyword?.trim() || '',
      createdFrom: range?.[0]?.format('YYYY-MM-DD') || '',
      createdTo: range?.[1]?.format('YYYY-MM-DD') || '',
      pageNo: 1
    };
    setQuery(next);
    writeImportTaskQuery(next, 'push');
  }

  function resetSearch() {
    const next = { ...defaultImportTaskQuery, pageSize: query.pageSize };
    setQuery(next);
    queryForm.resetFields();
    writeImportTaskQuery(next, 'push');
  }

  const changePage = useCallback((pageNo: number, pageSize: number) => {
    const next = { ...query, pageNo: pageSize === query.pageSize ? pageNo : 1, pageSize };
    setQuery(next);
    writeImportTaskQuery(next, 'replace');
  }, [query]);

  function changeBranch(value: string) {
    setSelectedBranchId(value);
    workspace.setBranchId(value);
    writeImportPageUrl({ branchId: value }, 'push');
    refreshJobs();
  }

  function changeType(value: ImportTypeKey) {
    setActiveType(value);
    writeImportPageUrl({ type: value });
  }

  function handleBatchCreated() {
    setImportDrawerOpen(false);
    refreshJobs();
  }

  const workspaceProps = {
    clanId: workspace.clanId,
    branchId: selectedBranchId,
    branchName: selectedBranch?.branchName || '',
    onBatchCreated: handleBatchCreated
  };

  return (
    <div className="import-center-page import-double-card-page">
      <StandardQueryPanel className="import-query-card" actions={(
        <StandardQueryActions>
          <Button data-query-action="reset" onClick={resetSearch}>重置</Button>
          <Button data-query-action="submit" htmlType="submit" form="import-query-form">查询</Button>
        </StandardQueryActions>
      )}>
        <Form<QueryFormValues> id="import-query-form" form={queryForm} layout="vertical" onFinish={applySearch}>
          <StandardQueryGrid>
            <StandardQueryField label="导入对象">
              <Form.Item name="importTypes" noStyle>
                <ImportFilterMultiSelect<ImportTypeKey> ariaLabel="导入对象" placeholder="全部导入对象" options={availableImportTypes} />
              </Form.Item>
            </StandardQueryField>
            <StandardQueryField label="导入状态">
              <Form.Item name="statuses" noStyle>
                <ImportFilterMultiSelect<ImportTaskStatusFilter> ariaLabel="导入状态" placeholder="全部导入状态" options={importTaskStatusOptions} />
              </Form.Item>
            </StandardQueryField>
            <StandardQueryField label="文件名/任务编号">
              <Form.Item name="keyword" noStyle>
                <Input allowClear placeholder="请输入文件名或任务编号" />
              </Form.Item>
            </StandardQueryField>
            <StandardQueryField label="任务创建时间">
              <Form.Item name="createdRange" noStyle>
                <RangePicker allowClear style={{ width: '100%' }} placeholder={['开始日期', '结束日期']} />
              </Form.Item>
            </StandardQueryField>
          </StandardQueryGrid>
        </Form>
      </StandardQueryPanel>

      <QueryResultCard
        className="import-result-card"
        extra={<Button type="primary" icon={<UploadOutlined />} disabled={!workspace.clanId} onClick={() => setImportDrawerOpen(true)}>发起导入</Button>}
        total={taskTotal}
        totalSuffix="个任务"
      >
        <AsyncImportExecutionPanel
          clanId={workspace.clanId}
          branchId={selectedBranchId}
          branchName={selectedBranch?.branchName}
          refreshKey={jobRefreshKey}
          query={query}
          onChanged={refreshJobs}
          onTotalChange={setTaskTotal}
          onPageChange={changePage}
          onOpenRecords={() => setRecordsOpen(true)}
        />
      </QueryResultCard>

      <Drawer
        open={importDrawerOpen}
        width={960}
        title="发起导入"
        className="import-upload-workspace-drawer"
        destroyOnHidden
        onClose={() => setImportDrawerOpen(false)}
      >
        <Space direction="vertical" size={16} className="import-workbench-stack">
          <ImportTypeSelector activeType={activeType} onTypeChange={changeType} />
          <Card size="small" title="2. 选择导入目标">
            <Space direction="vertical" size={12} className="import-workbench-stack">
              {!workspace.clanId ? <PageFeedback tone="warning" title="请先选择所属宗族。" /> : null}
              {branchError ? <PageFeedback tone="error" title={branchError} /> : null}
              <Select
                aria-label="目标支派"
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
            </Space>
          </Card>
          <div key={activeType} className="import-active-workspace">
            {activeType === 'person' ? <PersonImportWorkspace {...workspaceProps} /> : null}
            {activeType === 'relationship' ? <RelationshipImportWorkspace {...workspaceProps} /> : null}
            {activeType === 'source' ? <SourceImportWorkspace {...workspaceProps} /> : null}
          </div>
        </Space>
      </Drawer>

      <Drawer open={recordsOpen} width={1080} title="导入记录" destroyOnHidden onClose={() => setRecordsOpen(false)}>
        <Tabs items={[
          { key: 'overview', label: '导入记录', children: <ImportHistoryOverviewPanel refreshKey={jobRefreshKey} /> },
          { key: 'processing', label: '失败修正与审核提交', children: <ImportJobManagementPanel refreshKey={jobRefreshKey} /> },
          { key: 'review', label: '审核历史', children: <ImportReviewHistoryPanel refreshKey={jobRefreshKey} /> }
        ]} />
      </Drawer>
    </div>
  );
}
