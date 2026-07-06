import { apiClient } from './shared/api/client';

const CUSTOM_SCHEME_ID_KEY = 'genealogy.mvp1.generation.schemeId';
const CUSTOM_SCHEME_NAME_KEY = 'genealogy.mvp1.generation.schemeName';
const CUSTOM_SCHEME_CLAN_KEY = 'genealogy.mvp1.generation.clanId';
const WIZARD_ROOT_SELECTOR = '.mvp1-wizard';
const STEP_SELECTOR = '.wizard-steps button';
const STEP_MARKERS = [
  '1. 创建宗族',
  '2. 建立支派',
  '3. 维护字辈',
  '4. 录入人物',
  '5. 建立关系',
  '6. 绑定来源',
  '7. 提交审核',
  '8. 查看世系'
];
const DOWNSTREAM_STEP_MARKERS = STEP_MARKERS.slice(2);
const NEXT_BUTTON_CLASS = 'wizard-selected-branch-next';
const STYLE_ID = 'genealogy-mvp1-wizard-enhancements-style';

const EDUCATION_OPTIONS = [
  '',
  '未填写',
  '私塾/家学',
  '小学',
  '初中',
  '高中',
  '中专',
  '大专',
  '本科',
  '硕士',
  '博士',
  '其他'
];

type WizardWorkspace = {
  clanId?: string;
  branchId?: string;
};

declare global {
  interface Window {
    __genealogyWorkspace?: WizardWorkspace;
    __genealogyMvp1WizardEnhancementsInstalled?: boolean;
  }
}

let storedItemsLoading = false;
let lastLoadedStoredSchemeId = '';

function hasValue(value?: string) {
  return Boolean(String(value || '').trim());
}

function getWorkspace() {
  return window.__genealogyWorkspace || {};
}

function currentClanId() {
  return window.__genealogyWorkspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '';
}

function currentBranchId() {
  return window.__genealogyWorkspace?.branchId || localStorage.getItem('genealogy.workspace.branchId') || '';
}

function storedSchemeId() {
  const clanId = currentClanId();
  return sessionStorage.getItem(CUSTOM_SCHEME_CLAN_KEY) === clanId ? sessionStorage.getItem(CUSTOM_SCHEME_ID_KEY) || '' : '';
}

function findWizardRoot() {
  return document.querySelector<HTMLElement>(WIZARD_ROOT_SELECTOR);
}

function findPanel(match: (text: string, panel: HTMLElement) => boolean) {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.antd-panel, .panel'));
  return panels.find(panel => match(panel.textContent || '', panel)) || null;
}

function findGenerationWizardPanel() {
  return findPanel(text => text.includes('维护字辈') && text.includes('追加字辈'));
}

function findPersonWizardPanel() {
  return findPanel(text => text.includes('录入人物') && text.includes('创建人物'));
}

function findSourceWizardPanel() {
  return findPanel(text => text.includes('绑定来源证据') && text.includes('创建来源') && text.includes('绑定来源'));
}

function findBranchWizardPanel(root?: HTMLElement) {
  const scope = root || document;
  const panels = Array.from(scope.querySelectorAll<HTMLElement>('.antd-panel, .panel'));
  return panels.find(panel => {
    const text = panel.textContent || '';
    return text.includes('建立支派') && text.includes('该宗族下已有支派');
  }) || null;
}

function formItemLabelText(item: HTMLElement) {
  const label = item.querySelector<HTMLElement>('.ant-form-item-label label, label');
  return (label?.textContent || '').trim();
}

function findFormItemByLabel(root: HTMLElement, labelText: string) {
  return Array.from(root.querySelectorAll<HTMLElement>('.ant-form-item, .field'))
    .find(item => formItemLabelText(item) === labelText || formItemLabelText(item).includes(labelText)) || null;
}

function findButtonByText(root: HTMLElement, keyword: string) {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
    .find(button => (button.textContent || '').includes(keyword)) || null;
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function moveAfter(target: HTMLElement | null, anchor: HTMLElement | null) {
  if (!target || !anchor || target === anchor) return;
  if (anchor.nextElementSibling === target) return;
  anchor.insertAdjacentElement('afterend', target);
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .mvp1-wizard .wizard-steps button.wizard-step-locked {
      cursor: not-allowed;
      opacity: 0.52;
      filter: grayscale(0.15);
    }
    .mvp1-wizard .wizard-steps button.wizard-step-locked em {
      color: #ff4d4f;
    }
    .${NEXT_BUTTON_CLASS} {
      border: 1px solid #1677ff;
      background: #fff;
      color: #1677ff;
      border-radius: 6px;
      height: 32px;
      padding: 4px 15px;
      cursor: pointer;
      font-size: 14px;
    }
    .${NEXT_BUTTON_CLASS}:not(:disabled):hover {
      color: #4096ff;
      border-color: #4096ff;
    }
    .${NEXT_BUTTON_CLASS}:disabled {
      color: rgba(0, 0, 0, 0.25);
      border-color: #d9d9d9;
      background: rgba(0, 0, 0, 0.04);
      cursor: not-allowed;
    }
    .wizard-branch-guard-hint {
      margin: 8px 0 12px;
      color: rgba(0, 0, 0, 0.65);
      font-size: 13px;
      line-height: 1.7;
    }
    .wizard-branch-guard-hint strong {
      color: #1677ff;
    }
  `;
  document.head.appendChild(style);
}

function stepMarker(button: HTMLButtonElement) {
  const text = button.textContent || '';
  return STEP_MARKERS.find(marker => text.includes(marker)) || '';
}

function findStepButton(root: HTMLElement, marker: string) {
  return Array.from(root.querySelectorAll<HTMLButtonElement>(STEP_SELECTOR))
    .find(button => (button.textContent || '').includes(marker)) || null;
}

function downstreamStepRequiresBranch(marker: string) {
  return DOWNSTREAM_STEP_MARKERS.includes(marker);
}

function canEnterStep(marker: string, workspace: WizardWorkspace) {
  if (!downstreamStepRequiresBranch(marker)) return true;
  return hasValue(workspace.clanId) && hasValue(workspace.branchId);
}

function lockedReason(workspace: WizardWorkspace) {
  if (!hasValue(workspace.clanId)) return '请先在“建立支派”步骤选择宗族';
  if (!hasValue(workspace.branchId)) return '请先在支派列表中选中一个支派';
  return '';
}

function selectedBranchName(panel: HTMLElement) {
  const row = panel.querySelector<HTMLElement>('.ant-table-row-selected, tr.selected, .selected');
  const name = row?.querySelector<HTMLElement>('td')?.textContent?.trim();
  return name || '';
}

function syncStepButtons(root: HTMLElement, workspace: WizardWorkspace) {
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(STEP_SELECTOR));
  let activeLockedButton: HTMLButtonElement | null = null;

  buttons.forEach(button => {
    const marker = stepMarker(button);
    if (!marker) return;

    const unlocked = canEnterStep(marker, workspace);
    button.disabled = !unlocked;
    button.setAttribute('aria-disabled', String(!unlocked));
    button.classList.toggle('wizard-step-locked', !unlocked);

    if (unlocked) {
      button.removeAttribute('title');
    } else {
      button.title = lockedReason(workspace);
      const status = button.querySelector('em');
      if (status) status.textContent = '待选中支派';
      if (button.classList.contains('active')) activeLockedButton = button;
    }
  });

  if (activeLockedButton) {
    const fallback = findStepButton(root, '2. 建立支派') || findStepButton(root, '1. 创建宗族');
    if (fallback && fallback !== activeLockedButton) window.setTimeout(() => fallback.click(), 0);
  }
}

function ensureBranchGuardHint(panel: HTMLElement, workspace: WizardWorkspace) {
  let hint = panel.querySelector<HTMLElement>('.wizard-branch-guard-hint');
  const branchReady = hasValue(workspace.branchId);
  const clanReady = hasValue(workspace.clanId);

  if (!hint) {
    hint = document.createElement('p');
    hint.className = 'wizard-branch-guard-hint';
    const branchList = panel.querySelector('.wizard-branch-list');
    if (branchList) branchList.insertAdjacentElement('beforebegin', hint);
    else panel.appendChild(hint);
  }

  const branchName = selectedBranchName(panel);
  hint.innerHTML = branchReady
    ? `当前已选中支派${branchName ? `：<strong>${branchName}</strong>` : ''}，可以进入维护字辈。`
    : clanReady
      ? '请先在下方支派列表中点击选中一个支派，或创建支派后确认选中，再进入下一步。'
      : '请先选择宗族，再创建或选中支派。';
}

function ensureBranchNextButton(root: HTMLElement, workspace: WizardWorkspace) {
  const panel = findBranchWizardPanel(root);
  if (!panel) return;

  ensureBranchGuardHint(panel, workspace);

  const actions = panel.querySelector<HTMLElement>('.antd-actions, .actions');
  if (!actions) return;

  let nextButton = panel.querySelector<HTMLButtonElement>(`.${NEXT_BUTTON_CLASS}`);
  if (!nextButton) {
    nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = NEXT_BUTTON_CLASS;
    nextButton.textContent = '选中支派，进入下一步';
    nextButton.addEventListener('click', () => {
      const latestWorkspace = getWorkspace();
      if (!hasValue(latestWorkspace.clanId) || !hasValue(latestWorkspace.branchId)) return;
      findStepButton(root, '3. 维护字辈')?.click();
    });
    actions.appendChild(nextButton);
  }

  const ready = hasValue(workspace.clanId) && hasValue(workspace.branchId);
  nextButton.disabled = !ready;
  nextButton.title = ready ? '' : lockedReason(workspace);
}

function syncWizardStepGuard() {
  const root = findWizardRoot();
  if (!root) return;
  const workspace = getWorkspace();
  syncStepButtons(root, workspace);
  ensureBranchNextButton(root, workspace);
}

function schemeNameInput(panel: HTMLElement) {
  return findFormItemByLabel(panel, '字辈方案名称')?.querySelector<HTMLInputElement>('input') || null;
}

function wordInput(panel: HTMLElement) {
  return findFormItemByLabel(panel, '字辈')?.querySelector<HTMLInputElement>('input') || null;
}

function generationNoValue(panel: HTMLElement) {
  const field = findFormItemByLabel(panel, '代次');
  const text = field?.querySelector<HTMLElement>('.ant-select-selection-item')?.textContent || field?.textContent || '';
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : 1;
}

function renameGenerationSchemeTitle(panel: HTMLElement) {
  Array.from(panel.querySelectorAll<HTMLElement>('h4')).forEach(title => {
    const text = (title.textContent || '').trim();
    if (text.includes('创建 / 选择字辈方案') || text.includes('创建/选择字辈方案')) {
      title.textContent = text.replace('创建 / 选择字辈方案', '创建字辈方案').replace('创建/选择字辈方案', '创建字辈方案');
    }
    if (text.includes('三、该方案下已有字辈')) title.textContent = '该方案下已有字辈';
  });
}

function clearDefaultSchemeName(panel: HTMLElement) {
  const input = schemeNameInput(panel);
  const generatedIdField = findFormItemByLabel(panel, '系统生成编号');
  const generatedIdText = generatedIdField?.textContent || '';
  const hasCreatedScheme = generatedIdText.includes('已生成');
  if (!input || hasCreatedScheme) return;
  if (input.value === '主派语') {
    setNativeInputValue(input, '');
    input.placeholder = '请输入字辈方案名称，例如：黄氏长沙支字辈';
  }
}

function markGenerationSections(panel: HTMLElement) {
  const schemeSection = Array.from(panel.querySelectorAll<HTMLElement>('.wizard-generation-section'))
    .find(section => (section.textContent || '').includes('字辈方案名称'));
  const itemSection = Array.from(panel.querySelectorAll<HTMLElement>('.wizard-generation-section'))
    .find(section => (section.textContent || '').includes('追加字辈明细'));
  schemeSection?.classList.add('wizard-generation-section--scheme-enhanced');
  itemSection?.classList.add('wizard-generation-section--items-enhanced');
}

function enableClanLevelSchemeButtons(panel: HTMLElement) {
  const clanId = currentClanId();
  const branchId = currentBranchId();
  const schemeName = schemeNameInput(panel)?.value.trim() || '';
  const createButton = findButtonByText(panel, '创建字辈方案');
  if (createButton && clanId && schemeName && !branchId) {
    createButton.disabled = false;
    createButton.removeAttribute('disabled');
    createButton.setAttribute('aria-disabled', 'false');
    createButton.classList.remove('ant-btn-disabled');
  }

  const schemeId = storedSchemeId();
  const word = wordInput(panel)?.value.trim() || '';
  const addButton = findButtonByText(panel, '追加字辈');
  if (addButton && schemeId && word) {
    addButton.disabled = false;
    addButton.removeAttribute('disabled');
    addButton.setAttribute('aria-disabled', 'false');
    addButton.classList.remove('ant-btn-disabled');
  }
}

async function loadStoredGenerationItems(panel: HTMLElement, force = false) {
  const schemeId = storedSchemeId();
  if (!schemeId) return;
  if (!force && (storedItemsLoading || lastLoadedStoredSchemeId === schemeId)) return;
  storedItemsLoading = true;
  try {
    const rows = await apiClient.get(`/generation-schemes/${schemeId}/items`).catch(() => []);
    const list = Array.isArray(rows) ? rows : Array.isArray((rows as any)?.records) ? (rows as any).records : [];
    const wrapper = panel.querySelector<HTMLElement>('.wizard-generation-items-list-enhanced');
    if (!wrapper) return;
    const body = list
      .slice()
      .sort((a: any, b: any) => Number(a.generationNo || 0) - Number(b.generationNo || 0))
      .map((item: any, index: number) => `
        <tr>
          <td>${index + 1}</td>
          <td>第${item.generationNo || '-'}世</td>
          <td><strong>${item.word || '-'}</strong></td>
          <td>${item.description || item.sortOrder || '-'}</td>
        </tr>
      `).join('');
    wrapper.innerHTML = `
      <div class="wizard-generation-list-header">
        <h4>该方案下已有字辈</h4>
        <span>共 ${list.length} 条</span>
      </div>
      <div class="wizard-generation-list-table-wrap">
        <table class="wizard-generation-list-table">
          <thead><tr><th>序号</th><th>代次</th><th>字辈</th><th>备注</th></tr></thead>
          <tbody>${body || '<tr><td colspan="4" class="empty">该方案下暂无字辈，创建后会显示在这里</td></tr>'}</tbody>
        </table>
      </div>
    `;
    lastLoadedStoredSchemeId = schemeId;
  } finally {
    storedItemsLoading = false;
  }
}

async function createClanLevelScheme(panel: HTMLElement) {
  const clanId = currentClanId();
  const branchId = currentBranchId();
  const input = schemeNameInput(panel);
  const schemeName = input?.value.trim() || '';
  if (!clanId) throw new Error('请选择宗族');
  if (branchId) return;
  if (!schemeName) throw new Error('请填写字辈方案名称');

  const data: any = await apiClient.post(`/clans/${clanId}/generation-schemes`, {
    branchId: null,
    schemeName,
    isDefault: true,
    validationEnabled: true,
    strictMode: false
  });
  const schemeId = String(data?.id || '');
  sessionStorage.setItem(CUSTOM_SCHEME_ID_KEY, schemeId);
  sessionStorage.setItem(CUSTOM_SCHEME_NAME_KEY, schemeName);
  sessionStorage.setItem(CUSTOM_SCHEME_CLAN_KEY, clanId);
  lastLoadedStoredSchemeId = '';
  const generatedIdInput = findFormItemByLabel(panel, '系统生成编号')?.querySelector<HTMLInputElement>('input');
  if (generatedIdInput) setNativeInputValue(generatedIdInput, `已生成：${schemeId}`);
  await loadStoredGenerationItems(panel, true);
  window.alert('字辈方案创建成功，可继续追加字辈明细');
}

async function addGenerationWordToStoredScheme(panel: HTMLElement) {
  const schemeId = storedSchemeId();
  const input = wordInput(panel);
  const word = input?.value.trim() || '';
  if (!schemeId) return;
  if (!word) throw new Error('请填写字辈');
  await apiClient.post(`/generation-schemes/${schemeId}/items`, {
    generationNo: generationNoValue(panel),
    word
  });
  if (input) setNativeInputValue(input, '');
  lastLoadedStoredSchemeId = '';
  await loadStoredGenerationItems(panel, true);
  window.alert('字辈明细已追加，可继续维护字辈');
}

function syncGenerationStepEnhancements() {
  const panel = findGenerationWizardPanel();
  if (!panel) return;
  renameGenerationSchemeTitle(panel);
  clearDefaultSchemeName(panel);
  markGenerationSections(panel);
  enableClanLevelSchemeButtons(panel);
  void loadStoredGenerationItems(panel);
}

function reorderGenerationFields(panel: HTMLElement) {
  const schemeField = findFormItemByLabel(panel, '字辈方案');
  const generationWordField = findFormItemByLabel(panel, '字辈');
  const generationNoField = findFormItemByLabel(panel, '代次');
  if (!schemeField || !generationWordField || !generationNoField) return;

  moveAfter(generationNoField, schemeField);
  moveAfter(generationWordField, schemeField);
  generationWordField.classList.add('wizard-person-generation-field');
  generationNoField.classList.add('wizard-person-generation-field');
}

function enhanceEducationSelect(panel: HTMLElement) {
  const field = findFormItemByLabel(panel, '教育程度');
  const input = field?.querySelector<HTMLInputElement>('input');
  if (!field || !input) return;

  field.classList.add('wizard-person-education-field');
  input.classList.add('wizard-person-education-origin-input');
  input.tabIndex = -1;

  let select = field.querySelector<HTMLSelectElement>('select.wizard-person-education-select');
  if (!select) {
    select = document.createElement('select');
    select.className = 'wizard-person-education-select';
    select.innerHTML = EDUCATION_OPTIONS.map(value => `<option value="${value}">${value || '请选择教育程度'}</option>`).join('');
    input.insertAdjacentElement('afterend', select);
    select.addEventListener('change', () => setNativeInputValue(input, select?.value || ''));
  }

  if (select.value !== input.value) {
    const exists = EDUCATION_OPTIONS.includes(input.value);
    if (!exists && input.value) {
      const option = document.createElement('option');
      option.value = input.value;
      option.textContent = input.value;
      select.appendChild(option);
    }
    select.value = input.value || '';
  }
}

function syncPersonEntryFieldEnhancements() {
  const panel = findPersonWizardPanel();
  if (!panel) return;
  reorderGenerationFields(panel);
  enhanceEducationSelect(panel);
}

function ensureSection(panel: HTMLElement, className: string, title: string, description: string) {
  let section = panel.querySelector<HTMLElement>(`.${className}`);
  if (!section) {
    section = document.createElement('section');
    section.className = `wizard-source-section ${className}`;
    section.innerHTML = `
      <div class="wizard-source-section-head">
        <h4>${title}</h4>
        <p>${description}</p>
      </div>
      <div class="wizard-source-section-grid"></div>
      <div class="wizard-source-section-actions"></div>
    `;
    const descriptionNode = panel.querySelector<HTMLElement>('.panel-description, .ant-card-meta-description');
    descriptionNode?.insertAdjacentElement('afterend', section);
    if (!descriptionNode) panel.prepend(section);
  }
  return section;
}

function moveField(section: HTMLElement, field: HTMLElement | null) {
  if (!field) return;
  const grid = section.querySelector<HTMLElement>('.wizard-source-section-grid');
  if (grid && !grid.contains(field)) grid.appendChild(field);
}

function moveButton(section: HTMLElement, button: HTMLButtonElement | null) {
  if (!button) return;
  const actions = section.querySelector<HTMLElement>('.wizard-source-section-actions');
  const item = button.closest<HTMLElement>('.ant-space-item') || button;
  if (actions && !actions.contains(item)) actions.appendChild(item);
}

function hideEmptyOriginalContainers(panel: HTMLElement) {
  panel.querySelectorAll<HTMLElement>('.wizard-form-grid').forEach(grid => {
    if (!grid.querySelector('.ant-form-item, .field')) grid.style.display = 'none';
  });
  panel.querySelectorAll<HTMLElement>('.antd-actions, .actions').forEach(actions => {
    if (!actions.querySelector('button:not([style*="display: none"])')) actions.style.display = 'none';
  });
}

function removeRelationshipArtifacts(panel: HTMLElement) {
  panel.querySelectorAll<HTMLElement>('.wizard-existing-relative-field, .wizard-current--relative-person-selector, .wizard-current--center-person-selector, .wizard-relationship-list-enhanced')
    .forEach(node => node.remove());
}

function hideRefreshButton(panel: HTMLElement) {
  const refreshButton = findButtonByText(panel, '刷新选项');
  if (refreshButton) {
    const item = refreshButton.closest<HTMLElement>('.ant-space-item') || refreshButton;
    item.style.display = 'none';
    refreshButton.style.display = 'none';
  }
}

function splitSourceStep(panel: HTMLElement) {
  const createSection = ensureSection(
    panel,
    'wizard-source-section--create',
    '一、创建来源',
    '先维护族谱原文、口述记录、墓碑、照片等来源材料。'
  );
  const bindSection = ensureSection(
    panel,
    'wizard-source-section--bind',
    '二、绑定来源',
    '再选择已有来源，并绑定到人物、关系、支派或宗族。'
  );

  moveField(createSection, findFormItemByLabel(panel, '适用宗族'));
  moveField(createSection, findFormItemByLabel(panel, '来源名称'));
  moveField(createSection, findFormItemByLabel(panel, '来源类型'));
  moveButton(createSection, findButtonByText(panel, '创建来源'));

  moveField(bindSection, findFormItemByLabel(panel, '已有来源'));
  moveField(bindSection, findFormItemByLabel(panel, '绑定对象类型'));
  moveField(bindSection, findFormItemByLabel(panel, '绑定对象'));
  moveButton(bindSection, findButtonByText(panel, '绑定来源'));
}

function syncSourceStepEnhancements() {
  const panel = findSourceWizardPanel();
  if (!panel) return;
  panel.classList.add('wizard-source-panel-enhanced');
  removeRelationshipArtifacts(panel);
  hideRefreshButton(panel);
  splitSourceStep(panel);
  hideEmptyOriginalContainers(panel);
}

function syncAllWizardEnhancements() {
  syncWizardStepGuard();
  syncGenerationStepEnhancements();
  syncPersonEntryFieldEnhancements();
  syncSourceStepEnhancements();
}

function installMvp1WizardEnhancements() {
  if (window.__genealogyMvp1WizardEnhancementsInstalled) return;
  window.__genealogyMvp1WizardEnhancementsInstalled = true;

  injectStyle();
  const sync = () => window.requestAnimationFrame(syncAllWizardEnhancements);
  sync();

  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('button');
    const panel = findGenerationWizardPanel();
    if (button && panel) {
      const text = button.textContent || '';
      if (text.includes('创建字辈方案') && !currentBranchId()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        void createClanLevelScheme(panel).then(() => sync()).catch(error => window.alert((error as Error).message || '创建字辈方案失败'));
      }
      if (text.includes('追加字辈') && storedSchemeId()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        void addGenerationWordToStoredScheme(panel).then(() => sync()).catch(error => window.alert((error as Error).message || '追加字辈失败'));
      }
    }
    window.setTimeout(sync, 0);
  }, true);

  document.addEventListener('change', event => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.wizard-form-grid, .wizard-generation-section')) window.setTimeout(sync, 0);
  }, true);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installMvp1WizardEnhancements, { once: true });
  } else {
    installMvp1WizardEnhancements();
  }
}

export {};