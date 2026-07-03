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

function findPersonWizardPanel() {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.antd-panel, .panel'));
  return panels.find(panel => {
    const text = panel.textContent || '';
    return text.includes('录入人物') && text.includes('创建人物');
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
    select.addEventListener('change', () => {
      setNativeInputValue(input, select?.value || '');
    });
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

function installPersonEntryFieldEnhancements() {
  const sync = () => window.requestAnimationFrame(syncPersonEntryFieldEnhancements);
  sync();

  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('change', event => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.wizard-form-grid')) window.setTimeout(sync, 0);
  }, true);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installPersonEntryFieldEnhancements, { once: true });
  } else {
    installPersonEntryFieldEnhancements();
  }
}

export {};
