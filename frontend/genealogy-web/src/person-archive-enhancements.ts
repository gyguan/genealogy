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

type PersonBrief = {
  id: string;
  name: string;
};

declare global {
  interface Window {
    __genealogyPersonArchiveEnhancementsInstalled?: boolean;
  }
}

const personNameCache = new Map<string, PersonBrief>();
let relationshipRendering = false;

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

function currentPersonId() {
  return window.__genealogyWorkspace?.personId || localStorage.getItem('genealogy.workspace.personId') || '';
}

function relationshipId(row: RelationshipRow) {
  return String(row.id || `${fromPersonId(row)}-${toPersonId(row)}-${row.relationType || row.relationLabel || ''}`);
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
    const name = data?.name || data?.personName || data?.displayName || `人物#${id}`;
    personNameCache.set(id, { id, name });
    return name;
  } catch {
    return `人物#${id}`;
  }
}

function findArchiveSearchTable() {
  return document.querySelector<HTMLElement>('.person-archive-search .archive-search-panel .antd-table-wrap');
}

function hideArchiveStatusColumn() {
  const wrap = findArchiveSearchTable();
  const table = wrap?.querySelector<HTMLTableElement>('table');
  if (!table) return;

  const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'));
  const statusIndex = headers.findIndex(header => (header.textContent || '').trim() === '状态');
  if (statusIndex < 0) return;

  const hideCell = (cell?: HTMLElement | null) => {
    if (!cell) return;
    cell.style.display = 'none';
    cell.setAttribute('aria-hidden', 'true');
  };

  hideCell(headers[statusIndex]);
  Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr')).forEach(row => {
    hideCell(row.children.item(statusIndex) as HTMLElement | null);
  });
  hideCell(table.querySelectorAll<HTMLTableColElement>('colgroup col').item(statusIndex));
}

function findRelationshipSection() {
  return Array.from(document.querySelectorAll<HTMLElement>('.person-archive-search .archive-drawer-section'))
    .find(section => (section.querySelector('h3')?.textContent || '').trim() === '亲属关系') || null;
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
        ? personNameCache.get(otherId)?.name || `人物#${otherId}`
        : `${personNameCache.get(fromId)?.name || `人物#${fromId}`} → ${personNameCache.get(toId)?.name || `人物#${toId}`}`;
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

function syncPersonArchiveEnhancements() {
  hideArchiveStatusColumn();
  void renderRelationshipSection();
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
