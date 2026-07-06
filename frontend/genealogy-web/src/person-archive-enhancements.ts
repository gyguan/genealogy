import { apiClient } from './shared/api/client';

type RelationshipRow = {
  id?: string | number;
  fromPersonId?: string | number;
  sourcePersonId?: string | number;
  toPersonId?: string | number;
  targetPersonId?: string | number;
  relationType?: string;
  relationLabel?: string;
};

type SourceBindingRow = {
  id?: string | number;
  sourceId?: string | number;
  sourceName?: string;
  source?: { sourceName?: string; title?: string; name?: string; sourceType?: string };
  targetType?: string;
  targetId?: string | number;
  bindType?: string;
  confidenceLevel?: string;
  description?: string;
  note?: string;
};

type PersonBrief = {
  id: string;
  name: string;
};

declare global {
  interface Window {
    __genealogyPersonArchiveEnhancementsInstalled?: boolean;
    __genealogyWorkspace?: { clanId?: string; personId?: string };
  }
}

const personNameCache = new Map<string, PersonBrief>();
const sourceNameCache = new Map<string, string>();
let relationshipRendering = false;
let sourceRendering = false;

function toRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function relationText(value?: string) {
  const dict: Record<string, string> = {
    parent_child: '亲子',
    spouse: '配偶',
    adoptive: '收养',
    successor: '继嗣',
    heir_successor: '继嗣',
    out_adoption: '出嗣',
    out_adopted: '出嗣'
  };
  return dict[value || ''] || value || '-';
}

function relationLabelText(value?: string) {
  const dict: Record<string, string> = {
    father: '父亲',
    mother: '母亲',
    spouse: '配偶',
    child: '子女',
    son: '儿子',
    daughter: '女儿',
    parent_child: '亲子',
    adoptive: '收养',
    adoptive_father: '养父',
    adoptive_mother: '养母',
    successor: '继嗣',
    heir_successor: '继嗣',
    out_adoption: '出嗣',
    out_adopted: '出嗣'
  };
  return dict[value || ''] || value || '-';
}

function targetTypeText(value?: string) {
  const dict: Record<string, string> = {
    person: '人物',
    relationship: '亲属关系',
    branch: '支派',
    clan: '宗族',
    generation_word: '字辈'
  };
  return dict[value || ''] || value || '对象';
}

function sourceTypeText(value?: string) {
  const dict: Record<string, string> = {
    genealogy_book: '族谱',
    oral_history: '口述',
    tombstone: '墓碑',
    photo: '照片',
    archive: '档案'
  };
  return dict[value || ''] || value || '资料来源';
}

function currentPersonId() {
  return window.__genealogyWorkspace?.personId || localStorage.getItem('genealogy.workspace.personId') || '';
}

function fromPersonId(row: RelationshipRow) {
  return String(row.fromPersonId || row.sourcePersonId || '');
}

function toPersonId(row: RelationshipRow) {
  return String(row.toPersonId || row.targetPersonId || '');
}

async function getPersonName(id: string) {
  if (!id) return '-';
  if (personNameCache.has(id)) return personNameCache.get(id)!.name;
  try {
    const data: any = await apiClient.get(`/persons/${id}`);
    const name = data?.name || data?.personName || data?.displayName || '未知人物';
    personNameCache.set(id, { id, name });
    return name;
  } catch {
    return '未知人物';
  }
}

async function getSourceName(id: string) {
  if (!id) return '-';
  if (sourceNameCache.has(id)) return sourceNameCache.get(id)!;
  try {
    const data: any = await apiClient.get(`/sources/${id}`);
    const name = data?.sourceName || data?.title || data?.name || '未命名来源';
    sourceNameCache.set(id, name);
    return name;
  } catch {
    return '未命名来源';
  }
}

function findArchiveSearchTable() {
  return document.querySelector<HTMLElement>('.person-archive-search .archive-search-panel .antd-table-wrap');
}

function hideTableColumnsByTitle(table: HTMLTableElement, titles: string[]) {
  const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'));
  const indexes = headers
    .map((header, index) => ({ index, title: (header.textContent || '').trim() }))
    .filter(item => titles.includes(item.title))
    .map(item => item.index);
  if (!indexes.length) return;

  const hideCell = (cell?: HTMLElement | null) => {
    if (!cell) return;
    cell.style.display = 'none';
    cell.setAttribute('aria-hidden', 'true');
  };

  indexes.forEach(index => {
    hideCell(headers[index]);
    Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr')).forEach(row => hideCell(row.children.item(index) as HTMLElement | null));
    hideCell(table.querySelectorAll<HTMLTableColElement>('colgroup col').item(index));
  });
}

function hideArchiveTechnicalColumns() {
  const wrap = findArchiveSearchTable();
  const table = wrap?.querySelector<HTMLTableElement>('table');
  if (!table) return;
  hideTableColumnsByTitle(table, ['ID', '状态']);
}

function hideTechnicalDetailRows() {
  const drawer = document.querySelector<HTMLElement>('.person-archive-search .archive-drawer-body');
  if (!drawer) return;
  const technicalLabels = new Set(['人物ID', '世系状态', '数据状态', '关系ID', '绑定ID', '来源ID', '对象ID']);
  Array.from(drawer.querySelectorAll<HTMLElement>('span, label, th')).forEach(node => {
    const text = (node.textContent || '').trim();
    if (!technicalLabels.has(text)) return;
    const row = node.closest<HTMLElement>('tr, .ant-descriptions-row, .ant-descriptions-item, .detail-card-row, div');
    if (row) {
      row.style.display = 'none';
      row.setAttribute('aria-hidden', 'true');
    }
  });
}

function findRelationshipSection() {
  return Array.from(document.querySelectorAll<HTMLElement>('.person-archive-search .archive-drawer-section'))
    .find(section => (section.querySelector('h3')?.textContent || '').trim() === '亲属关系') || null;
}

function findSourceSection() {
  return Array.from(document.querySelectorAll<HTMLElement>('.person-archive-search .archive-drawer-section'))
    .find(section => (section.querySelector('h3')?.textContent || '').trim() === '来源证据') || null;
}

async function renderRelationshipSection() {
  if (relationshipRendering) return;
  const section = findRelationshipSection();
  const personId = currentPersonId();
  if (!section || !personId) return;
  if (section.dataset.enhancedFor === personId) return;

  relationshipRendering = true;
  try {
    section.dataset.enhancedFor = personId;
    const rows = toRows(await apiClient.get(`/persons/${personId}/relationships`).catch(() => [])) as RelationshipRow[];
    if (!rows.length) {
      section.innerHTML = '<h3>亲属关系</h3><div class="person-archive-relationship-empty">暂无亲属关系。</div>';
      return;
    }

    const peopleIds = Array.from(new Set(rows.flatMap(row => [fromPersonId(row), toPersonId(row)]).filter(Boolean)));
    await Promise.all(peopleIds.map(getPersonName));

    const body = rows.map(row => {
      const fromId = fromPersonId(row);
      const toId = toPersonId(row);
      const otherId = fromId === personId ? toId : toId === personId ? fromId : '';
      const name = otherId
        ? personNameCache.get(otherId)?.name || '未知人物'
        : `${personNameCache.get(fromId)?.name || '未知人物'} → ${personNameCache.get(toId)?.name || '未知人物'}`;
      return `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(relationText(row.relationType))}</td>
          <td>${escapeHtml(relationLabelText(row.relationLabel || row.relationType))}</td>
        </tr>
      `;
    }).join('');

    section.innerHTML = `
      <h3>亲属关系</h3>
      <div class="person-archive-relationship-table-wrap">
        <table class="person-archive-relationship-table">
          <thead><tr><th>亲属姓名</th><th>类型</th><th>标签</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
  } finally {
    relationshipRendering = false;
  }
}

async function renderSourceSection() {
  if (sourceRendering) return;
  const section = findSourceSection();
  const personId = currentPersonId();
  if (!section || !personId) return;
  if (section.dataset.enhancedFor === personId) return;

  sourceRendering = true;
  try {
    section.dataset.enhancedFor = personId;
    const rows = toRows(await apiClient.get(`/source-bindings/target/person/${personId}`).catch(() => [])) as SourceBindingRow[];
    if (!rows.length) {
      section.innerHTML = '<h3>来源证据</h3><div class="person-archive-source-empty">暂无来源绑定。</div>';
      return;
    }

    const sourceIds = Array.from(new Set(rows.map(row => String(row.sourceId || '')).filter(Boolean)));
    await Promise.all(sourceIds.map(getSourceName));

    const body = rows.map(row => {
      const sourceId = String(row.sourceId || '');
      const sourceName = row.sourceName || row.source?.sourceName || row.source?.title || row.source?.name || sourceNameCache.get(sourceId) || '未命名来源';
      const sourceType = sourceTypeText(row.source?.sourceType);
      const targetSummary = row.targetType === 'person' ? '当前人物档案' : targetTypeText(row.targetType);
      return `
        <tr>
          <td>${escapeHtml(sourceName)}</td>
          <td>${escapeHtml(sourceType)}</td>
          <td>${escapeHtml(targetSummary)}</td>
          <td>${escapeHtml(display(row.description || row.note || row.bindType || row.confidenceLevel, '已绑定'))}</td>
        </tr>
      `;
    }).join('');

    section.innerHTML = `
      <h3>来源证据</h3>
      <div class="person-archive-source-table-wrap">
        <table class="person-archive-source-table">
          <thead><tr><th>来源名称</th><th>来源类型</th><th>绑定对象</th><th>说明</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
  } finally {
    sourceRendering = false;
  }
}

function syncPersonArchiveEnhancements() {
  hideArchiveTechnicalColumns();
  hideTechnicalDetailRows();
  void renderRelationshipSection();
  void renderSourceSection();
}

function installPersonArchiveEnhancements() {
  if (window.__genealogyPersonArchiveEnhancementsInstalled) return;
  window.__genealogyPersonArchiveEnhancementsInstalled = true;

  const sync = () => window.requestAnimationFrame(syncPersonArchiveEnhancements);
  sync();

  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('storage', sync);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installPersonArchiveEnhancements, { once: true });
  } else {
    installPersonArchiveEnhancements();
  }
}

export {};