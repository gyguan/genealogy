import { useMemo, useState } from 'react';

const people = [
  { id: 'p1', name: '张德明', title: '长沙张氏 · 第18世', word: '德', years: '1932 - 2018', branch: '长沙支派', avatar: '德', status: '已入谱', x: 42, y: 10, generation: '18世', tags: ['族谱原文', '墓志'] },
  { id: 'p2', name: '张承志', title: '长沙张氏 · 第19世', word: '承', years: '1958 -', branch: '长沙支派', avatar: '承', status: '待审核', x: 30, y: 38, generation: '19世', tags: ['身份证明', '口述记录'] },
  { id: 'p3', name: '李秀兰', title: '姻亲资料', word: '-', years: '1962 -', branch: '姻亲', avatar: '兰', status: '已入谱', x: 56, y: 38, generation: '配偶', tags: ['结婚证'] },
  { id: 'p4', name: '张家宁', title: '长沙张氏 · 第20世', word: '家', years: '1987 -', branch: '长沙支派', avatar: '家', status: '草稿', x: 42, y: 68, generation: '20世', tags: ['出生记录', '照片'] },
  { id: 'p5', name: '张家安', title: '长沙张氏 · 第20世', word: '家', years: '1991 -', branch: '长沙支派', avatar: '安', status: '线索待确认', x: 68, y: 68, generation: '20世', tags: ['AI线索'] }
];

const links = [
  ['p1', 'p2', '父子'],
  ['p2', 'p3', '配偶'],
  ['p2', 'p4', '父子'],
  ['p2', 'p5', '父子']
];

const sources = [
  { name: '民国二十三年张氏族谱影印本', type: '族谱原文', confidence: '高', status: '已核验' },
  { name: '张德明墓志照片', type: '图片资料', confidence: '中', status: '待复核' },
  { name: '张承志口述录音', type: '口述记录', confidence: '中', status: '已转写' }
];

const hints = [
  { title: '疑似同名人物可合并', detail: '张家安与导入记录 #A-1027 姓名、支派、父亲一致', action: '查看线索' },
  { title: '缺少出生地', detail: '张家宁档案缺少出生地，建议补充后提交审核', action: '去补充' },
  { title: '字辈校验通过', detail: '第20世人物均使用“家”字辈，符合当前方案', action: '查看方案' }
];

const reviewTasks = [
  { target: '张承志', type: '人物变更', submitter: '支派编辑', status: '待审核' },
  { target: '张德明墓志照片', type: '来源资料', submitter: '资料员', status: '待复核' },
  { target: '长沙支派迁徙说明', type: '支派说明', submitter: '管理员', status: '待审核' }
];

const facts = [
  { time: '1932', title: '出生', desc: '湖南长沙，字辈“德”。' },
  { time: '1958', title: '长子出生', desc: '张承志，长沙支派第19世。' },
  { time: '2018', title: '逝世', desc: '墓志照片已归档，待复核。' }
];

function statusClass(status: string) {
  if (status.includes('审核') || status.includes('复核')) return 'proto-status proto-status--warn';
  if (status.includes('草稿') || status.includes('线索')) return 'proto-status proto-status--draft';
  return 'proto-status';
}

export function GenealogyProductPrototype() {
  const [selectedId, setSelectedId] = useState('p2');
  const [activePanel, setActivePanel] = useState<'profile' | 'sources' | 'tasks'>('profile');
  const selected = useMemo(() => people.find(person => person.id === selectedId) || people[0], [selectedId]);

  return (
    <div className="prototype-shell">
      <section className="prototype-hero">
        <div>
          <span className="proto-eyebrow">张氏族谱 · 长沙支派</span>
          <h1>以世系图为核心的族谱协作平台</h1>
          <p>从“查询表单”改为“树谱画布 + 人物档案 + 来源证据 + 审核待办”的产品体验，用户围绕族谱本身完成录入、校验、追溯和审核。</p>
        </div>
        <div className="prototype-actions">
          <button>新增亲属</button>
          <button className="secondary">导入族谱</button>
          <button className="ghost">分享给族人</button>
        </div>
      </section>

      <section className="prototype-layout">
        <aside className="proto-left">
          <div className="proto-search-card">
            <strong>快速定位</strong>
            <input placeholder="搜索姓名、字辈、出生地、资料来源" />
            <div className="proto-filter-row"><span>长沙支派</span><span>第18-20世</span><span>仅看待审核</span></div>
          </div>

          <div className="proto-mini-nav">
            <button className={activePanel === 'profile' ? 'active' : ''} onClick={() => setActivePanel('profile')}>人物档案</button>
            <button className={activePanel === 'sources' ? 'active' : ''} onClick={() => setActivePanel('sources')}>来源证据</button>
            <button className={activePanel === 'tasks' ? 'active' : ''} onClick={() => setActivePanel('tasks')}>审核待办</button>
          </div>

          <div className="proto-list-card">
            <div className="proto-card-title"><strong>智能线索</strong><span>3 条</span></div>
            {hints.map(item => (
              <div className="proto-hint" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
                <button className="link-button">{item.action}</button>
              </div>
            ))}
          </div>
        </aside>

        <main className="proto-canvas-card">
          <div className="proto-canvas-toolbar">
            <div>
              <strong>世系图谱</strong>
              <span>支持缩放、拖拽、按支派/代次/审核状态筛选</span>
            </div>
            <div className="proto-tool-buttons"><button className="ghost">-</button><button className="ghost">100%</button><button className="ghost">+</button></div>
          </div>

          <div className="proto-tree-canvas">
            {links.map(([from, to, label]) => {
              const a = people.find(person => person.id === from)!;
              const b = people.find(person => person.id === to)!;
              const left = Math.min(a.x, b.x);
              const top = Math.min(a.y, b.y);
              const width = Math.abs(a.x - b.x) || 2;
              const height = Math.abs(a.y - b.y) || 2;
              return <div key={`${from}-${to}`} className="proto-link" style={{ left: `${left}%`, top: `${top + 8}%`, width: `${width}%`, height: `${height}%` }}><span>{label}</span></div>;
            })}
            {people.map(person => (
              <button key={person.id} className={`proto-person-node ${selectedId === person.id ? 'active' : ''}`} style={{ left: `${person.x}%`, top: `${person.y}%` }} onClick={() => setSelectedId(person.id)}>
                <span className="proto-avatar">{person.avatar}</span>
                <strong>{person.name}</strong>
                <em>{person.generation}</em>
                <i className={statusClass(person.status)}>{person.status}</i>
              </button>
            ))}
          </div>
        </main>

        <aside className="proto-right">
          {activePanel === 'profile' ? (
            <div className="proto-profile-card">
              <div className="proto-profile-head">
                <span className="proto-profile-avatar">{selected.avatar}</span>
                <div><h2>{selected.name}</h2><p>{selected.title}</p></div>
              </div>
              <div className="proto-profile-meta">
                <div><span>生卒</span><strong>{selected.years}</strong></div>
                <div><span>支派</span><strong>{selected.branch}</strong></div>
                <div><span>字辈</span><strong>{selected.word}</strong></div>
                <div><span>状态</span><strong>{selected.status}</strong></div>
              </div>
              <div className="proto-quick-actions">
                <button>添加父母</button><button>添加配偶</button><button>添加子女</button><button className="secondary">提交审核</button>
              </div>
              <h3>生命事件</h3>
              <div className="proto-timeline">
                {facts.map(item => <div key={item.time}><span>{item.time}</span><strong>{item.title}</strong><p>{item.desc}</p></div>)}
              </div>
              <h3>关联标签</h3>
              <div className="proto-tags">{selected.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
            </div>
          ) : null}

          {activePanel === 'sources' ? (
            <div className="proto-profile-card">
              <div className="proto-card-title"><strong>来源证据</strong><button className="secondary">上传资料</button></div>
              {sources.map(source => (
                <div className="proto-source" key={source.name}>
                  <strong>{source.name}</strong>
                  <p>{source.type} · 可信度：{source.confidence}</p>
                  <span className={statusClass(source.status)}>{source.status}</span>
                </div>
              ))}
            </div>
          ) : null}

          {activePanel === 'tasks' ? (
            <div className="proto-profile-card">
              <div className="proto-card-title"><strong>审核任务</strong><button className="secondary">批量处理</button></div>
              {reviewTasks.map(task => (
                <div className="proto-task" key={`${task.target}-${task.type}`}>
                  <strong>{task.target}</strong>
                  <p>{task.type} · {task.submitter}</p>
                  <div><span className={statusClass(task.status)}>{task.status}</span><button className="link-button">处理</button></div>
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
