import { Button, Card, Empty, Space, Tag, Typography, theme } from 'antd';
import { display, sourceStatusColor } from './dictionaries';
import type { ExperienceData } from './types';

function branchName(row: any) {
  return row.branchName || row.name || '未命名支派';
}

function ExperienceNotice({ message, loading }: { message: string; loading: boolean }) {
  return message || loading ? <div className="xp-inline-notice">{loading ? '正在加载真实族谱数据...' : message}</div> : null;
}

export function CultureProductPage({ data }: { data: ExperienceData }) {
  const { token } = theme.useToken();
  const cultureCards = [
    { title: '堂号', value: display(data.activeClan?.hallName, '待维护'), desc: data.activeClan?.hallName ? '来自宗族基础信息。' : '后端暂未返回堂号信息。' },
    { title: '郡望', value: display(data.activeClan?.commandery, '待维护'), desc: data.activeClan?.commandery ? '来自宗族基础信息。' : '后端暂未返回郡望信息。' },
    { title: '祖籍/发源地', value: display(data.activeClan?.originPlace, '待维护'), desc: data.activeClan?.originPlace ? '可作为迁徙脉络起点。' : '后端暂未返回祖籍或发源地。' },
    { title: '家训家风', value: display(data.activeClan?.familyInstruction || data.activeClan?.familyMotto || data.activeClan?.clanMotto, '待维护'), desc: data.activeClan?.familyInstruction || data.activeClan?.familyMotto || data.activeClan?.clanMotto ? '来自宗族文化字段。' : '后端暂未返回家训内容，不在前端补造。' }
  ];
  const migrationBranches = data.branches.filter(branch => branch.migrationFrom || branch.migrationTo);
  const cultureSources = data.sources.slice(0, 6);

  return <div className="xp-page"><div className="xp-section-header"><div><span>Culture</span><h2>宗族文化</h2><p>沉淀姓氏源流、堂号、家训、谱序、凡例、迁徙路线、祠堂和纪念活动。</p></div><Button type="primary" onClick={data.refreshAll}>刷新文化资料</Button></div><ExperienceNotice message={data.message} loading={data.loading} /><section className="xp-culture-grid">{cultureCards.map(item => <Card key={item.title} className="xp-culture-card" style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary }}><Space direction="vertical" size="small"><Tag>{item.title}</Tag><Typography.Title level={4} style={{ margin: 0 }}>{item.value}</Typography.Title><Typography.Text type="secondary">{item.desc}</Typography.Text></Space></Card>)}</section><Card className="xp-card xp-card--wide" title="迁徙路线" style={{ marginTop: 16 }}>{migrationBranches.length ? <Space direction="vertical" size="small" style={{ width: '100%' }}>{migrationBranches.map(branch => <Card key={branch.id || branch.branchName} size="small"><Space wrap><Tag>{branchName(branch)}</Tag><span>{display(branch.migrationFrom, '迁出地待维护')} → {display(branch.migrationTo, '迁入地待维护')}</span></Space><Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>{display(branch.description, '暂无支派迁徙说明。')}</Typography.Paragraph></Card>)}</Space> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无迁徙脉络，请在支派管理中维护迁徙信息。" />}</Card><Card className="xp-card xp-card--wide" title="文化资料" style={{ marginTop: 16 }}>{cultureSources.length ? <Space direction="vertical" size="small" style={{ width: '100%' }}>{cultureSources.map(source => <Card key={source.id || source.title} size="small"><Space wrap style={{ justifyContent: 'space-between', width: '100%' }}><Typography.Text strong>{source.title}</Typography.Text><Space><Tag>{source.category}</Tag><Tag color={sourceStatusColor(source.raw?.verificationStatus || source.raw?.status)}>{source.status}</Tag></Space></Space><Typography.Text type="secondary">{source.owner} · {source.bind} · 可信度：{source.confidence}</Typography.Text></Card>)}</Space> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无文化资料，可在来源资料库中补充族谱原文、地方志、照片和口述记录。" />}</Card></div>;
}
