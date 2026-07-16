import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { WIZARD_RESULT_PAGE_SIZE } from './domain/wizardResultListModel';
import './wizard-result-list.css';

type Props = { children: ReactNode };

function numericSelection(text: string) {
  const match = text.match(/[（(](\d+)[）)]/);
  return Number(match?.[1] || 0);
}

function visibleName(cell: HTMLElement) {
  return (cell.textContent || '').replace(/\s+/g, ' ').trim() || '当前记录';
}

function applyPage(wrapper: HTMLElement, page: number) {
  const rows = Array.from(wrapper.querySelectorAll<HTMLElement>('tbody tr.ant-table-row'));
  const pageCount = Math.max(1, Math.ceil(rows.length / WIZARD_RESULT_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  rows.forEach((row, index) => {
    const visible = index >= (safePage - 1) * WIZARD_RESULT_PAGE_SIZE && index < safePage * WIZARD_RESULT_PAGE_SIZE;
    row.hidden = !visible;
  });
  wrapper.dataset.wizardPage = String(safePage);
  const summary = wrapper.querySelector<HTMLElement>('.wizard-result-pagination__summary');
  if (summary) summary.textContent = `${safePage}/${pageCount} 页 · 共 ${rows.length} 条`;
  const previous = wrapper.querySelector<HTMLButtonElement>('[data-page-action="previous"]');
  const next = wrapper.querySelector<HTMLButtonElement>('[data-page-action="next"]');
  if (previous) previous.disabled = safePage <= 1;
  if (next) next.disabled = safePage >= pageCount;
}

function ensurePagination(wrapper: HTMLElement) {
  const rows = Array.from(wrapper.querySelectorAll<HTMLElement>('tbody tr.ant-table-row'));
  const existing = wrapper.querySelector('.wizard-result-pagination');
  if (rows.length <= WIZARD_RESULT_PAGE_SIZE) {
    existing?.remove();
    rows.forEach(row => { row.hidden = false; });
    return;
  }
  if (!existing) {
    const controls = document.createElement('div');
    controls.className = 'wizard-result-pagination';
    controls.innerHTML = '<button type="button" data-page-action="previous">上一页</button><span class="wizard-result-pagination__summary"></span><button type="button" data-page-action="next">下一页</button>';
    controls.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-page-action]');
      if (!button) return;
      const current = Number(wrapper.dataset.wizardPage || 1);
      applyPage(wrapper, button.dataset.pageAction === 'previous' ? current - 1 : current + 1);
    });
    wrapper.appendChild(controls);
  }
  applyPage(wrapper, Number(wrapper.dataset.wizardPage || 1));
}

function standardize(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('.ant-table-wrapper').forEach(wrapper => {
    wrapper.classList.add('wizard-standard-result-list');
    const rows = Array.from(wrapper.querySelectorAll<HTMLElement>('tbody tr.ant-table-row'));
    const section = wrapper.closest<HTMLElement>('.step-object-result-panel, .wizard-branch-list, .wizard-generation-inline-list, .ant-card');
    const heading = section?.querySelector<HTMLElement>('h4');
    if (heading) {
      const base = heading.dataset.wizardBaseTitle || heading.textContent?.replace(/（\d+）$/, '') || '查询结果';
      heading.dataset.wizardBaseTitle = base;
      heading.textContent = `${base}（${rows.length}）`;
    }
    rows.forEach(row => {
      const firstCell = row.querySelector<HTMLElement>('td');
      if (!firstCell || firstCell.dataset.wizardAccessible === 'true') return;
      firstCell.dataset.wizardAccessible = 'true';
      firstCell.tabIndex = 0;
      firstCell.setAttribute('role', 'button');
      firstCell.setAttribute('aria-label', `选择${visibleName(firstCell)}`);
      firstCell.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        row.click();
      });
    });
    ensurePagination(wrapper);
  });

  root.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
    if (!/批量/.test(button.textContent || '')) return;
    const selected = numericSelection(button.textContent || '');
    const container = button.closest<HTMLElement>('.ant-space-item, .step-draft-review-header, .wizard-inline-list-header');
    if (container) container.dataset.wizardBatchVisible = selected > 0 ? 'true' : 'false';
    button.setAttribute('aria-label', selected > 0 ? `${button.textContent}，作用于已选记录` : '尚未选择可批量操作的记录');
  });
}

export function WizardResultListBoundary({ children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let scheduled = 0;
    const run = () => {
      window.cancelAnimationFrame(scheduled);
      scheduled = window.requestAnimationFrame(() => standardize(root));
    };
    run();
    const observer = new MutationObserver(run);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => { observer.disconnect(); window.cancelAnimationFrame(scheduled); };
  }, []);
  return <div ref={rootRef} className="wizard-result-list-boundary">{children}</div>;
}
