import { apiClient } from './shared/api/client';

type PersonOption = {
  id: string;
  name: string;
  genealogyName?: string;
  generationWord?: string;
  generationNo?: string | number;
  gender?: string;
  branchId?: string | number;
};

type GenerationSchemeOption = {
  id: string;
  schemeName: string;
  branchId?: string | number;
};

type GenerationWordItem = {
  id?: string | number;
  generationNo?: string | number;
  word?: string;
  description?: string;
  sortOrder?: string | number;
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
const generationSchemeCache = new Map<string, GenerationSchemeOption[]>();
const generationSchemeLoading = new Set<string>();
const generationItemCache = new Map<string, GenerationWordItem[]>();
const generationItemLoading = new Set<string>();

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
    return text.includes('建立亲属关系') && text.includes('创建亲属关系');
  }) || null;
}

function findGenerationWizardPanel() {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.antd-panel, .panel'));
  return panels.find(panel => {
    const text = panel.textContent || '';
    return text.includes('维护字辈') && text.includes('追加字辈');
  }) || null;
}

function formItemLabelText(item: HTMLElement) {
  const label = item.querySelector<HTMLElement>('.ant-form-item-label label, label');
  return (label?.textContent || '').trim();
}

function findFormItemByLabel(root: HTMLElement, labelText: string) {
  return Array.from(root.querySelectorAll<HTMLElement>('.ant-form-item, .field'))
    .find(item => formItemLabelText(item).includes(labelText)) || null;
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

function numericGeneration(person?: PersonOption) {
  const value = Number(person?.generationNo);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function genderMatchForMode(person: PersonOption, mode: string) {
  if (mode === 'father') return person.gender === 'male' || !person.gender || person.gender === 'unknown';
  if (mode === 'mother') return person.gender === 'female' || !person.gender || person.gender === 'unknown';
  return true;
}

function generationMatchForMode(center: PersonOption | undefined, relative: PersonOption, mode: string) {
  const centerNo = numericGeneration(center);
  const relativeNo = numericGeneration(relative);
  if (!centerNo || !relativeNo) return true;
  if (mode === 'father' || mode === 'mother') return relativeNo === centerNo - 1;
  if (mode === 'child') return relativeNo === centerNo + 1;
  if (mode === 'spouse') return relativeNo === centerNo;
  return true;
}

function relationRestrictionText(center: PersonOption | undefined, mode: string) {
  const centerNo = numericGeneration(center);
  if (!centerNo) return '中心人物代次未维护，暂按姓名选择；建议先维护代次以获得更准确的亲属筛选。';
  if (mode === 'father') return `父亲只能选择上一代人物：第 ${centerNo - 1} 世，且优先男性。`;
  if (mode === 'mother') return `母亲只能选择上一代人物：第 ${centerNo - 1} 世，且优先女性。`;
  if (mode === 'child') return `子女只能选择下一代人物：第 ${centerNo + 1} 世。`;
  if (mode === 'spouse') return `配偶默认选择同代人物：第 ${centerNo} 世。`;
  return '请根据关系类型选择合适的亲属人物。';
}

async function loadPersons(clanId: string, force = false) {
  if (!clanId || (!force && personCache.has(clanId)) || personLoading.has(clanId)) return;
  personLoading.add(clanId);
  try {
    const rows = toRows(await apiClient.get(`/clans/${clanId}/persons`));
    personCache.set(clanId, rows.map(row => ({
      id: String(row.id || row.personId || ''),
      name: row.name || row.personName || '',
      genealogyName: row.genealogyName,
      generationWord: row.generationWord,
      generationNo: row.generationNo,
      gender: row.gender,
      branchId: row.branchId
    })).filter(item => item.id));
  } catch {
    personCache.set(clanId, []);
  } finally {
    personLoading.delete(clanId);
    requestAnimationFrame(syncMvp1WizardEnhancements);
  }
}

async function loadGenerationSchemes(clanId: string) {
  if (!clanId || generationSchemeCache.has(clanId) || generationSchemeLoading.has(clanId)) return;
  generationSchemeLoading.add(clanId);
  try {
    const rows = toRows(await apiClient.get(`/clans/${clanId}/generation-schemes`));
    generationSchemeCache.set(clanId, rows.map(row => ({
      id: String(row.id || ''),
      schemeName: row.schemeName || `字辈方案#${row.id}`,
      branchId: row.branchId
    })).filter(item => item.id));
  } catch {
    generationSchemeCache.set(clanId, []);
  } finally {
    generationSchemeLoading.delete(clanId);
    requestAnimationFrame(syncMvp1WizardEnhancements);
  }
}

async function loadGenerationItems(schemeId: string) {
  if (!schemeId || generationItemCache.has(schemeId) || generationItemLoading.has(schemeId)) return;
  generationItemLoading.add(schemeId);
  try {
    const rows = toRows(await apiClient.get(`/generation-schemes/${schemeId}/items`));
    generationItemCache.set(schemeId, rows);
  } catch {
    generationItemCache.set(schemeId, []);
  } finally {
    generationItemLoading.delete(schemeId);
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
    if (actions?.parentElement) actions.insertAdjacentElement('afterend', banner);
    else panel.appendChild(banner);
  }

  const strong = banner.querySelector('strong');
  if (strong) strong.textContent = selectedClanName(panel) || '未选择';
}

function simplifyPersonEntryStep() {
  const panel = findPersonWizardPanel();
  if (!panel) return;

  Array.from(panel.querySelectorAll<HTMLButtonElement>('button')).forEach(button => {
    if ((button.textContent || '').includes('刷新人物')) button.style.display = 'none';
  });

  panel.querySelectorAll<HTMLElement>('.antd-table-wrap, .table-wrap').forEach(table => {
    table.style.display = 'none';
  });
}

function removeExtraCenterPersonSelector() {
  document.querySelectorAll<HTMLElement>('.wizard-current--center-person-selector').forEach(item => item.remove());
}

function selectedRelationshipMode(panel: HTMLElement) {
  const field = findFormItemByLabel(panel, '关系类型');
  const text = (field?.querySelector<HTMLElement>('.ant-select-selection-item')?.textContent || field?.textContent || '').trim();
  if (text.includes('母亲')) return 'mother';
  if (text.includes('配偶')) return 'spouse';
  if (text.includes('子女')) return 'child';
  return 'father';
}

function ensureRelativePersonSelector() {
  const panel = findRelationshipWizardPanel();
  if (!panel) return;

  const workspace = window.__genealogyWorkspace;
  const clanId = workspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '';
  const centerPersonId = workspace?.personId || localStorage.getItem('genealogy.workspace.personId') || '';
  if (clanId) void loadPersons(clanId);

  const people = personCache.get(clanId) || [];
  const centerPerson = people.find(person => person.id === centerPersonId);
  const mode = selectedRelationshipMode(panel);
  const filteredPeople = people
    .filter(person => person.id !== centerPersonId)
    .filter(person => generationMatchForMode(centerPerson, person, mode))
    .filter(person => genderMatchForMode(person, mode));

  let wrapper = panel.querySelector<HTMLElement>('.wizard-existing-relative-field');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'field wizard-existing-relative-field';
    wrapper.innerHTML = '<label>已有亲属人物</label><select><option value="">不选择，手工录入新亲属</option></select><small></small>';

    const relativeNameField = findFormItemByLabel(panel, '亲属姓名');
    if (relativeNameField) relativeNameField.insertAdjacentElement('beforebegin', wrapper);
    else panel.querySelector<HTMLElement>('.wizard-form-grid')?.appendChild(wrapper);
  }

  const select = wrapper.querySelector<HTMLSelectElement>('select');
  const hint = wrapper.querySelector<HTMLElement>('small');
  if (!select) return;

  const html = [
    '<option value="">不选择，手工录入新亲属</option>',
    ...filteredPeople.map(person => `<option value="${escapeHtml(person.id)}">${escapeHtml(personLabel(person))}</option>`)
  ].join('');

  if (select.dataset.optionsHtml !== html) {
    const previous = select.value;
    select.innerHTML = html;
    select.dataset.optionsHtml = html;
    if (filteredPeople.some(person => person.id === previous)) select.value = previous;
  }

  if (hint) {
    const baseText = relationRestrictionText(centerPerson, mode);
    hint.textContent = filteredPeople.length ? baseText : `${baseText} 当前没有匹配的人物，可手工录入新亲属。`;
  }
}

function selectedExistingRelative(panel: HTMLElement) {
  const workspace = window.__genealogyWorkspace;
  const clanId = workspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '';
  const select = panel.querySelector<HTMLSelectElement>('.wizard-existing-relative-field select');
  const relativeId = select?.value || '';
  if (!relativeId) return null;
  return (personCache.get(clanId) || []).find(person => person.id === relativeId) || null;
}

function buildRelationshipBody(centerPerson: PersonOption | undefined, relativePerson: PersonOption, mode: string) {
  const centerId = Number(centerPerson?.id || window.__genealogyWorkspace?.personId || localStorage.getItem('genealogy.workspace.personId'));
  const relativeId = Number(relativePerson.id);
  if (mode === 'spouse') {
    return { fromPersonId: centerId, toPersonId: relativeId, relationType: 'spouse', relationLabel: 'spouse', isLineageRelation: false, isBiological: false, isPrimary: true, confidenceLevel: 'high' };
  }
  if (mode === 'child') {
    return { fromPersonId: centerId, toPersonId: relativeId, relationType: 'parent_child', relationLabel: centerPerson?.gender === 'female' ? 'mother' : 'father', isLineageRelation: true, isBiological: true, isPrimary: true, confidenceLevel: 'high' };
  }
  return { fromPersonId: relativeId, toPersonId: centerId, relationType: 'parent_child', relationLabel: mode === 'mother' ? 'mother' : 'father', isLineageRelation: true, isBiological: true, isPrimary: true, confidenceLevel: 'high' };
}

async function createRelationshipWithSelectedRelative(panel: HTMLElement) {
  const workspace = window.__genealogyWorkspace;
  const clanId = workspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '';
  const centerPersonId = workspace?.personId || localStorage.getItem('genealogy.workspace.personId') || '';
  const relativePerson = selectedExistingRelative(panel);
  if (!clanId || !centerPersonId || !relativePerson) return;
  if (relativePerson.id === centerPersonId) {
    window.alert('亲属人物不能与中心人物相同');
    return;
  }

  const people = personCache.get(clanId) || [];
  const centerPerson = people.find(person => person.id === centerPersonId);
  const mode = selectedRelationshipMode(panel);
  if (!generationMatchForMode(centerPerson, relativePerson, mode) || !genderMatchForMode(relativePerson, mode)) {
    window.alert('所选亲属人物与当前关系类型不匹配，请重新选择。');
    return;
  }

  const relationship: any = await apiClient.post(`/clans/${clanId}/relationships`, buildRelationshipBody(centerPerson, relativePerson, mode));
  const relationshipId = String(relationship?.id || '');
  workspace?.patch({ relationshipId, sourceId: '', reviewTaskId: '' });
  localStorage.setItem('genealogy.workspace.relationshipId', relationshipId);
  localStorage.setItem('genealogy.workspace.sourceId', '');
  localStorage.setItem('genealogy.workspace.reviewTaskId', '');
  window.alert('亲属关系创建成功，已使用已有亲属人物建立关系');

  const sourceStep = Array.from(document.querySelectorAll<HTMLButtonElement>('.wizard-steps button'))
    .find(button => (button.textContent || '').includes('6. 绑定来源'));
  sourceStep?.click();
  window.setTimeout(() => {
    const sourcePanel = Array.from(document.querySelectorAll<HTMLElement>('.antd-panel, .panel'))
      .find(item => (item.textContent || '').includes('绑定来源证据'));
    const refreshButton = Array.from(sourcePanel?.querySelectorAll<HTMLButtonElement>('button') || [])
      .find(button => (button.textContent || '').includes('刷新选项'));
    refreshButton?.click();
  }, 150);
}

function selectedSchemeName(panel: HTMLElement) {
  const itemSection = panel.querySelector<HTMLElement>('.wizard-generation-section--items');
  const field = itemSection ? findFormItemByLabel(itemSection, '字辈方案') || findFormItemByLabel(itemSection, '已有方案') : null;
  return (field?.querySelector<HTMLElement>('.ant-select-selection-item')?.textContent || '').trim();
}

function selectedSchemeId(panel: HTMLElement, clanId: string) {
  const schemes = generationSchemeCache.get(clanId) || [];
  if (!schemes.length) return '';
  const selectedName = selectedSchemeName(panel);
  const selected = schemes.find(item => item.schemeName === selectedName || selectedName.includes(item.schemeName));
  return selected?.id || (schemes.length === 1 ? schemes[0].id : '');
}

function moveSchemeSelectorToGenerationWordSection(panel: HTMLElement) {
  const itemSection = panel.querySelector<HTMLElement>('.wizard-generation-section--items');
  const itemGrid = itemSection?.querySelector<HTMLElement>('.wizard-generation-word-grid');
  if (!itemSection || !itemGrid) return;

  const schemeField = findFormItemByLabel(panel, '已有方案');
  if (schemeField && !itemGrid.contains(schemeField)) {
    itemGrid.insertAdjacentElement('afterbegin', schemeField);
    schemeField.classList.add('wizard-generation-scheme-field--moved');
  }
  if (schemeField) {
    const label = schemeField.querySelector<HTMLElement>('.ant-form-item-label label, label');
    if (label) label.textContent = '字辈方案 *';
  }

  const currentReadonly = findFormItemByLabel(itemSection, '当前字辈方案');
  if (currentReadonly) currentReadonly.style.display = 'none';
}

function renderGenerationItemsList(panel: HTMLElement) {
  const workspace = window.__genealogyWorkspace;
  const clanId = workspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '';
  if (clanId) void loadGenerationSchemes(clanId);

  const itemSection = panel.querySelector<HTMLElement>('.wizard-generation-section--items');
  if (!itemSection) return;

  let wrapper = itemSection.querySelector<HTMLElement>('.wizard-generation-items-list-enhanced');
  if (!wrapper) {
    wrapper = document.createElement('section');
    wrapper.className = 'wizard-generation-items-list-enhanced';
    const actions = itemSection.querySelector<HTMLElement>('.antd-actions, .actions');
    if (actions) actions.insertAdjacentElement('afterend', wrapper);
    else itemSection.appendChild(wrapper);
  }

  const schemeId = selectedSchemeId(panel, clanId);
  if (schemeId) void loadGenerationItems(schemeId);
  const items = schemeId ? (generationItemCache.get(schemeId) || []) : [];
  const loading = schemeId && generationItemLoading.has(schemeId);
  const schemes = generationSchemeCache.get(clanId) || [];

  const rows = items
    .slice()
    .sort((a, b) => Number(a.generationNo || 0) - Number(b.generationNo || 0))
    .map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>第${escapeHtml(item.generationNo || '-')}世</td>
        <td><strong>${escapeHtml(item.word || '-')}</strong></td>
        <td>${escapeHtml(item.description || item.sortOrder || '-')}</td>
      </tr>
    `).join('');

  const emptyText = !clanId
    ? '请先选择宗族'
    : !schemes.length
      ? '暂无字辈方案，请先创建方案'
      : !schemeId
        ? '请选择字辈方案后查看已有字辈'
        : loading
          ? '正在加载字辈明细...'
          : '该方案下暂无字辈，创建后会显示在这里';

  wrapper.innerHTML = `
    <div class="wizard-generation-list-header">
      <h4>三、该方案下已有字辈</h4>
      <span>${schemeId ? `共 ${items.length} 条` : ''}</span>
    </div>
    <div class="wizard-generation-list-table-wrap">
      <table class="wizard-generation-list-table">
        <thead><tr><th>序号</th><th>代次</th><th>字辈</th><th>备注</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="4" class="empty">${escapeHtml(emptyText)}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function enhanceGenerationStep() {
  const panel = findGenerationWizardPanel();
  if (!panel) return;
  moveSchemeSelectorToGenerationWordSection(panel);
  renderGenerationItemsList(panel);
}

function invalidateGenerationCaches() {
  const workspace = window.__genealogyWorkspace;
  const clanId = workspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '';
  if (clanId) generationSchemeCache.delete(clanId);
  generationItemCache.clear();
}

function invalidatePersonCaches() {
  const workspace = window.__genealogyWorkspace;
  const clanId = workspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '';
  if (clanId) personCache.delete(clanId);
}

function syncMvp1WizardEnhancements() {
  ensureSelectedClanBanner();
  simplifyPersonEntryStep();
  removeExtraCenterPersonSelector();
  ensureRelativePersonSelector();
  enhanceGenerationStep();
}

function installMvp1WizardEnhancements() {
  const sync = () => requestAnimationFrame(syncMvp1WizardEnhancements);

  sync();

  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('button');
    const text = button?.textContent || '';
    if (text.includes('创建亲属关系')) {
      const panel = findRelationshipWizardPanel();
      if (panel && selectedExistingRelative(panel)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        void createRelationshipWithSelectedRelative(panel).then(() => sync()).catch(error => window.alert((error as Error).message || '创建亲属关系失败'));
      }
    }
  }, true);

  document.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.antd-table-wrap tr.clickable')) {
      window.setTimeout(sync, 0);
    }
    const button = target?.closest('button');
    const text = button?.textContent || '';
    if (text.includes('创建字辈方案') || text.includes('追加字辈')) {
      window.setTimeout(() => {
        invalidateGenerationCaches();
        sync();
      }, 600);
    }
    if (text.includes('创建人物') || text.includes('刷新选项')) {
      window.setTimeout(() => {
        invalidatePersonCaches();
        void loadPersons(window.__genealogyWorkspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '', true);
      }, 600);
    }
  });

  document.addEventListener('change', event => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.wizard-generation-section--items') || target?.closest('.wizard-existing-relative-field')) {
      window.setTimeout(sync, 0);
    }
  }, true);

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
