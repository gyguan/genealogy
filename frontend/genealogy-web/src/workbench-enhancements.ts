import './workbench-enhancements.css';

type WorkbenchMetrics = {
  total: number;
  processing: number;
  ready: number;
  blocked: number;
  highRisk: number;
  completionRate: number;
};

const PAGE_MARKER = 'data-workbench-enhanced';
const NAV_ITEMS = [
  { label: '新建修谱', view: 'mvp1Wizard', primary: true },
  { label: '人物档案', view: 'personArchive' },
  { label: '来源资料', view: 'sourceLibrary' },
  { label: '世系图谱', view: 'treeProduct' }
] as const;

function textCount(root: ParentNode, text: string) {
  return Array.from(root.querySelectorAll('.ant-tag')).filter(tag => tag.textContent?.trim() === text).length;
}

function readTotal(resultCard: HTMLElement) {
  const title = resultCard.querySelector('.ant-card-head-title')?.textContent || '';
  const body = resultCard.textContent || '';
  const match = `${title} ${body}`.match(/共\s*(\d+)\s*条/);
  return Number(match?.[1] || resultCard.querySelectorAll('tbody .ant-table-row').length || 0);
}

export function collectWorkbenchMetrics(resultCard: HTMLElement): WorkbenchMetrics {
  const total = readTotal(resultCard);
  const processing = textCount(resultCard, '处理中');
  const ready = textCount(resultCard, '待确认');
  const blocked = textCount(resultCard, '已阻塞');
  const highRisk = textCount(resultCard, '高');
  const visible = resultCard.querySelectorAll('tbody .ant-table-row').length || resultCard.querySelectorAll('.ant-card[role="button"]').length;
  const completed = Math.max(0, visible - processing - blocked);
  const completionRate = visible ? Math.round((completed / visible) * 100) : 0;
  return { total, processing, ready, blocked, highRisk, completionRate };
}

function navigate(view: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('view', view);
  url.searchParams.delete('taskId');
  window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
}

function metricCard(label: string, value: number | string, tone = '') {
  const card = document.createElement('div');
  card.className = `workbench-overview-metric ${tone}`.trim();
  card.innerHTML = `<span class="workbench-overview-metric__label">${label}</span><strong>${value}</strong>`;
  return card;
}

function visibleProblemRows(resultCard: HTMLElement) {
  return Array.from(resultCard.querySelectorAll<HTMLTableRowElement>('tbody .ant-table-row')).filter(row => {
    const text = row.textContent || '';
    return text.includes('已阻塞') || text.includes('高');
  }).slice(0, 5);
}

function overviewSignature(resultCard: HTMLElement) {
  const metrics = collectWorkbenchMetrics(resultCard);
  const problems = visibleProblemRows(resultCard).map(row => row.textContent?.trim() || '').join('|');
  return JSON.stringify({ metrics, problems });
}

function buildOverview(resultCard: HTMLElement) {
  const metrics = collectWorkbenchMetrics(resultCard);
  const section = document.createElement('section');
  section.className = 'workbench-overview-shell';
  section.dataset.signature = overviewSignature(resultCard);
  section.setAttribute('aria-label', '修谱工作台总览');

  const metricsPanel = document.createElement('div');
  metricsPanel.className = 'workbench-overview-metrics';
  metricsPanel.append(
    metricCard('任务总数', metrics.total),
    metricCard('处理中', metrics.processing, 'is-processing'),
    metricCard('待确认', metrics.ready, 'is-ready'),
    metricCard('阻塞问题', metrics.blocked, 'is-blocked'),
    metricCard('当前页完成率', `${metrics.completionRate}%`, 'is-progress')
  );

  const content = document.createElement('div');
  content.className = 'workbench-overview-content';

  const issuePanel = document.createElement('article');
  issuePanel.className = 'workbench-overview-panel';
  const problemRows = visibleProblemRows(resultCard);
  issuePanel.innerHTML = `<div class="workbench-overview-panel__header"><strong>数据质量问题</strong><span>${metrics.blocked + metrics.highRisk} 项需关注</span></div>`;
  const issueList = document.createElement('div');
  issueList.className = 'workbench-issue-list';
  if (!problemRows.length) {
    issueList.innerHTML = '<div class="workbench-overview-empty">当前页暂无高风险或阻塞问题</div>';
  } else {
    problemRows.forEach(row => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'workbench-issue-item';
      const cells = row.querySelectorAll('td');
      const title = cells[1]?.textContent?.trim() || row.textContent?.trim() || '待处理任务';
      item.innerHTML = `<span>${title}</span><span>查看任务 ›</span>`;
      item.addEventListener('click', () => row.click());
      issueList.appendChild(item);
    });
  }
  issuePanel.appendChild(issueList);

  const quickPanel = document.createElement('article');
  quickPanel.className = 'workbench-overview-panel';
  quickPanel.innerHTML = '<div class="workbench-overview-panel__header"><strong>快捷入口</strong><span>保持当前宗族上下文</span></div>';
  const quickActions = document.createElement('div');
  quickActions.className = 'workbench-quick-actions';
  NAV_ITEMS.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = item.primary ? 'is-primary' : '';
    button.textContent = item.label;
    button.addEventListener('click', () => {
      if (item.primary) {
        const existing = Array.from(resultCard.querySelectorAll<HTMLButtonElement>('button')).find(candidate => candidate.textContent?.trim() === '新建任务');
        if (existing) { existing.click(); return; }
      }
      navigate(item.view);
    });
    quickActions.appendChild(button);
  });
  quickPanel.appendChild(quickActions);

  content.append(issuePanel, quickPanel);
  section.append(metricsPanel, content);
  return section;
}

function enhanceWorkbench() {
  const resultCard = document.querySelector<HTMLElement>('.workbench-result-card');
  if (!resultCard) return;
  const page = resultCard.parentElement;
  if (!page || page.getAttribute(PAGE_MARKER) === 'true') return;
  page.setAttribute(PAGE_MARKER, 'true');
  page.classList.add('workbench-restructured-page');
  page.insertBefore(buildOverview(resultCard), resultCard);
}

function refreshOverview() {
  const page = document.querySelector<HTMLElement>('[data-workbench-enhanced="true"]');
  const resultCard = page?.querySelector<HTMLElement>('.workbench-result-card');
  const current = page?.querySelector<HTMLElement>('.workbench-overview-shell');
  if (!page || !resultCard || !current) { enhanceWorkbench(); return; }
  const signature = overviewSignature(resultCard);
  if (current.dataset.signature === signature) return;
  current.replaceWith(buildOverview(resultCard));
}

let scheduled = false;
const observer = new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    refreshOverview();
  });
});
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
enhanceWorkbench();
