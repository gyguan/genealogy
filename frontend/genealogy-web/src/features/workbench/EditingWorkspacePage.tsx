import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/utils/records';

type WorkbenchRisk = 'high' | 'medium' | 'low';
type WorkbenchStatus = 'pending' | 'processing' | 'ready' | 'blocked';
type WorkbenchTaskType = 'review_follow_up' | 'missing_source' | 'generation_mismatch' | 'relationship_check' | 'import_follow_up';

type ClanLike = {
  id?: number | string;
  clanName?: string;
  name?: string;
  surname?: string;
};

type BranchLike = {
  id?: number | string;
  branchName?: string;
  name?: string;
};

type PersonLike = {
  id?: number | string;
  name?: string;
  personName?: string;
  branchId?: number | string;
  branchName?: string;
  generationNo?: number | string;
  generationWord?: string;
  dataStatus?: string;
  status?: string;
};

type SourceLike = {
  id?: number | string;
  sourceName?: string;
  title?: string;
  status?: string;
  verificationStatus?: string;
};

type ReviewTaskLike = {
  id?: number | string;
  title?: string;
  targetType?: string;
  targetName?: string;
  status?: string;
  createdAt?: string;
};

type WorkbenchTask = {
  key: string;
  type: WorkbenchTaskType;
  typeText: string;
  objectName: string;
  branchName: string;
  risk: WorkbenchRisk;
  status: WorkbenchStatus;
  statusText: string;
  suggestion: string;
};

function clanLabel(clan: ClanLike) {
  return clan.clanName || clan.name || clan.surname || '未命名宗族';
}

function branchLabel(branch?: BranchLike) {
  return branch?.branchName || branch?.name || '支派待维护';
}

function personName(person?: PersonLike) {
  return person?.name || person?.personName || '未命名人物';
}

function sourceName(source?: SourceLike) {
  return source?.sourceName || source?.title || '未命名来源';
}

function statusOf(value?: string) {
  const text = String(value || '').trim().toLowerCase();
  if (['official', 'approved', 'reviewed'].includes(text)) return '已完成';
  if (['pending', 'pending_review'].includes(text)) return '待审核';
  if (text === 'rejected') return '已退回';
  if (text === 'draft') return '草稿';
  return text ? '处理中' : '待处理';
}

function riskColor(value: WorkbenchRisk) {
  if (value === 'high') return 'error';
  if (value === 'medium') return 'warning';
  return 'default';
}

function riskText(value: WorkbenchRisk) {
  if (value === 'high') return '高';
  if (value === 'medium') return '中';
  return '低';
}

function statusColor(value: WorkbenchStatus) {
  if (value === 'ready') return 'success';
  if (value === 'processing') return 'processing';
  if (value === 'blocked') return 'error';
  return 'default';
}

function reviewTargetText(value?: string) {
  const text = String(value || '').trim().toLowerCase().replace(/-/g, '_');
  const dict: Record<string, string> = {
    person: '人物',
    persons: '人物',
    relationship: '关系',
    relationships: '关系',
    source: '来源',
    sources: '来源',
    branch: '支派',
    branches: '支派',
    generation_scheme: '字辈方案',
    generation_schemes: '字辈方案'
  };
  return dict[text] || '审核对象';
}

function reviewTaskTitle(row: ReviewTaskLike) {
  const title = String(row.title || '').trim();
  if (title && !/#\d+/.test(title)) return title;
  if (row.targetName) return row.targetName;
  return `${reviewTargetText(row.targetType)}审核任务`;
}

function branchNameForPerson(person: PersonLike, branches: BranchLike[]) {
  const branchId = String(person.branchId || '');
  const branch = branches.find(item => String(item.id || '') === branchId);
  return person.branchName || branchLabel(branch);
}

function buildWorkbenchTasks(people: PersonLike[], branches: BranchLike[], sources: SourceLike[], reviewTasks: ReviewTaskLike[]): WorkbenchTask[] {
  const tasks: WorkbenchTask[] = [];

  reviewTasks.slice(0, 20).forEach((task, index) => {
    tasks.push({
      key: `review-${task.id || index}`,
      type: 'review_follow_up',
      typeText: '审核跟进',
      objectName: reviewTaskTitle(task),
      branchName: '按审核范围查看',
      risk: 'medium',
      status: 'processing',
      statusText: statusOf(task.status),
      suggestion: '进入审核中心查看差异并处理审核结论'
    });
  });

  const missingGenerationPeople = people.filter(person => !person.generationNo || !person.generationWord).slice(0, 12);
  missingGenerationPeople.forEach(person => {
    tasks.push({
      key: `generation-${person.id || personName(person)}`,
      type: 'generation_mismatch',
      typeText: '字辈/代次待补',
      objectName: personName(person),
      branchName: branchNameForPerson(person, branches),
      risk: 'medium',
      status: 'pending',
      statusText: '待补全',
      suggestion: '进入人物档案补充代次与字辈，提交审核前完成校验'
    });
  });

  if (people.length && !sources.length) {
    tasks.push({
      key: 'missing-source-all',
      type: 'missing_source',
      typeText: '来源证据缺失',
      objectName: '当前宗族人物档案',
      branchName: '全宗族',
      risk: 'high',
      status: 'blocked',
      statusText: '阻塞入谱',
      suggestion: '进入来源资料库维护老谱、口述、照片等证据后再绑定对象'
    });
  }

  if (people.length >= 2) {
    tasks.push({
      key: 'relationship-check-candidate',
      type: 'relationship_check',
      typeText: '关系复核建议',
      objectName: `${personName(people[0])} 与 ${personName(people[1])}`,
      branchName: branchNameForPerson(people[0], branches),
      risk: 'low',
      status: 'pending',
      statusText: '待复核',
      suggestion: '进入世系图谱或建谱向导核对亲属关系，避免重复或错连'
    });
  }

  return tasks;
}

export function EditingWorkspacePage() {
  const workspace = useWorkspace();
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [branches, setBranches] = useState<BranchLike[]>([]);
  const [people, setPeople] = useState<PersonLike[]>([]);
  const [sources, setSources] = useState<SourceLike[]>([]);
  const [reviewTasks, setReviewTasks] = useState<ReviewTaskLike[]>([]);
  const [logTotal, setLogTotal] = useState<number | string>('-');
  const [loading, setLoading] = useState(false);
  const [taskType, setTaskType] = useState('');
  const [risk, setRisk] = useState('');

  const activeClan = clans.find(item => String(item.id || '') === workspace.clanId) || clans[0];
  const workbenchTasks = useMemo(() => buildWorkbenchTasks(people, branches, sources, reviewTasks), [people, branches, sources, reviewTasks]);
  const filteredTasks = useMemo(() => workbenchTasks.filter(task => {
    const matchesType = !taskType || task.type === taskType;
    const matchesRisk = !risk || task.risk === risk;
    return matchesType && matchesRisk;
  }), [workbenchTasks, taskType, risk]);

  const highRiskCount = workbenchTasks.filter(task => task.risk === 'high').length;
  const sourceMissingCount = workbenchTasks.filter(task => task.type === 'missing_source').length;
  const generationIssueCount = workbenchTasks.filter(task => task.type === 'generation_mismatch').length;

  async function loadWorkbench(sourceClanId = workspace.clanId) {
    setLoading(true);
    try {
      const clanRows = toRecordList<ClanLike>(await apiClient.get('/clans').catch(() => []));
      setClans(clanRows);
      const nextClanId = sourceClanId || String(clanRows[0]?.id || '');
      if (nextClanId && !workspace.clanId) workspace.setClanId(nextClanId);
      if (!nextClanId) {
        setBranches([]);
        setPeople([]);
        setSources([]);
        setReviewTasks([]);
        setLogTotal('-');
        return;
      }
      const [branchData, personData, sourceData, reviewData, logData] = await Promise.all([
        apiClient.get(`/clans/${nextClanId}/branches`).catch(() => []),
        apiClient.get(`/clans/${nextClanId}/persons`).catch(() => []),
        apiClient.get(`/clans/${nextClanId}/sources`).catch(() => []),
        apiClient.get(`/clans/${nextClanId}/review-tasks/pending`).catch(() => []),
        apiClient.get(`/logs/operations/stats?clanId=${nextClanId}`).catch(() => null)
      ]);
      setBranches(toRecordList<BranchLike>(branchData));
      setPeople(toRecordList<PersonLike>(personData));
      setSources(toRecordList<SourceLike>(sourceData));
      setReviewTasks(toRecordList<ReviewTaskLike>(reviewData));
      setLogTotal((logData as any)?.totalCount ?? (logData as any)?.total ?? '-');
    } catch (error) {
      message.error((error as Error).message || '加载修谱工作台失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadWorkbench(); }, []);

  function changeClan(nextClanId: string) {
    workspace.setClanId(nextClanId);
    setTaskType('');
    setRisk('');
    void loadWorkbench(nextClanId);
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card loading={loading}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Typography.Text type="secondary">Workbench</Typography.Text>
          <Typography.Title level={3} style={{ margin: 0 }}>修谱工作台</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            聚合导入异常、审核退回、资料缺失、字辈/代次不一致和关系复核建议，帮助主编、支派负责人和采集员按任务处理修谱问题，而不是在多个页面之间反复查找。
          </Typography.Paragraph>
        </Space>
      </Card>

      <Card>
        <Space wrap align="end" style={{ width: '100%' }}>
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">当前宗族</Typography.Text>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: 260 }}
              value={workspace.clanId || String(activeClan?.id || '')}
              onChange={changeClan}
              options={clans.map(clan => ({ value: String(clan.id || ''), label: clanLabel(clan) }))}
              placeholder="请选择宗族"
            />
          </Space>
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">问题类型</Typography.Text>
            <Select
              style={{ width: 200 }}
              value={taskType}
              onChange={setTaskType}
              options={[
                { value: '', label: '全部问题' },
                { value: 'review_follow_up', label: '审核跟进' },
                { value: 'missing_source', label: '来源证据缺失' },
                { value: 'generation_mismatch', label: '字辈/代次待补' },
                { value: 'relationship_check', label: '关系复核建议' },
                { value: 'import_follow_up', label: '导入异常' }
              ]}
            />
          </Space>
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">风险等级</Typography.Text>
            <Select
              style={{ width: 160 }}
              value={risk}
              onChange={setRisk}
              options={[
                { value: '', label: '全部风险' },
                { value: 'high', label: '高风险' },
                { value: 'medium', label: '中风险' },
                { value: 'low', label: '低风险' }
              ]}
            />
          </Space>
          <Button type="primary" loading={loading} onClick={() => void loadWorkbench()}>查询工作台</Button>
        </Space>
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={12} xl={6}><Card><Typography.Text type="secondary">待处理问题</Typography.Text><Typography.Title level={3}>{workbenchTasks.length}</Typography.Title><Tag>任务池</Tag></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Typography.Text type="secondary">高风险阻塞</Typography.Text><Typography.Title level={3}>{highRiskCount}</Typography.Title><Tag color={highRiskCount ? 'error' : 'success'}>{highRiskCount ? '需优先处理' : '暂无阻塞'}</Tag></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Typography.Text type="secondary">资料缺失</Typography.Text><Typography.Title level={3}>{sourceMissingCount}</Typography.Title><Tag color={sourceMissingCount ? 'warning' : 'success'}>{sourceMissingCount ? '待补来源' : '来源正常'}</Tag></Card></Col>
        <Col xs={24} md={12} xl={6}><Card><Typography.Text type="secondary">代次/字辈问题</Typography.Text><Typography.Title level={3}>{generationIssueCount}</Typography.Title><Tag color={generationIssueCount ? 'processing' : 'success'}>{generationIssueCount ? '待校验' : '已校验'}</Tag></Card></Col>
      </Row>

      <Alert
        type="info"
        showIcon
        message="工作台定位"
        description={`当前页面只负责发现和组织修谱问题。审批通过/驳回仍进入审核中心；人物、来源、关系的具体维护仍进入对应业务页面。当前审计记录数：${logTotal}。`}
      />

      <Card title="修谱问题任务池" loading={loading}>
        <Table<WorkbenchTask>
          size="small"
          bordered
          rowKey="key"
          dataSource={filteredTasks}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无修谱问题。可以先从导入管理、人物档案或来源资料库补充数据。" /> }}
          columns={[
            { key: 'type', title: '问题类型', width: 140, render: (_value, row) => row.typeText },
            { key: 'objectName', title: '对象名称', render: (_value, row) => row.objectName },
            { key: 'branchName', title: '所属范围', width: 160, render: (_value, row) => row.branchName },
            { key: 'risk', title: '风险', width: 90, render: (_value, row) => <Tag color={riskColor(row.risk)}>{riskText(row.risk)}</Tag> },
            { key: 'status', title: '状态', width: 120, render: (_value, row) => <Tag color={statusColor(row.status)}>{row.statusText}</Tag> },
            { key: 'suggestion', title: '建议动作', render: (_value, row) => row.suggestion }
          ]}
        />
      </Card>
    </Space>
  );
}
