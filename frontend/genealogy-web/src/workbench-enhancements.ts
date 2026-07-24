import './workbench-enhancements.css';
import { apiClient } from './shared/api/client';

type WorkbenchMetrics = { total: number; processing: number; ready: number; blocked: number; highRisk: number; completionRate: number };
type NavigationItem = { label: string; view: string; primary: boolean };
type QualityRule = { code: string; name: string; outcome: string; blockLevel: string; affectedSubjectCount: number; message?: string; affectedSubjectIds: string[] };
type QualityResult = { checkId: string; status: string; scopeType: string; mode: string; reviewBlocked: boolean; summary?: { subjectCount: number; issueCount: number; blockingIssueCount: number; warningIssueCount: number }; rules: QualityRule[]; completedAt?: string; failureMessage?: string };

const PAGE_MARKER = 'data-workbench-enhanced';
const NAV_ITEMS: readonly NavigationItem[] = [
  { label: '新建修谱', view: 'mvp1Wizard', primary: true },
  { label: '人物档案', view: 'personArchive', primary: false },
  { label: '来源资料', view: 'sourceLibrary', primary: false },
  { label: '世系图谱', view: 'treeProduct', primary: false }
];
let latestQuality: QualityResult | null = null;
let qualityLoading = false;
let qualityError = '';

function textCount(root: ParentNode, text: string) { return Array.from(root.querySelectorAll('.ant-tag')).filter(tag => tag.textContent?.trim() === text).length; }
function readTotal(resultCard: HTMLElement) {
  const title = resultCard.querySelector('.ant-card-head-title')?.textContent || '';
  const match = `${title} ${resultCard.textContent || ''}`.match(/共\s*(\d+)\s*条/);
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
  return { total, processing, ready, blocked, highRisk, completionRate: visible ? Math.round((completed / visible) * 100) : 0 };
}
function navigate(view: string) {
  const url = new URL(window.location.href); url.searchParams.set('view', view); url.searchParams.delete('taskId');
  window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
}
function metricCard(label: string, value: number | string, tone = '') {
  const card = document.createElement('div'); card.className = `workbench-overview-metric ${tone}`.trim();
  card.innerHTML = `<span class="workbench-overview-metric__label">${label}</span><strong>${value}</strong>`; return card;
}
function visibleProblemRows(resultCard: HTMLElement) {
  return Array.from(resultCard.querySelectorAll<HTMLTableRowElement>('tbody .ant-table-row')).filter(row => {
    const text = row.textContent || ''; return text.includes('已阻塞') || text.includes('高');
  }).slice(0, 5);
}
function selectedTaskIds(resultCard: HTMLElement) {
  return Array.from(resultCard.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')).map(input => {
    const row = input.closest<HTMLTableRowElement>('tr');
    const link = row?.querySelector<HTMLButtonElement>('button.ant-btn-link');
    const taskRows = Array.from(resultCard.querySelectorAll<HTMLTableRowElement>('tbody .ant-table-row'));
    const index = row ? taskRows.indexOf(row) : -1;
    const card = input.closest<HTMLElement>('.ant-card[role="button"]');
    const raw = row?.getAttribute('data-row-key') || card?.getAttribute('data-row-key') || link?.textContent || (index >= 0 ? taskRows[index]?.textContent : '');
    return String(raw || '').trim();
  }).filter(Boolean);
}
function queryPayload() {
  const url = new URL(window.location.href);
  const list = (name: string) => url.searchParams.getAll(name).filter(Boolean);
  return {
    branchId: url.searchParams.get('branchId') || undefined,
    taskName: url.searchParams.get('taskName') || undefined,
    keyword: url.searchParams.get('keyword') || undefined,
    types: list('type'), statuses: list('status'), risks: list('risk'),
    creator: url.searchParams.get('creator') || undefined,
    createdFrom: url.searchParams.get('createdFrom') || undefined,
    createdTo: url.searchParams.get('createdTo') || undefined
  };
}
function clanId() { return new URL(window.location.href).searchParams.get('clanId') || ''; }
function overviewSignature(resultCard: HTMLElement) {
  return JSON.stringify({ metrics: collectWorkbenchMetrics(resultCard), problems: visibleProblemRows(resultCard).map(row => row.textContent?.trim() || ''), quality: latestQuality, loading: qualityLoading, error: qualityError });
}
async function runQuality(resultCard: HTMLElement, scopeType: 'QUERY' | 'DRAFT_IDS' | 'WORKBENCH_SESSION', gate = false) {
  const currentClanId = clanId();
  if (!currentClanId || qualityLoading) return;
  const selected = selectedTaskIds(resultCard);
  if (scopeType === 'DRAFT_IDS' && !selected.length) { qualityError = '请先选择至少一个修谱任务或草稿。'; refreshOverview(); return; }
  qualityLoading = true; qualityError = ''; refreshOverview();
  try {
    const path = gate ? `/workbench/quality-checks/submission-gate?clanId=${encodeURIComponent(currentClanId)}` : `/workbench/quality-checks?clanId=${encodeURIComponent(currentClanId)}`;
    latestQuality = await apiClient.post<QualityResult>(path, {
      scopeType, mode: gate ? 'REVIEW_GATE' : 'FULL', subjectIds: scopeType === 'DRAFT_IDS' ? selected : [], query: queryPayload(), ruleCodes: []
    });
  } catch (error) {
    qualityError = error instanceof Error ? error.message : '质量检查失败，请稍后重试。';
  } finally { qualityLoading = false; refreshOverview(); }
}
function qualityPanel(resultCard: HTMLElement) {
  const panel = document.createElement('article'); panel.className = 'workbench-overview-panel workbench-quality-panel';
  const status = qualityLoading ? '检查中' : latestQuality ? (latestQuality.reviewBlocked ? '存在阻断问题' : latestQuality.status === 'PASSED' ? '检查通过' : '发现问题') : '尚未检查';
  panel.innerHTML = `<div class="workbench-overview-panel__header"><strong>质量检查</strong><span>${status}</span></div>`;
  const actions = document.createElement('div'); actions.className = 'workbench-quality-actions';
  const buttons: Array<[string, 'QUERY' | 'DRAFT_IDS' | 'WORKBENCH_SESSION', boolean]> = [
    ['检查当前查询', 'QUERY', false], ['检查已选草稿', 'DRAFT_IDS', false], ['检查整个修谱会话', 'WORKBENCH_SESSION', false], ['提交审核检查', 'WORKBENCH_SESSION', true]
  ];
  buttons.forEach(([label, scope, gate]) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = qualityLoading ? '检查中…' : label; button.disabled = qualityLoading; if (gate) button.className = 'is-primary'; button.addEventListener('click', () => void runQuality(resultCard, scope, gate)); actions.appendChild(button); });
  panel.appendChild(actions);
  if (qualityError) { const error = document.createElement('div'); error.className = 'workbench-quality-result is-failed'; error.textContent = qualityError; panel.appendChild(error); }
  if (latestQuality) {
    const summary = document.createElement('div'); summary.className = `workbench-quality-result ${latestQuality.reviewBlocked ? 'is-blocked' : 'is-success'}`;
    summary.innerHTML = `<strong>${latestQuality.reviewBlocked ? '禁止提交审核' : '检查已完成'}</strong><span>检查 ${latestQuality.summary?.subjectCount || 0} 个对象，发现 ${latestQuality.summary?.issueCount || 0} 个问题，其中阻断 ${latestQuality.summary?.blockingIssueCount || 0} 个。</span>`;
    panel.appendChild(summary);
    const list = document.createElement('div'); list.className = 'workbench-quality-rules';
    latestQuality.rules.filter(rule => rule.affectedSubjectCount > 0).forEach(rule => { const item = document.createElement('button'); item.type = 'button'; item.innerHTML = `<span><strong>${rule.name}</strong><small>${rule.message || ''}</small></span><span>${rule.affectedSubjectCount} 项 · ${rule.blockLevel === 'BLOCKING' ? '阻断' : '警告'}</span>`; item.addEventListener('click', () => { const id = rule.affectedSubjectIds[0]; const row = Array.from(resultCard.querySelectorAll<HTMLTableRowElement>('tbody .ant-table-row')).find(candidate => candidate.getAttribute('data-row-key') === id || candidate.textContent?.includes(id)); row?.click(); }); list.appendChild(item); });
    if (!list.childElementCount) list.innerHTML = '<div class="workbench-overview-empty">未发现质量问题</div>';
    panel.appendChild(list);
  }
  return panel;
}
function buildOverview(resultCard: HTMLElement) {
  const metrics = collectWorkbenchMetrics(resultCard); const section = document.createElement('section');
  section.className = 'workbench-overview-shell'; section.dataset.signature = overviewSignature(resultCard); section.setAttribute('aria-label', '修谱工作台总览');
  const metricsPanel = document.createElement('div'); metricsPanel.className = 'workbench-overview-metrics'; metricsPanel.append(metricCard('任务总数', metrics.total), metricCard('处理中', metrics.processing, 'is-processing'), metricCard('待确认', metrics.ready, 'is-ready'), metricCard('阻塞问题', metrics.blocked, 'is-blocked'), metricCard('当前页完成率', `${metrics.completionRate}%`, 'is-progress'));
  const content = document.createElement('div'); content.className = 'workbench-overview-content';
  const issuePanel = document.createElement('article'); issuePanel.className = 'workbench-overview-panel'; const problemRows = visibleProblemRows(resultCard); issuePanel.innerHTML = `<div class="workbench-overview-panel__header"><strong>数据质量问题</strong><span>${metrics.blocked + metrics.highRisk} 项需关注</span></div>`;
  const issueList = document.createElement('div'); issueList.className = 'workbench-issue-list'; if (!problemRows.length) issueList.innerHTML = '<div class="workbench-overview-empty">当前页暂无高风险或阻塞问题</div>'; else problemRows.forEach(row => { const item = document.createElement('button'); item.type = 'button'; item.className = 'workbench-issue-item'; const cells = row.querySelectorAll('td'); item.innerHTML = `<span>${cells[1]?.textContent?.trim() || row.textContent?.trim() || '待处理任务'}</span><span>查看任务 ›</span>`; item.addEventListener('click', () => row.click()); issueList.appendChild(item); }); issuePanel.appendChild(issueList);
  const quickPanel = document.createElement('article'); quickPanel.className = 'workbench-overview-panel'; quickPanel.innerHTML = '<div class="workbench-overview-panel__header"><strong>快捷入口</strong><span>保持当前宗族上下文</span></div>'; const quickActions = document.createElement('div'); quickActions.className = 'workbench-quick-actions'; NAV_ITEMS.forEach(item => { const button = document.createElement('button'); button.type = 'button'; button.className = item.primary ? 'is-primary' : ''; button.textContent = item.label; button.addEventListener('click', () => { if (item.primary) { const existing = Array.from(resultCard.querySelectorAll<HTMLButtonElement>('button')).find(candidate => candidate.textContent?.trim() === '新建任务'); if (existing) { existing.click(); return; } } navigate(item.view); }); quickActions.appendChild(button); }); quickPanel.appendChild(quickActions);
  content.append(issuePanel, quickPanel, qualityPanel(resultCard)); section.append(metricsPanel, content); return section;
}
function enhanceWorkbench() { const resultCard = document.querySelector<HTMLElement>('.workbench-result-card'); if (!resultCard) return; const page = resultCard.parentElement; if (!page || page.getAttribute(PAGE_MARKER) === 'true') return; page.setAttribute(PAGE_MARKER, 'true'); page.classList.add('workbench-restructured-page'); page.insertBefore(buildOverview(resultCard), resultCard); void loadLatest(); }
async function loadLatest() { const currentClanId = clanId(); if (!currentClanId) return; try { latestQuality = await apiClient.get<QualityResult | null>(`/workbench/quality-checks/latest?clanId=${encodeURIComponent(currentClanId)}`); } catch { latestQuality = null; } refreshOverview(); }
function refreshOverview() { const page = document.querySelector<HTMLElement>('[data-workbench-enhanced="true"]'); const resultCard = page?.querySelector<HTMLElement>('.workbench-result-card'); const current = page?.querySelector<HTMLElement>('.workbench-overview-shell'); if (!page || !resultCard || !current) { enhanceWorkbench(); return; } const signature = overviewSignature(resultCard); if (current.dataset.signature === signature) return; current.replaceWith(buildOverview(resultCard)); }
let scheduled = false; const observer = new MutationObserver(() => { if (scheduled) return; scheduled = true; window.requestAnimationFrame(() => { scheduled = false; refreshOverview(); }); }); observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true }); enhanceWorkbench();
