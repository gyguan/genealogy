import { apiClient } from './shared/api/client';

type PersonOption = {
  id: string;
  name: string;
  genealogyName?: string;
  generationWord?: string;
  generationNo?: string | number;
  gender?: string;
  branchId?: string | number;
  birthDate?: string;
  deathDate?: string;
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

type RelationshipItem = {
  id?: string | number;
  fromPersonId?: string | number;
  sourcePersonId?: string | number;
  toPersonId?: string | number;
  targetPersonId?: string | number;
  relationType?: string;
  relationLabel?: string;
  status?: string;
  dataStatus?: string;
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
const relationshipCache = new Map<string, RelationshipItem[]>();
const relationshipLoading = new Set<string>();
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
    return text.includes('录入人物') && text.includes('创建人物，继续录入') && text.includes('创建人物');
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

function genderText(value?: string) {
  const dict: Record<string, string> = { male: '男', female: '女', unknown: '未知' };
  return dict[value || ''] || value || '未知';
}

function relationTypeText(value?: string) {
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

function genderMatchForMode(person: PersonOption, mode: string) {
  if (mode === 'father') return person.gender === 'male';
  if (mode === 'mother') return person.gender === 'female';
  if (mode === 'spouse') return person.gender === 'female';
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
  if (mode === 'father') return `父亲只能选择上一代男性人物：第 ${centerNo - 1} 世。`;
  if (mode === 'mother') return `母亲只能选择上一代女性人物：第 ${centerNo - 1} 世。`;
  if (mode === 'child') return `子女只能选择下一代人物：第 ${centerNo + 1} 世。`;
  if (mode === 'spouse') return `配偶默认选择同代女性人物：第 ${centerNo} 世。`;
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
      branchId: row.branchId,
      birthDate: row.birthDate,
      deathDate: row.deathDate
    })).filter(item => item.id));
  } catch {
    personCache.set(clanId, []);
  } finally {
    personLoading.delete(clanId);
    requestAnimationFrame(syncMvp1WizardEnhancements);
  }
}

async function loadRelationships(personId: string, force = false) {
  if (!personId || (!force && relationshipCache.has(personId)) || relationshipLoading.has(personId)) return;
  relationshipLoading.add(personId);
  try {
    const rows = toRows(await apiClient.get(`/persons/${personId}/relationships`).catch(() => []));
    relationshipCache.set(personId, rows);
  } finally {
    relationshipLoading.delete(personId);
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

function enhancePersonDateField(panel: HTMLElement, labelText: string) {
  const field = findFormItemByLabel(panel, labelText);
  const input = field?.querySelector<HTMLInputElement>('input');
  if (!field || !input) return;

  if (input.type !== 'text') input.type = 'text';
  input.placeholder = '例如：1888-03-15，可直接输入年份';
  input.inputMode = 'numeric';
  input.pattern = '\\d{4}-\\d{2}-\\d{2}';
  input.classList.add('wizard-direct-date-input');

  let hint = field.querySelector<HTMLElement>('.wizard-date-input-hint');
  if (!hint) {
    hint = document.createElement('small');
    hint.className = 'wizard-date-input-hint';
    hint.textContent = '支持键盘直接输入 YYYY-MM-DD，不需要从日历逐月翻到久远年份。';
    input.insertAdjacentElement('afterend', hint);
  }
}

function simplifyPersonEntryStep() {
  const panel = findPersonWizardPanel();
  if (!panel) return;

  enhancePersonDateField(panel, '出生日期');
  enhancePersonDateField(panel, '逝世日期');

  Array.from(panel.querySelectorAll<HTMLButtonElement>('button')).forEach(button => {
    const text = button.textContent || '';
    if (text.includes('刷新选项') || text.includes('刷新人物')) button.style.display = 'none';
    if (text.includes('清空人物表单')) button.textContent = '重置';
  });

  renderPersonList(panel);
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

function centerPerson(clanId: string, centerPersonId: string) {
  return (personCache.get(clanId) || []).find(person => person.id === centerPersonId);
}

function candidatePeople(clanId: string, centerPersonId: string, mode: string) {
  const people = personCache.get(clanId) || [];
  const center = centerPerson(clanId, centerPersonId);
  return people
    .filter(person => person.id !== centerPersonId)
    .filter(person => generationMatchForMode(center, person, mode))
    .filter(person => genderMatchForMode(person, mode));
}

function simplifyRelationshipStep(panel: HTMLElement) {
  ['亲属姓名', '亲属性别', '亲属代次'].forEach(label => {
    const field = findFormItemByLabel(panel, label);
    if (field) field.style.display = 'none';
  });
  Array.from(panel.querySelectorAll<HTMLButtonElement>('button')).forEach(button => {
    const text = button.textContent || '';
    if (text.includes('刷新选项')) button.style.display = 'none';
    if (text.includes('创建亲属关系')) button.textContent = '创建亲属关系';
  });
}

function ensureRelativePersonSelector() {
  const panel = findRelationshipWizardPanel();
  if (!panel) return;
  simplifyRelationshipStep(panel);

  const workspace = window.__genealogyWorkspace;
  const clanId = workspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '';
  const centerPersonId = workspace?.personId || localStorage.getItem('genealogy.workspace.personId') || '';
  if (clanId) void loadPersons(clanId);
  if (centerPersonId) void loadRelationships(centerPersonId);

  const center = centerPerson(clanId, centerPersonId);
  const mode = selectedRelationshipMode(panel);
  const filteredPeople = candidatePeople(clanId, centerPersonId, mode);

  let wrapper = panel.querySelector<HTMLElement>('.wizard-existing-relative-field');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'field antd-field wizard-existing-relative-field';
    wrapper.innerHTML = '<label>已有亲属人物</label><select><option value="">请选择已有亲属人物</option></select><small></small>';

    const relationshipTypeField = findFormItemByLabel(panel, '关系类型');
    if (relationshipTypeField) relationshipTypeField.insertAdjacentElement('afterend', wrapper);
    else panel.querySelector<HTMLElement>('.wizard-form-grid')?.appendChild(wrapper);
  }

  const select = wrapper.querySelector<HTMLSelectElement>('select');
  const hint = wrapper.querySelector<HTMLElement>('small');
  if (!select) return;

  const html = [
    '<option value="">请选择已有亲属人物</option>',
    ...filteredPeople.map(person => `<option value="${escapeHtml(person.id)}">${escapeHtml(personLabel(person))}</option>`)
  ].join('');

  if (select.dataset.optionsHtml !== html) {
    const previous = select.value;
    select.innerHTML = html;
    select.dataset.optionsHtml = html;
    if (filteredPeople.some(person => person.id === previous)) select.value = previous;
  }

  if (hint) {
    const baseText = relationRestrictionText(center, mode);
    hint.textContent = filteredPeople.length ? baseText : `${baseText} 当前没有匹配的人物，请先在录入人物步骤维护后再建立关系。`;
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

function personNameById(clanId: string, id: string) {
  return (personCache.get(clanId) || []).find(person => person.id === id)?.name || `人物#${id}`;
}

function relationshipPersonId(row: RelationshipItem, centerPersonId: string) {
  const fromId = String(row.fromPersonId || row.sourcePersonId || '');
  const toId = String(row.toPersonId || row.targetPersonId || '');
  return fromId === centerPersonId ? toId : toId === centerPersonId ? fromId : fromId || toId;
}

function renderPersonList(panel: HTMLElement) {
  const workspace = window.__genealogyWorkspace;
  const clanId = workspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '';
  if (clanId) void loadPersons(clanId);

  let wrapper = panel.querySelector<HTMLElement>('.wizard-person-list-enhanced');
  if (!wrapper) {
    wrapper = document.createElement('section');
    wrapper.className = 'wizard-person-list-enhanced';
    const actions = panel.querySelector<HTMLElement>('.antd-actions, .actions');
    if (actions) actions.insertAdjacentElement('afterend', wrapper);
    else panel.appendChild(wrapper);
  }

  const people = clanId ? (personCache.get(clanId) || []) : [];
  const loading = clanId && personLoading.has(clanId);
  const body = people.map((person, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(person.name || '-')}</strong></td>
      <td>${escapeHtml(genderText(person.gender))}</td>
      <td>${escapeHtml(person.generationNo ? `第${person.generationNo}世` : '-')}</td>
      <td>${escapeHtml(person.generationWord || '-')}</td>
      <td>${escapeHtml(person.birthDate || '-')}</td>
      <td>${escapeHtml(person.deathDate || '-')}</td>
    </tr>
  `).join('');

  const emptyText = !clanId
    ? '请先选择宗族'
    : loading
      ? '正在加载人物列表...'
      : '暂无人物，创建后会显示在这里';

  const html = `
    <div class="wizard-person-list-header">
      <h4>已录入人物</h4>
      <span>${clanId ? `共 ${people.length} 位` : ''}</span>
    </div>
    <div class="wizard-person-list-table-wrap">
      <table class="wizard-person-list-table">
        <thead><tr><th>序号</th><th>姓名</th><th>性别</th><th>代次</th><th>字辈</th><th>出生日期</th><th>逝世日期</th></tr></thead>
        <tbody>${body || `<tr><td colspan="7" class="empty">${escapeHtml(emptyText)}</td></tr>`}</tbody>
      </table>
    </div>
  `;

  if (wrapper.dataset.html !== html) {
    wrapper.innerHTML = html;
    wrapper.dataset.html = html;
  }
}

function renderRelationshipList(panel: HTMLElement) {
  const workspace = window.__genealogyWorkspace;
  const clanId = workspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '';
  const centerPersonId = workspace?.personId || localStorage.getItem('genealogy.workspace.personId') || '';
  if (centerPersonId) void loadRelationships(centerPersonId);

  let wrapper = panel.querySelector<HTMLElement>('.wizard-relationship-list-enhanced');
  if (!wrapper) {
    wrapper = document.createElement('section');
    wrapper.className = 'wizard-relationship-list-enhanced';
    const actions = panel.querySelector<HTMLElement>('.antd-actions, .actions');
    if (actions) actions.insertAdjacentElement('afterend', wrapper);
    else panel.appendChild(wrapper);
  }

  const rows = centerPersonId ? (relationshipCache.get(centerPersonId) || []) : [];
  const loading = centerPersonId && relationshipLoading.has(centerPersonId);
  const body = rows.map((row, index) => {
    const otherId = relationshipPersonId(row, centerPersonId);
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(personNameById(clanId, otherId))}</td>
        <td>${escapeHtml(relationTypeText(row.relationType))}</td>
        <td>${escapeHtml(relationLabelText(row.relationLabel || row.relationType))}</td>
      </tr>
    `;
  }).join('');

  const emptyText = !centerPersonId
    ? '请先选择中心人物'
    : loading
      ? '正在加载亲属关系...'
      : '暂无亲属关系，创建后会显示在这里';

  const html = `
    <div class="wizard-relationship-list-header">
      <h4>已创建亲属关系</h4>
      <span>${centerPersonId ? `共 ${rows.length} 条` : ''}</span>
    </div>
    <div class="wizard-relationship-list-table-wrap">
      <table class="wizard-relationship-list-table">
        <thead><tr><th>序号</th><th>亲属姓名</th><th>类型</th><th>标签</th></tr></thead>
        <tbody>${body || `<tr><td colspan="4" class="empty">${escapeHtml(emptyText)}</td></tr>`}</tbody>
      </table>
    </div>
  `;

  if (wrapper.dataset.html !== html) {
    wrapper.innerHTML = html;
    wrapper.dataset.html = html;
  }
}

async function createRelationshipWithSelectedRelative(panel: HTMLElement) {
  const workspace = window.__genealogyWorkspace;
  const clanId = workspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '';
  const centerPersonId = workspace?.personId || localStorage.getItem('genealogy.workspace.personId') || '';
  const relativePerson = selectedExistingRelative(panel);
  if (!clanId || !centerPersonId) {
    window.alert('请先选择宗族和中心人物');
    return;
  }
  if (!relativePerson) {
    window.alert('请选择已有亲属人物');
    return;
  }
  if (relativePerson.id === centerPersonId) {
    window.alert('亲属人物不能与中心人物相同');
    return;
  }

  const center = centerPerson(clanId, centerPersonId);
  const mode = selectedRelationshipMode(panel);
  if (!generationMatchForMode(center, relativePerson, mode) || !genderMatchForMode(relativePerson, mode)) {
    window.alert('所选亲属人物与当前关系类型不匹配，请重新选择。');
    return;
  }

  const relationship: any = await apiClient.post(`/clans/${clanId}/relationships`, buildRelationshipBody(center, relativePerson, mode));
  const relationshipId = String(relationship?.id || '');
  workspace?.patch({ relationshipId, sourceId: '', reviewTaskId: '' });
  localStorage.setItem('genealogy.workspace.relationshipId', relationshipId);
  localStorage.setItem('genealogy.workspace.sourceId', '');
  localStorage.setItem('genealogy.workspace.reviewTaskId', '');

  const select = panel.querySelector<HTMLSelectElement>('.wizard-existing-relative-field select');
  if (select) select.value = '';
  relationshipCache.delete(centerPersonId);
  await loadRelationships(centerPersonId, true);
  renderRelationshipList(panel);
  window.alert('亲属关系创建成功，可继续创建下一条亲属关系');
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

function enhanceRelationshipStep() {
  const panel = findRelationshipWizardPanel();
  if (!panel) return;
  removeExtraCenterPersonSelector();
  ensureRelativePersonSelector();
  renderRelationshipList(panel);
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

function invalidateRelationshipCaches() {
  const personId = window.__genealogyWorkspace?.personId || localStorage.getItem('genealogy.workspace.personId') || '';
  if (personId) relationshipCache.delete(personId);
}

function syncMvp1WizardEnhancements() {
  ensureSelectedClanBanner();
  simplifyPersonEntryStep();
  removeExtraCenterPersonSelector();
  enhanceRelationshipStep();
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
      if (panel) {
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
    if (text.includes('创建人物') || text.includes('刷新选项') || text.includes('重置')) {
      window.setTimeout(() => {
        invalidatePersonCaches();
        invalidateRelationshipCaches();
        void loadPersons(window.__genealogyWorkspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '', true);
      }, 600);
    }
  });

  document.addEventListener('change', event => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.wizard-generation-section--items') || target?.closest('.wizard-existing-relative-field') || target?.closest('.wizard-form-grid')) {
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
