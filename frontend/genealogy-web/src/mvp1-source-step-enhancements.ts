declare global {
  interface Window {
    __genealogySourceStepEnhancementsInstalled?: boolean;
  }
}

function findSourceWizardPanel() {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.antd-panel, .panel'));
  return panels.find(panel => {
    const text = panel.textContent || '';
    return text.includes('绑定来源证据') && text.includes('创建来源') && text.includes('绑定来源');
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

function installSourceStepEnhancements() {
  if (window.__genealogySourceStepEnhancementsInstalled) return;
  window.__genealogySourceStepEnhancementsInstalled = true;

  const sync = () => window.requestAnimationFrame(syncSourceStepEnhancements);
  sync();

  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installSourceStepEnhancements, { once: true });
  } else {
    installSourceStepEnhancements();
  }
}

export {};
