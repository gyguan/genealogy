import { Avatar, Button, Card, Descriptions, Drawer, Empty, Space, Tag, Typography } from 'antd';
import { relationTypeText, statusColor, statusText } from './dictionaries';

type CreateMode = 'person' | 'father' | 'mother' | 'spouse' | 'child' | null;
type PersonView = { id: string; name: string; generation: string; word: string; years: string; branch: string; status: string; avatar: string; relation: string; raw?: any };
type ExperienceData = { selectedPerson?: PersonView; relationships: any[]; people: PersonView[]; submitPersonReview: (personId: string) => Promise<void> };

function EmptyGuide({ text }: { text: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text} />;
}

function StatusTag({ value }: { value?: string }) {
  return <Tag color={statusColor(value)}>{statusText(value)}</Tag>;
}

function buildRelatives(person: PersonView | undefined, relationships: any[], people: PersonView[]) {
  if (!person) return [];
  return relationships.slice(0, 8).map(row => {
    const otherId = String(row.fromPersonId) === person.id ? String(row.toPersonId) : String(row.fromPersonId);
    const other = people.find(item => item.id === otherId);
    return { type: relationTypeText(row.relationLabel || row.relationType), name: other?.name || '亲属待维护', status: row.dataStatus || row.status || '已记录' };
  });
}

function buildEvents(person?: PersonView) {
  if (!person) return [];
  const raw = person.raw || {};
  const list = [];
  if (raw.birthDate || raw.birthYear) list.push({ year: String(raw.birthDate || raw.birthYear), title: `${person.name}出生`, detail: raw.birthPlace || '出生地待补充。' });
  if (raw.deathDate || raw.deathYear) list.push({ year: String(raw.deathDate || raw.deathYear), title: `${person.name}逝世`, detail: raw.tombPlace || '墓葬信息待补充。' });
  if (person.word && person.word !== '-') list.push({ year: person.generation, title: '字辈校验', detail: `${person.name}使用“${person.word}”字辈。` });
  return list;
}

export function PersonSidePanel({ data, onCreate, onOpenDetail }: { data: ExperienceData; onCreate: (mode: CreateMode) => void; onOpenDetail: () => void }) {
  const person = data.selectedPerson;
  const relatives = buildRelatives(person, data.relationships, data.people);
  if (!person) return <Card className="xp-person-panel"><EmptyGuide text="暂无人物数据。请点击“新增人物”创建第一位族人。" /></Card>;
  return (
    <Card className="xp-person-panel" title="中心人物" extra={<StatusTag value={person.status} />}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space align="center">
          <Avatar size={56}>{person.avatar}</Avatar>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>{person.name}</Typography.Title>
            <Typography.Text type="secondary">{person.branch} · {person.generation} · {person.word}字辈</Typography.Text>
          </div>
        </Space>
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="生卒">{person.years}</Descriptions.Item>
          <Descriptions.Item label="关系">{person.relation}</Descriptions.Item>
          <Descriptions.Item label="支派">{person.branch}</Descriptions.Item>
        </Descriptions>
        <Space wrap>
          <Button type="primary" onClick={onOpenDetail}>查看详情</Button>
          <Button onClick={() => onCreate('father')}>添加父亲</Button>
          <Button onClick={() => onCreate('mother')}>添加母亲</Button>
          <Button onClick={() => onCreate('spouse')}>添加配偶</Button>
          <Button onClick={() => onCreate('child')}>添加子女</Button>
          <Button onClick={() => data.submitPersonReview(person.id)}>提交审核</Button>
        </Space>
        <Card size="small" title="亲属关系">
          {relatives.length ? <Space direction="vertical" size="small" style={{ width: '100%' }}>{relatives.map(item => <Space key={`${item.type}-${item.name}`} style={{ justifyContent: 'space-between', width: '100%' }}><span>{item.type}：{item.name}</span><StatusTag value={item.status} /></Space>)}</Space> : <EmptyGuide text="暂无亲属关系，请添加父母、配偶或子女。" />}
        </Card>
      </Space>
    </Card>
  );
}

export function PersonDetailDrawer({ data, open, onClose, onCreate }: { data: ExperienceData; open: boolean; onClose: () => void; onCreate: (mode: CreateMode) => void }) {
  const person = data.selectedPerson;
  const relatives = buildRelatives(person, data.relationships, data.people);
  const events = buildEvents(person);
  return (
    <Drawer title={person ? `${person.name} · 人物详情` : '人物详情'} width={520} open={open} onClose={onClose}>
      {person ? <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card size="small">
          <Space align="center">
            <Avatar size={64}>{person.avatar}</Avatar>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>{person.name}</Typography.Title>
              <Typography.Text type="secondary">{person.branch} · {person.generation} · {person.word}字辈</Typography.Text><br />
              <StatusTag value={person.status} />
            </div>
          </Space>
        </Card>
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="所属支派">{person.branch}</Descriptions.Item>
          <Descriptions.Item label="代次字辈">{person.generation} · {person.word}</Descriptions.Item>
          <Descriptions.Item label="生卒信息">{person.years}</Descriptions.Item>
          <Descriptions.Item label="关系摘要">{person.relation}</Descriptions.Item>
        </Descriptions>
        <Card size="small" title="亲属关系">{relatives.length ? <Space direction="vertical" size="small" style={{ width: '100%' }}>{relatives.map(item => <Space key={`${item.type}-${item.name}`} style={{ justifyContent: 'space-between', width: '100%' }}><span>{item.type}：{item.name}</span><StatusTag value={item.status} /></Space>)}</Space> : <EmptyGuide text="暂无后端返回的亲属关系。" />}</Card>
        <Card size="small" title="生命事件">{events.length ? <Space direction="vertical" size="small" style={{ width: '100%' }}>{events.map(item => <div key={`${item.year}-${item.title}`}><Typography.Text strong>{item.title}</Typography.Text><br /><Typography.Text type="secondary">{item.year} · {item.detail}</Typography.Text></div>)}</Space> : <EmptyGuide text="暂无后端返回的生命事件。" />}</Card>
        <Space wrap><Button onClick={() => onCreate('father')}>添加父亲</Button><Button onClick={() => onCreate('mother')}>添加母亲</Button><Button onClick={() => onCreate('spouse')}>添加配偶</Button><Button onClick={() => onCreate('child')}>添加子女</Button></Space>
      </Space> : <EmptyGuide text="暂无人物详情。" />}
    </Drawer>
  );
}
