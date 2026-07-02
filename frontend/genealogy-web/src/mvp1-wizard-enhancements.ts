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

function selectedClanName(panel: HTMLElement) {
  const clanId = localStorage.getItem('genealogy.workspace.clanId') || '';
  if (!clanId) return '';

  const rows = Array.from(panel.querySelectorAll<HTMLTableRowElement>('tr[data-row-key]'));
  const row = rows.find(item => item.getAttribute('data-row-key') === clanId);
  const firstCell = row?.querySelector<HTMLTableCellElement>('td');
  return firstCell?.textContent?.trim() || '';
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

function syncMvp1WizardEnhancements() {
  ensureSelectedClanBanner();
  simplifyPersonEntryStep();
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
