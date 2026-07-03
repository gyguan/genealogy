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

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function renameGenerationSchemeTitle(panel: HTMLElement) {
  Array.from(panel.querySelectorAll<HTMLElement>('h4')).forEach(title => {
    const text = (title.textContent || '').trim();
    if (text.includes('创建 / 选择字辈方案') || text.includes('创建/选择字辈方案')) {
      title.textContent = text.replace('创建 / 选择字辈方案', '创建字辈方案').replace('创建/选择字辈方案', '创建字辈方案');
    }
  });
}

function clearDefaultSchemeName(panel: HTMLElement) {
  const schemeNameField = findFormItemByLabel(panel, '字辈方案名称');
  const schemeNameInput = schemeNameField?.querySelector<HTMLInputElement>('input');
  const generatedIdField = findFormItemByLabel(panel, '系统生成编号');
  const generatedIdText = generatedIdField?.textContent || '';
  const hasCreatedScheme = generatedIdText.includes('已生成');
  if (!schemeNameInput || hasCreatedScheme) return;
  if (schemeNameInput.value === '主派语') {
    setNativeInputValue(schemeNameInput, '');
    schemeNameInput.placeholder = '请输入字辈方案名称，例如：黄氏长沙支字辈';
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

function syncGenerationStepEnhancements() {
  const panel = findGenerationWizardPanel();
  if (!panel) return;
  renameGenerationSchemeTitle(panel);
  clearDefaultSchemeName(panel);
  markGenerationSections(panel);
}

function installGenerationStepEnhancements() {
  const sync = () => window.requestAnimationFrame(syncGenerationStepEnhancements);
  sync();

  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });

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
