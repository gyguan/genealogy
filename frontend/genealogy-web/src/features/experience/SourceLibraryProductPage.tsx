import { useMemo, useState } from 'react';
import { Button, Card, Empty, Form, Input, Modal, Select, Space, Tag } from 'antd';
import { SOURCE_TYPE_OPTIONS, sourceStatusColor } from './dictionaries';

type SourceView = { id?: string; title: string; category: string; owner: string; confidence: string; status: string; bind: string; raw?: any };
type PersonView = { id: string; name: string; generation: string; branch: string };
type ExperienceData = { workspace: any; sources: SourceView[]; people: PersonView[]; selectedPerson?: PersonView; loading: boolean; message: string; setMessage: (message: string) => void; refreshAll: () => Promise<void>; createSource: (sourceName: string, sourceType: string) => Promise<any> };

function businessSourceTitle(source: SourceView) {
  return source.title || '未命名资料';
}

function businessPersonLabel(person?: PersonView) {
  if (!person) return '未选择绑定对象';
  return `${person.name} · ${person.branch} · ${person.generation}`;
}

function ExperienceNotice({ message, loading }: { message: string; loading: boolean }) {
  return message || loading ? <div className="xp-inline-notice">{loading ? '正在加载真实族谱数据...' : message}</div> : null;
}

function CreateSourceModal({ data, open, onClose }: { data: ExperienceData; open: boolean; onClose: () => void }) {
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState('genealogy_book');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    setSaving(true);
    try {
      const created = await data.createSource(sourceName, sourceType);
      if (created) onClose();
    } catch (error) {
      data.setMessage((error as Error).message || '资料创建失败，请检查输入。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="新增来源资料" onCancel={onClose} footer={<Space><Button type="primary" loading={saving} onClick={() => void submit()}>{saving ? '保存中...' : '保存'}</Button><Button onClick={onClose}>取消</Button></Space>} width={620} destroyOnClose>
      <Form layout="vertical">
        <Form.Item label="资料名称" required><Input value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="例如：民国二十三年张氏族谱影印本" /></Form.Item>
        <Form.Item label="资料类型"><Select value={sourceType} onChange={setSourceType} options={SOURCE_TYPE_OPTIONS} /></Form.Item>
      </Form>
    </Modal>
  );
}

export function SourceLibraryProductPage({ data }: { data: ExperienceData }) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [bindPersonId, setBindPersonId] = useState(data.workspace.personId || '');
  const selectedPerson = data.people.find(person => person.id === bindPersonId) || data.selectedPerson;
  const filteredSources = useMemo(() => data.sources.filter(source => {
    const keywordText = keyword.trim().toLowerCase();
    const matchesKeyword = !keywordText || [source.title, source.category, source.owner, source.status, source.bind].some(value => String(value || '').toLowerCase().includes(keywordText));
    const matchesType = !sourceType || source.category === sourceType;
    return matchesKeyword && matchesType;
  }), [data.sources, keyword, sourceType]);
  const sourceTypeOptions = useMemo(() => Array.from(new Set(data.sources.map(source => source.category).filter(Boolean))).map(type => ({ value: type, label: type })), [data.sources]);

  function selectSource(source: SourceView) {
    if (source.id) data.workspace.setSourceId(source.id);
    data.setMessage(`已选择来源资料“${businessSourceTitle(source)}”，可绑定到${businessPersonLabel(selectedPerson)}。`);
  }

  function bindCandidate(source: SourceView) {
    if (!selectedPerson) {
      data.setMessage('请先选择人物作为来源绑定对象。');
      return;
    }
    if (source.id) data.workspace.setSourceId(source.id);
    data.workspace.setPersonId(selectedPerson.id);
    data.setMessage(`已选择“${businessSourceTitle(source)}”作为“${selectedPerson.name}”的来源绑定候选，请到来源绑定流程完成提交。`);
  }

  return (
    <div className="xp-page">
      <div className="xp-section-header"><div><span>Evidence</span><h2>来源资料库</h2><p>把族谱原文、地方志、墓志照片、口述记录、证件资料统一作为证据管理。</p></div><Button type="primary" onClick={() => setSourceOpen(true)}>新增资料</Button></div>
      <ExperienceNotice message={data.message} loading={data.loading} />
      <section className="xp-source-layout">
        <Card className="xp-card xp-card--wide" title="来源资料检索" extra={<Button onClick={data.refreshAll}>刷新资料</Button>}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap style={{ width: '100%' }}>
              <Input.Search style={{ width: 320 }} value={keyword} onChange={event => setKeyword(event.target.value)} onSearch={setKeyword} placeholder="搜索资料题名、姓氏、堂号、地域、年代" allowClear />
              <Select style={{ width: 180 }} value={sourceType} onChange={setSourceType} options={[{ value: '', label: '全部资料类型' }, ...sourceTypeOptions]} />
              <Select showSearch optionFilterProp="label" style={{ width: 280 }} value={bindPersonId || selectedPerson?.id || ''} onChange={value => setBindPersonId(value)} options={[{ value: '', label: '请选择绑定对象' }, ...data.people.map(person => ({ value: person.id, label: businessPersonLabel(person) }))]} />
            </Space>
            {filteredSources.length ? filteredSources.map(source => <Card key={source.id || source.title} size="small" className="xp-source-row" hoverable onClick={() => selectSource(source)}><Space direction="vertical" size="small" style={{ width: '100%' }}><Space wrap style={{ justifyContent: 'space-between', width: '100%' }}><strong>{businessSourceTitle(source)}</strong><Space wrap><Tag>{source.category}</Tag><Tag color={sourceStatusColor(source.raw?.verificationStatus || source.raw?.status)}>{source.status}</Tag></Space></Space><span>{source.owner} · {source.bind} · 可信度：{source.confidence}</span><Space wrap><Button type="link" onClick={event => { event.stopPropagation(); selectSource(source); }}>查看资料</Button><Button type="link" onClick={event => { event.stopPropagation(); bindCandidate(source); }}>作为绑定候选</Button></Space></Space></Card>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无来源资料，请点击右上角“新增资料”。" />}
          </Space>
        </Card>
        <Card className="xp-card" title="资料绑定对象">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Tag color="processing">{businessPersonLabel(selectedPerson)}</Tag>
            <span>来源绑定对象通过人物姓名、支派、代次选择，避免展示技术字段。</span>
            <div>{['题名 / 卷册 / 页码', '姓氏 / 堂号 / 地域', '版本年代 / 收藏机构', 'OCR转写 / 原图对照', '可信度与引用记录'].map(item => <div className="xp-mini-item" key={item}>{item}</div>)}</div>
          </Space>
        </Card>
      </section>
      <CreateSourceModal data={data} open={sourceOpen} onClose={() => setSourceOpen(false)} />
    </div>
  );
}
