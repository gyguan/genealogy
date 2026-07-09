import { useMemo, useState, type CSSProperties } from 'react';
import { Avatar, Button, Card, Empty, Select, Segmented, Space, Tag, Tooltip, Typography, theme } from 'antd';
import { relationTypeText, statusColor, statusText } from './dictionaries';
import type { CreateMode, ExperienceData, PersonView, TreeViewMode } from './types';

function businessPersonLabel(person?: PersonView) {
  if (!person) return '未选择绑定对象';
  return `${person.name} · ${person.branch} · ${person.generation}`;
}

function EmptyGuide({ text }: { text: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text} />;
}

function StatusTag({ value }: { value?: string }) {
  return <Tag color={statusColor(value)}>{statusText(value)}</Tag>;
}

function relationshipLines(data: ExperienceData) {
  return data.relationships.map((row, index) => {
    const from = data.people.find(person => person.id === String(row.fromPersonId));
    const to = data.people.find(person => person.id === String(row.toPersonId));
    if (!from || !to) return null;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return {
      key: `${from.id}-${to.id}-${index}`,
      from,
      to,
      label: relationTypeText(row.relationLabel || row.relationType),
      length: Math.max(6, Math.sqrt(dx * dx + dy * dy)),
      angle: Math.atan2(dy, dx) * 180 / Math.PI
    };
  }).filter(Boolean) as { key: string; from: PersonView; to: PersonView; label: string; length: number; angle: number }[];
}

export function TreeCanvas({ data, onCreate, onInspectPerson }: { data: ExperienceData; onCreate: (mode: CreateMode) => void; onInspectPerson: () => void }) {
  const { token } = theme.useToken();
  const [scale, setScale] = useState(100);
  const [viewMode, setViewMode] = useState<TreeViewMode>('family');
  const lines = useMemo(() => relationshipLines(data), [data.relationships, data.people]);
  const canvasStyle: CSSProperties = { background: token.colorBgContainer, borderColor: token.colorBorderSecondary, borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary };

  return (
    <Card className="xp-tree-canvas" bodyStyle={{ padding: 0 }} style={canvasStyle}>
      <div className="xp-tree-toolbar" style={{ padding: token.paddingSM, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space wrap>
            <Typography.Text strong>{data.activeClan?.clanName || '族谱'}世系图</Typography.Text>
            <Select showSearch optionFilterProp="label" style={{ width: 220 }} value={data.workspace.personId || data.selectedPerson?.id || ''} onChange={value => data.workspace.setPersonId(value)} options={[{ value: '', label: '请选择中心人物' }, ...data.people.map(person => ({ value: person.id, label: businessPersonLabel(person) }))]} />
            <Segmented value={viewMode} onChange={value => setViewMode(value as TreeViewMode)} options={[{ label: '亲属', value: 'family' }, { label: '支派', value: 'branch' }, { label: '紧凑', value: 'compact' }]} />
          </Space>
          <Space wrap>
            <Tooltip title="缩小图谱"><Button onClick={() => setScale(value => Math.max(70, value - 10))}>-</Button></Tooltip>
            <Tooltip title="当前缩放"><Button>{scale}%</Button></Tooltip>
            <Tooltip title="放大图谱"><Button onClick={() => setScale(value => Math.min(140, value + 10))}>+</Button></Tooltip>
            <Tooltip title="查看中心人物详情"><Button type="primary" onClick={onInspectPerson} disabled={!data.selectedPerson}>人物详情</Button></Tooltip>
            <Button onClick={() => onCreate(data.selectedPerson ? 'child' : 'person')}>{data.selectedPerson ? '新增亲属' : '新增人物'}</Button>
          </Space>
        </Space>
      </div>
      <div className="xp-tree-area" style={{ transform: `scale(${scale / 100})`, transformOrigin: 'center top', minHeight: viewMode === 'compact' ? 420 : 520 }}>
        {data.people.length ? <>
          {lines.map(line => {
            const lineStyle: CSSProperties = { left: `${line.from.x}%`, top: `${line.from.y}%`, width: `${line.length}%`, transform: `rotate(${line.angle}deg)`, background: token.colorBorder, transformOrigin: 'left center' };
            return <Tooltip key={line.key} title={`${line.from.name} → ${line.to.name}：${line.label}`}><i className="xp-tree-line" style={lineStyle} /></Tooltip>;
          })}
          {!lines.length ? <div style={{ position: 'absolute', left: 24, top: 24 }}><Tag>暂无后端关系线数据</Tag></div> : null}
          {data.people.map(person => {
            const active = data.workspace.personId === person.id;
            const nodeStyle: CSSProperties = { left: `${person.x}%`, top: `${person.y}%`, borderColor: active ? token.colorPrimary : token.colorBorder, boxShadow: active ? token.boxShadowSecondary : token.boxShadowTertiary, borderRadius: token.borderRadiusLG, background: token.colorBgContainer };
            return <Tooltip key={person.id} title={`${person.name} · ${person.branch} · ${person.generation}`}><button className={`xp-node ${active ? 'active' : ''}`} style={nodeStyle} onClick={() => { data.workspace.setPersonId(person.id); onInspectPerson(); }}><Avatar size={34}>{person.avatar}</Avatar><strong>{person.name}</strong><em>{viewMode === 'branch' ? person.branch : person.generation}</em><StatusTag value={person.status} /></button></Tooltip>;
          })}
        </> : <EmptyGuide text="暂无世系图数据。请先新增人物，再基于后端关系数据展示图谱。" />}
      </div>
    </Card>
  );
}
