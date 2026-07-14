import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, Skeleton, Space, Tag, Tooltip, Typography } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/utils/records';

type ClanLike = {
  id?: number | string;
  clanName?: string;
  name?: string;
  surname?: string;
  hallName?: string;
  commandery?: string;
  originPlace?: string;
  familyInstruction?: string;
  familyInstructions?: string;
  familyMotto?: string;
  clanMotto?: string;
  motto?: string;
  instruction?: string;
  familyRules?: string;
};

type BranchLike = {
  id?: number | string;
  branchName?: string;
  name?: string;
  migrationFrom?: string;
  migrationTo?: string;
};

function display(value: unknown, fallback = '待维护') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function clanName(row?: ClanLike) {
  return row?.clanName || row?.name || row?.surname || '当前宗族';
}

function branchName(row: BranchLike) {
  return row.branchName || row.name || '未命名支派';
}

function firstNonEmpty(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

export function CultureProductPage() {
  const workspace = useWorkspace();
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [branches, setBranches] = useState<BranchLike[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const clanRows = toRecordList<ClanLike>(await apiClient.get('/clans').catch(() => []));
      setClans(clanRows);
      const nextClanId = workspace.clanId || String(clanRows[0]?.id || '');
      if (nextClanId && nextClanId !== workspace.clanId) workspace.setClanId(nextClanId);
      if (!nextClanId) {
        setBranches([]);
        return;
      }
      const branchRows = toRecordList<BranchLike>(await apiClient.get(`/clans/${nextClanId}/branches`).catch(() => []));
      setBranches(branchRows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [workspace.clanId]);

  const currentClan = useMemo(
    () => clans.find(row => String(row.id || '') === workspace.clanId) || clans[0],
    [clans, workspace.clanId]
  );

  const familyInstruction = firstNonEmpty(
    currentClan?.familyInstruction,
    currentClan?.familyInstructions,
    currentClan?.familyMotto,
    currentClan?.clanMotto,
    currentClan?.motto,
    currentClan?.instruction,
    currentClan?.familyRules
  );

  const migrationRows = branches.filter(row => row.migrationFrom || row.migrationTo);
  const cultureCards = [
    { title: '堂号', value: display(currentClan?.hallName), help: '承载宗族认同、祠堂记忆和谱牒标识。' },
    { title: '郡望', value: display(currentClan?.commandery), help: '说明姓氏源流、望族地域和历史脉络。' },
    { title: '家训家风', value: familyInstruction || '待维护', help: '记录宗族共同遵循的家训、家规与家风。' },
    { title: '祖籍/发源地', value: display(currentClan?.originPlace), help: '作为支派迁徙脉络的起点。' }
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card
        title={clanName(currentClan)}
        extra={<Button loading={loading} onClick={() => void load()}>刷新</Button>}
      >
        {loading ? <Skeleton active paragraph={{ rows: 2 }} /> : (
          <div className="home-culture-card-list">
            {cultureCards.map(card => (
              <Card key={card.title} size="small">
                <Space direction="vertical" size={4}>
                  <Space size={6}>
                    <Typography.Text strong>{card.title}</Typography.Text>
                    <Tooltip title={card.help}><Typography.Text type="secondary" style={{ cursor: 'help' }}>ⓘ</Typography.Text></Tooltip>
                  </Space>
                  <Typography.Title level={5} style={{ margin: 0 }}>{card.value}</Typography.Title>
                  <Tag color={card.value === '待维护' ? 'default' : 'success'}>{card.value === '待维护' ? '待补充' : '已维护'}</Tag>
                </Space>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Card title="迁徙脉络">
        {migrationRows.length ? (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {migrationRows.map((branch, index) => (
              <Card key={`${branch.id || index}-${branchName(branch)}`} size="small">
                <Space wrap>
                  <Typography.Text strong>{branchName(branch)}</Typography.Text>
                  <Tag>{display(branch.migrationFrom, display(currentClan?.originPlace, '起点待维护'))}</Tag>
                  <Typography.Text type="secondary">→</Typography.Text>
                  <Tag>{display(branch.migrationTo, '去向待维护')}</Tag>
                </Space>
              </Card>
            ))}
          </Space>
        ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无迁徙信息" />}
      </Card>
    </Space>
  );
}
