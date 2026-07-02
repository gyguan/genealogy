import { apiClient } from './shared/api/client';

type PersonOption = {
  id: string;
  name: string;
  genealogyName?: string;
  generationWord?: string;
  generationNo?: string | number;
};

declare global {
  interface Window {
    __genealogyWorkspace?: {
      clanId: string;
      personId: string;
      patch: (values: Record<string, string>) => void;
      setPersonId: (value: string) => void;
    };
  }
}

const personCache = new Map<string, PersonOption[]>();
const personLoading = new Set<string>();

function toRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  return [];
}

function findClanWizardPanel() {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.antd-panel, .panel'));
  return panels.find(panel => {
    const text = panel.textContent || '';
    return text.includes('创建/选择宗族') && text.includes('创建宗族并进入支派');
  }) || null;
}

function findPersonWizardPanel() {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.antd-panel, .panel'));
  return panels.find(panel => {
    const text = panel.textContent || '';
    return text.includes('录入人物') && text.includes('创建人物，继续录入') && text.includes('创建人物并进入关系');
  }) || null;
}

function findRelationshipWizardPanel() {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.antd-panel, .panel'));
  return panels.find(panel => {
    const text = panel.textContent || '';
    return text.includes('建立亲属关系') && text.includes('创建亲属关系并进入来源');
  }) || null;
}

function selectedClanName(panel: HTMLElement) {
  const clanId = localStorage.getItem('genealogy.workspace.clanId') || '';
  if (!clanId) return '';

  const rows = Array.from(panel.querySelectorAll<HTMLTableRowElement>('tr[data-row-key]'));
  const row = rows.find(item => item.getAttribute('data-row-key') === clanId);
  const firstCell = row?.querySelector<HTMLTableCellElement>('td');
  return firstCell?.textContent?.trim() || '';
}

function personLabel(person: PersonOption) {
  const pieces = [person.name || person.genealogyName || `人物#${person.id}`];
  if (person.generationWord) pieces.push(`${person.generationWord}字辈`);
  if (person.generationNo) pieces.push(`第${person.generationNo}世`);
  return pieces.join(' · ');
}

async function loadPersons(clanId: string) {
  if (!clanId || personCache.has(clanId) || personLoading.has(clanId)) return;
  personLoading.add(clanId);
  try {
    const rows = toRows(await apiClient.get(`/clans/${clanId}/persons`));
    personCache.set(clanId, rows.map(row => ({
      id: String(row.id || row.personId || ''),
      name: row.name || row.personName || '',
      genealogyName: row.genealogyName,
      generationWord: row.generationWord,
      generationNo: row.generationNo
    })).filter(item => item.id));
  } catch {
    personCache.set(clanId, []);
  } finally {
    personLoading.delete(clanId);
    requestAnimationFrame(syncMvp1WizardEnhancements);
  }
}

function ensureSelectedClanBanner() {
  const panel = findClanWizardPanel();
  if (!panel) return;

  let banner = panel.querySelector<HTMLElement>('.wizard-current--selected-clan');
  if (!banner) {
    banner = document.createElement('section');
    banner.className = 'wizard-current wizard-current--selected-clan';
    banner.innerHTML = '当前选中宗族：<strong>未选择</strong>';

    const actions = panel.querySelector<HTMLElement>('.antd-actions, .actions');
    if (actions?.parentElement) {
      actions.insertAdjacentElement('afterend', banner);
    } else {
      panel.appendChild(banner);
    }
  }

  const strong = banner.querySelector('strong');
  if (strong) strong.textContent = selectedClanName(panel) || '未选择';
}

function simplifyPersonEntryStep() {
  const panel = findPersonWizardPanel();
  if (!panel) return;

  const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>('button'));
  buttons.forEach(button => {
    if ((button.textContent || '').includes('刷新人物')) {
      button.style.display = 'none';
    }
  });

  panel.querySelectorAll<HTMLElement>('.antd-table-wrap, .table-wrap').forEach(table => {
    table.style.display = 'none';
  });
}

function ensureCenterPersonSelector() {
  const panel = findRelationshipWizardPanel();
  if (!panel) return;

  const workspace = window.__genealogyWorkspace;
  const clanId = workspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '';
  if (clanId) void loadPersons(clanId);

  let wrapper = panel.querySelector<HTMLElement>('.wizard-current--center-person-selector');
  if (!wrapper) {
    wrapper = document.createElement('section');
    wrapper.className = 'wizard-current wizard-current--center-person-selector';
    wrapper.innerHTML = '<label>中心人物：</label><select><option value="">请选择中心人物</option></select>';

    const current = Array.from(panel.querySelectorAll<HTMLElement>('.wizard-current')).find(item => (item.textContent || '').includes('中心人物'));
    if (current) {
      current.insertAdjacentElement('afterend', wrapper);
    } else {
      const form = panel.querySelector<HTMLElement>('.wizard-form-grid');
      form?.insertAdjacentElement('beforebegin', wrapper);
    }
  }

  const select = wrapper.querySelector<HTMLSelectElement>('select');
  if (!select) return;

  const currentPersonId = workspace?.personId || localStorage.getItem('genealogy.workspace.personId') || '';
  const people = personCache.get(clanId) || [];
  const html = [
    '<option value="">请选择中心人物</option>',
    ...people.map(person => `<option value="${person.id}">${personLabel(person)}</option>`)
  ].join('');

  if (select.dataset.optionsHtml !== html) {
    select.innerHTML = html;
    select.dataset.optionsHtml = html;
  }
  select.value = currentPersonId;

  if (!select.dataset.bound) {
    select.dataset.bound = 'true';
    select.addEventListener('change', event => {
      const value = (event.target as HTMLSelectElement).value;
      window.__genealogyWorkspace?.patch({ personId: value, relationshipId: '', sourceId: '', reviewTaskId: '' });
      localStorage.setItem('genealogy.workspace.personId', value);
      localStorage.setItem('genealogy.workspace.relationshipId', '');
      localStorage.setItem('genealogy.workspace.sourceId', '');
      localStorage.setItem('genealogy.workspace.reviewTaskId', '');
      requestAnimationFrame(syncMvp1WizardEnhancements);
    });
  }
}

function syncMvp1WizardEnhancements() {
  ensureSelectedClanBanner();
  simplifyPersonEntryStep();
  ensureCenterPersonSelector();
}

function installMvp1WizardEnhancements() {
  const sync = () => requestAnimationFrame(syncMvp1WizardEnhancements);

  sync();

  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.antd-table-wrap tr.clickable')) {
      window.setTimeout(sync, 0);
    }
  });

  window.addEventListener('storage', sync);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installMvp1WizardEnhancements, { once: true });
  } else {
    installMvp1WizardEnhancements();
  }
}

export {};
