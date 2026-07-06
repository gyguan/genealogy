type WizardWorkspace = {
  clanId?: string;
  branchId?: string;
};

declare global {
  interface Window {
    __genealogyWorkspace?: WizardWorkspace;
    __genealogyMvp1WizardStepGuardInstalled?: boolean;
  }
}

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
const STYLE_ID = 'genealogy-mvp1-wizard-step-guard-style';

function hasValue(value?: string) {
  return Boolean(String(value || '').trim());
}

function getWorkspace() {
  return window.__genealogyWorkspace || {};
}

function findWizardRoot() {
  return document.querySelector<HTMLElement>(WIZARD_ROOT_SELECTOR);
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
    if (fallback && fallback !== activeLockedButton) {
      window.setTimeout(() => fallback.click(), 0);
    }
  }
}

function findBranchPanel(root: HTMLElement) {
  const panels = Array.from(root.querySelectorAll<HTMLElement>('.antd-panel, .panel'));
  return panels.find(panel => {
    const text = panel.textContent || '';
    return text.includes('建立支派') && text.includes('该宗族下已有支派');
  }) || null;
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

  hint.innerHTML = branchReady
    ? `当前已选中支派：<strong>${workspace.branchId}</strong>，可以进入维护字辈。`
    : clanReady
      ? '请先在下方支派列表中点击选中一个支派，或创建支派后确认选中，再进入下一步。'
      : '请先选择宗族，再创建或选中支派。';
}

function ensureBranchNextButton(root: HTMLElement, workspace: WizardWorkspace) {
  const panel = findBranchPanel(root);
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
      const generationStep = findStepButton(root, '3. 维护字辈');
      generationStep?.click();
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

function installWizardStepGuard() {
  if (window.__genealogyMvp1WizardStepGuardInstalled) return;
  window.__genealogyMvp1WizardStepGuardInstalled = true;

  injectStyle();
  const sync = () => window.requestAnimationFrame(syncWizardStepGuard);
  sync();

  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });

  document.addEventListener('click', () => window.setTimeout(sync, 0), true);
  document.addEventListener('change', () => window.setTimeout(sync, 0), true);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installWizardStepGuard, { once: true });
  } else {
    installWizardStepGuard();
  }
}

export {};