import { apiClient } from './shared/api/client';

const CUSTOM_SCHEME_ID_KEY = 'genealogy.mvp1.generation.schemeId';
const CUSTOM_SCHEME_NAME_KEY = 'genealogy.mvp1.generation.schemeName';
const CUSTOM_SCHEME_CLAN_KEY = 'genealogy.mvp1.generation.clanId';

let storedItemsLoading = false;
let lastLoadedStoredSchemeId = '';

declare global {
  interface Window {
    __genealogyGenerationStepEnhancementsInstalled?: boolean;
  }
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

function currentClanId() {
  return window.__genealogyWorkspace?.clanId || localStorage.getItem('genealogy.workspace.clanId') || '';
}

function currentBranchId() {
  return localStorage.getItem('genealogy.workspace.branchId') || '';
}

function storedSchemeId() {
  const clanId = currentClanId();
  return sessionStorage.getItem(CUSTOM_SCHEME_CLAN_KEY) === clanId ? sessionStorage.getItem(CUSTOM_SCHEME_ID_KEY) || '' : '';
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
    if (text.includes('三、该方案下已有字辈')) {
      title.textContent = '该方案下已有字辈';
    }
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

function installGenerationStepEnhancements() {
  if (window.__genealogyGenerationStepEnhancementsInstalled) return;
  window.__genealogyGenerationStepEnhancementsInstalled = true;

  const sync = () => window.requestAnimationFrame(syncGenerationStepEnhancements);
  sync();

  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', event => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('button');
    const panel = findGenerationWizardPanel();
    if (!button || !panel) return;
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
  }, true);

  document.addEventListener('change', event => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.wizard-generation-section')) window.setTimeout(sync, 0);
  }, true);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installGenerationStepEnhancements, { once: true });
  } else {
    installGenerationStepEnhancements();
  }
}

export {};
