import { useMemo, useState } from 'react';

const people = [
  { id: 'p1', name: '张德明', generation: '18世', word: '德', years: '1932-2018', branch: '长沙支派', status: '已入谱', avatar: '德', relation: '父亲', x: 44, y: 12 },
  { id: 'p2', name: '张承志', generation: '19世', word: '承', years: '1958-', branch: '长沙支派', status: '待审核', avatar: '承', relation: '本人', x: 44, y: 40 },
  { id: 'p3', name: '李秀兰', generation: '姻亲', word: '-', years: '1962-', branch: '姻亲', status: '已入谱', avatar: '兰', relation: '配偶', x: 66, y: 40 },
  { id: 'p4', name: '张家宁', generation: '20世', word: '家', years: '1987-', branch: '长沙支派', status: '草稿', avatar: '家', relation: '长子', x: 35, y: 72 },
  { id: 'p5', name: '张家安', generation: '20世', word: '家', years: '1991-', branch: '长沙支派', status: '线索待确认', avatar: '安', relation: '次子', x: 58, y: 72 }
];

const relatives = [
  { type: '父亲', name: '张德明', status: '已入谱' },
  { type: '配偶', name: '李秀兰', status: '已入谱' },
  { type: '子女', name: '张家宁、张家安', status: '1条待确认' }
];

const events = [
  { year: '1932', title: '张德明出生', detail: '湖南长沙，德字辈。来源：张氏族谱影印本。' },
  { year: '1958', title: '张承志出生', detail: '承字辈，长沙支派第19世。' },
  { year: '1987', title: '张家宁出生', detail: '家字辈，缺少出生地，待补充。' },
  { year: '2018', title: '张德明逝世', detail: '墓志照片已上传，待复核。' }
];

const sources = [
  { title: '民国二十三年张氏族谱影印本', category: '族谱原文', owner: '长沙支派理事会', confidence: '高', status: '已核验', bind: '已绑定 18 人 32 关系' },
  { title: '张德明墓志照片', category: '墓志/照片', owner: '张家宁', confidence: '中', status: '待复核', bind: '已绑定 1 人' },
  { title: '张承志口述录音', category: '口述记录', owner: '资料员', confidence: '中', status: '已转写', bind: '已绑定 2 人' },
  { title: '长沙县地方志节选', category: '地方志', owner: '公共资料', confidence: '高', status: '待引用', bind: '待绑定' }
];

const hints = [
  { title: '疑似重复人物', desc: '张家安与导入批次 A-1027 在姓名、父亲、支派上高度一致。', level: '高优先级', action: '查看并合并' },
  { title: '字辈异常已排除', desc: '第20世人物均使用“家”字辈，符合长沙支派方案。', level: '已通过', action: '查看校验' },
  { title: '缺少出生地', desc: '张家宁档案缺少出生地，建议补充后提交审核。', level: '待补充', action: '补充资料' }
];

const tasks = [
  { title: '张承志人物变更', type: '人物档案', user: '支派编辑', time: '今天 10:21', status: '待审核' },
  { title: '张德明墓志照片复核', type: '来源资料', user: '资料员', time: '昨天 19:42', status: '待复核' },
  { title: '长沙支派迁徙说明', type: '支派说明', user: '管理员', time: '昨天 15:08', status: '待审核' }
];

const cultureItems = [
  { title: '堂号', value: '百忍堂', detail: '记录堂号来源、历史沿革和支派使用情况。' },
  { title: '家训', value: '忠厚传家，诗书继世', detail: '支持上传谱序、凡例、家训影印件。' },
  { title: '迁徙路线', value: '江西吉安 → 湖南长沙', detail: '可与人物出生地、墓葬地和地方志资料关联。' },
  { title: '祠堂', value: '长沙张氏宗祠', detail: '记录地址、照片、祭祀活动和维护人员。' }
];

function Badge({ children }: { children: string }) {
  const cls = children.includes('待') || children.includes('异常') || children.includes('高优先级') ? 'xp-badge xp-badge--warn' : children.includes('草稿') || children.includes('线索') ? 'xp-badge xp-badge--draft' : 'xp-badge';
  return <span className={cls}>{children}</span>;
}

function SectionHeader({ eyebrow, title, desc, action }: { eyebrow: string; title: string; desc: string; action?: string }) {
  return (
    <div className="xp-section-header">
      <div><span>{eyebrow}</span><h2>{title}</h2><p>{desc}</p></div>
      {action ? <button>{action}</button> : null}
    </div>
  );
}

function PersonSidePanel({ selectedId, setSelectedId }: { selectedId: string; setSelectedId: (id: string) => void }) {
  const person = people.find(item => item.id === selectedId) || people[1];
  return (
    <aside className="xp-person-panel">
      <div className="xp-person-head">
        <span className="xp-avatar xp-avatar--large">{person.avatar}</span>
        <div><h3>{person.name}</h3><p>{person.branch} · {person.generation} · {person.word}字辈</p><Badge>{person.status}</Badge></div>
      </div>
      <div className="xp-meta-grid">
        <div><span>生卒</span><strong>{person.years}</strong></div>
        <div><span>关系</span><strong>{person.relation}</strong></div>
        <div><span>支派</span><strong>{person.branch}</strong></div>
        <div><span>入谱状态</span><strong>{person.status}</strong></div>
      </div>
      <div className="xp-action-grid">
        <button>添加父母</button><button>添加配偶</button><button>添加子女</button><button className="secondary">提交审核</button>
      </div>
      <h4>亲属关系</h4>
      <div className="xp-relation-list">{relatives.map(item => <div key={item.type}><span>{item.type}</span><strong>{item.name}</strong><Badge>{item.status}</Badge></div>)}</div>
      <h4>生命事件</h4>
      <div className="xp-timeline">{events.slice(1).map(item => <div key={item.year}><span>{item.year}</span><strong>{item.title}</strong><p>{item.detail}</p></div>)}</div>
      <div className="xp-profile-switch">{people.map(item => <button key={item.id} className={selectedId === item.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}>{item.name}</button>)}</div>
    </aside>
  );
}

function TreeCanvas({ selectedId, setSelectedId }: { selectedId: string; setSelectedId: (id: string) => void }) {
  return (
    <div className="xp-tree-canvas">
      <div className="xp-tree-toolbar"><strong>长沙支派世系图</strong><div><button className="ghost">-</button><button className="ghost">100%</button><button className="ghost">+</button></div></div>
      <div className="xp-tree-area">
        <div className="xp-tree-line xp-tree-line--vertical" />
        <div className="xp-tree-line xp-tree-line--spouse" />
        <div className="xp-tree-line xp-tree-line--children" />
        {people.map(person => (
          <button key={person.id} className={`xp-node ${selectedId === person.id ? 'active' : ''}`} style={{ left: `${person.x}%`, top: `${person.y}%` }} onClick={() => setSelectedId(person.id)}>
            <span className="xp-avatar">{person.avatar}</span><strong>{person.name}</strong><em>{person.generation}</em><Badge>{person.status}</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

export function GenealogyHomePage() {
  const [selectedId, setSelectedId] = useState('p2');
  return (
    <div className="xp-page">
      <section className="xp-hero">
        <div><span>张氏族谱 · 长沙支派</span><h1>围绕族谱本身协作修谱，而不是围绕表格录数据</h1><p>首页聚合家族概览、最近更新、待审核、智能线索和快速进入世系图，让宗亲、编辑、管理员都能从业务目标出发完成修谱。</p></div>
        <div className="xp-hero-actions"><button>进入世系图</button><button className="secondary">新增亲属</button><button className="ghost">邀请族人</button></div>
      </section>
      <section className="xp-dashboard-grid">
        {[['族人', '1286', '较上月 +24'], ['支派', '16', '覆盖 5 个地区'], ['待审核', '12', '3 个高优先级'], ['资料', '438', '72% 已绑定']].map(item => <div className="xp-stat" key={item[0]}><span>{item[0]}</span><strong>{item[1]}</strong><p>{item[2]}</p></div>)}
      </section>
      <section className="xp-main-layout">
        <div className="xp-card xp-card--wide"><SectionHeader eyebrow="Family Tree" title="最近维护的世系图" desc="点击人物节点即可查看档案、亲属和来源。" /><TreeCanvas selectedId={selectedId} setSelectedId={setSelectedId} /></div>
        <div className="xp-stack"><div className="xp-card"><SectionHeader eyebrow="Hints" title="智能线索" desc="系统主动发现重复、缺失和异常。" />{hints.map(item => <div className="xp-hint" key={item.title}><Badge>{item.level}</Badge><strong>{item.title}</strong><p>{item.desc}</p><button className="link-button">{item.action}</button></div>)}</div><div className="xp-card"><SectionHeader eyebrow="Tasks" title="待办审核" desc="按紧急程度处理入谱变更。" />{tasks.map(item => <div className="xp-task" key={item.title}><strong>{item.title}</strong><p>{item.type} · {item.user} · {item.time}</p><Badge>{item.status}</Badge></div>)}</div></div>
      </section>
    </div>
  );
}

export function GenealogyTreeProductPage() {
  const [selectedId, setSelectedId] = useState('p2');
  return <div className="xp-page"><SectionHeader eyebrow="Tree" title="世系图谱" desc="以族谱树为核心完成新增亲属、查看档案、校验关系和提交审核。" action="新增亲属" /><div className="xp-tree-layout"><TreeCanvas selectedId={selectedId} setSelectedId={setSelectedId} /><PersonSidePanel selectedId={selectedId} setSelectedId={setSelectedId} /></div></div>;
}

export function PersonArchiveProductPage() {
  const [selectedId, setSelectedId] = useState('p2');
  const selected = useMemo(() => people.find(item => item.id === selectedId) || people[1], [selectedId]);
  return (
    <div className="xp-page">
      <SectionHeader eyebrow="Person" title="人物档案" desc="人物档案聚合基本信息、生命事件、亲属关系、来源证据、照片附件和审核状态。" action="新增人物" />
      <section className="xp-person-layout"><PersonSidePanel selectedId={selectedId} setSelectedId={setSelectedId} /><main className="xp-card xp-card--wide"><h3>{selected.name} 的资料完整度</h3><div className="xp-completion"><div style={{ width: selected.status === '已入谱' ? '92%' : '66%' }} /></div><div className="xp-checklist">{['基本信息已填写', '亲属关系已建立', '至少绑定一条来源', '照片或附件已上传', '通过审核后正式入谱'].map((item, index) => <div key={item}><span>{index < 3 ? '✓' : '○'}</span><strong>{item}</strong></div>)}</div><h3>生命事件时间线</h3><div className="xp-timeline xp-timeline--wide">{events.map(item => <div key={item.year}><span>{item.year}</span><strong>{item.title}</strong><p>{item.detail}</p></div>)}</div></main></section>
    </div>
  );
}

export function SourceLibraryProductPage() {
  return (
    <div className="xp-page"><SectionHeader eyebrow="Evidence" title="来源资料库" desc="把族谱原文、地方志、墓志照片、口述记录、证件资料统一作为证据管理，并绑定到人物或关系。" action="上传资料" /><section className="xp-source-layout"><div className="xp-card xp-card--wide"><div className="xp-search-bar"><input placeholder="搜索资料题名、姓氏、堂号、地域、年代" /><button>搜索</button></div>{sources.map(item => <div className="xp-source-row" key={item.title}><div><strong>{item.title}</strong><p>{item.category} · {item.owner} · {item.bind}</p></div><div><Badge>{item.status}</Badge><span>可信度：{item.confidence}</span></div></div>)}</div><aside className="xp-card"><h3>资料著录建议</h3>{['题名 / 卷册 / 页码', '姓氏 / 堂号 / 地域', '版本年代 / 收藏机构', 'OCR转写 / 原图对照', '可信度与引用记录'].map(item => <div className="xp-mini-item" key={item}>{item}</div>)}</aside></section></div>
  );
}

export function EditingWorkspaceProductPage() {
  return (
    <div className="xp-page"><SectionHeader eyebrow="Workspace" title="修谱工作台" desc="把批量导入、重复合并、缺失补齐、字辈校验、关系冲突集中成编辑工作流。" action="导入族谱" /><section className="xp-board">{hints.map(item => <div className="xp-board-card" key={item.title}><Badge>{item.level}</Badge><h3>{item.title}</h3><p>{item.desc}</p><button>{item.action}</button></div>)}<div className="xp-board-card"><Badge>待处理</Badge><h3>关系冲突</h3><p>张家安存在两个父亲关系，需要编辑确认主线关系。</p><button>处理冲突</button></div></section></div>
  );
}

export function ReviewCenterProductPage() {
  return (
    <div className="xp-page"><SectionHeader eyebrow="Review" title="审核中心" desc="按人物变更、关系变更、来源复核、支派变更、字辈方案变更组织审核任务。" action="批量审核" /><section className="xp-card xp-card--wide">{tasks.map(item => <div className="xp-review-row" key={item.title}><div><strong>{item.title}</strong><p>{item.type} · 提交人：{item.user} · {item.time}</p></div><Badge>{item.status}</Badge><div className="xp-row-actions"><button>查看差异</button><button className="secondary">通过</button><button className="ghost">驳回</button></div></div>)}</section></div>
  );
}

export function CultureProductPage() {
  return (
    <div className="xp-page"><SectionHeader eyebrow="Culture" title="宗族文化" desc="沉淀姓氏源流、堂号、家训、谱序、凡例、迁徙路线、祠堂和纪念活动。" action="新增文化资料" /><section className="xp-culture-grid">{cultureItems.map(item => <div className="xp-culture-card" key={item.title}><span>{item.title}</span><strong>{item.value}</strong><p>{item.detail}</p></div>)}</section><section className="xp-card xp-card--wide"><h3>迁徙路线</h3><div className="xp-route"><span>江西吉安</span><i /> <span>湖南长沙</span><i /> <span>长沙支派</span><i /> <span>现代分布</span></div></section></div>
  );
}
