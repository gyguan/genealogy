import React from 'react';
import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';
import { App } from './app/App';
import { RuntimeErrorBoundary } from './shared/ui/RuntimeErrorBoundary';
import './auth-commercial.css';
import './styles.css';
import './experience.css';
import './mvp1-wizard.css';
import './mvp1-wizard-simplified.css';
import './mvp1-wizard-enhancements.css';
import './mvp1-source-step.css';
import './mvp1-tree-step.css';
import './mvp1-person-step.css';
import './lineage-tree.css';
import './lineage-graph.css';
import './compact-ui.css';
import './audit-trace.css';
import './tabbed-module.css';
import './antd-bridge.css';
import './person-archive-tweaks.css';
import './person-archive-source.css';
import './person-edit-page.css';
import './person-detail-page.css';
import './entity-page-header.css';
import './runtime-error.css';
import './guidance-cleanup.css';
import './lineage-workbench-overrides.css';
import './member-permission-page.css';
import './module-title-dedup.css';
import './page-content-cleanup.css';
import './query-button-unification.css';
import './lineage-result-toolbar-refinement.css';

function installSourceRouteHistorySync() {
  const historyWithMarker = window.history as History & { __sourceRouteSyncInstalled?: boolean };
  if (historyWithMarker.__sourceRouteSyncInstalled) return;
  historyWithMarker.__sourceRouteSyncInstalled = true;

  const notifyWhenSourceRouteChanges = (previousSourceId: string | null) => {
    const nextSourceId = new URL(window.location.href).searchParams.get('sourceId');
    if (previousSourceId !== nextSourceId) {
      window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    }
  };

  const originalPushState = window.history.pushState.bind(window.history);
  window.history.pushState = (data: unknown, unused: string, url?: string | URL | null) => {
    const previousSourceId = new URL(window.location.href).searchParams.get('sourceId');
    originalPushState(data, unused, url);
    notifyWhenSourceRouteChanges(previousSourceId);
  };

  const originalReplaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = (data: unknown, unused: string, url?: string | URL | null) => {
    const previousSourceId = new URL(window.location.href).searchParams.get('sourceId');
    originalReplaceState(data, unused, url);
    notifyWhenSourceRouteChanges(previousSourceId);
  };
}

function installReviewCenterDefaultPageSize() {
  const historyWithMarker = window.history as History & { __reviewDefaultPageSizeInstalled?: boolean };
  if (historyWithMarker.__reviewDefaultPageSizeInstalled) return;
  historyWithMarker.__reviewDefaultPageSizeInstalled = true;

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);
  const normalizeReviewPageSize = () => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('view') !== 'reviewCenter' || url.searchParams.has('pageSize')) return;
    url.searchParams.set('pageSize', '10');
    originalReplaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  };

  window.history.pushState = (data: unknown, unused: string, url?: string | URL | null) => {
    originalPushState(data, unused, url);
    normalizeReviewPageSize();
  };
  window.history.replaceState = (data: unknown, unused: string, url?: string | URL | null) => {
    originalReplaceState(data, unused, url);
    normalizeReviewPageSize();
  };
  normalizeReviewPageSize();
}

function installTrackingMoreFilterTextSync() {
  const syncText = () => {
    document.querySelectorAll<HTMLButtonElement>('.tracking-more-button').forEach(button => {
      const textNode = Array.from(button.childNodes).find(node => (
        node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === '收起'
      ));
      if (textNode) textNode.textContent = '收起筛选';
    });
  };

  const observer = new MutationObserver(syncText);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  syncText();
}

function installResultSortHeaderPlacement() {
  const moveSort = (cardSelector: string, sourceSelector: string) => {
    const card = document.querySelector<HTMLElement>(cardSelector);
    const source = card?.querySelector<HTMLElement>(sourceSelector);
    const extra = card?.querySelector<HTMLElement>(':scope > .ant-card-head .ant-card-extra');
    if (!card || !source || !extra || source.dataset.headerPlaced === 'true') return;

    extra.style.display = 'flex';
    extra.style.alignItems = 'center';
    extra.style.gap = '8px';

    const slot = document.createElement('div');
    slot.className = 'result-sort-header-slot';
    slot.style.display = 'flex';
    slot.style.alignItems = 'center';
    slot.style.flexShrink = '0';
    slot.appendChild(source);
    extra.insertBefore(slot, extra.firstChild);
    source.dataset.headerPlaced = 'true';
  };

  const syncPlacement = () => {
    moveSort('.person-archive-result-card', '.person-archive-result-toolbar > .ant-space');
    moveSort('.source-library-result-card', '.source-library-result-meta .source-library-sort');
  };

  const observer = new MutationObserver(syncPlacement);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  syncPlacement();
}

function installMemberListHeaderPlacement() {
  const findButton = (root: ParentNode | null, label: string) => {
    if (!root) return undefined;
    return Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.trim() === label);
  };

  const syncMemberTotalCount = (element?: HTMLElement | null) => {
    if (!element) return;
    const match = element.textContent?.match(/共\s*(\d+)\s*名(?:成员)?/);
    if (!match) return;
    if (element.dataset.memberTotalCount !== match[1]) {
      element.dataset.memberTotalCount = match[1];
    }
  };

  const syncPlacement = () => {
    const page = document.querySelector<HTMLElement>('.member-role-page');
    const cards = page?.querySelectorAll<HTMLElement>(':scope > .ant-card');
    const queryCard = cards?.[0];
    const resultCard = cards?.[1];
    if (!queryCard || !resultCard) return;

    queryCard.classList.add('member-query-card');
    resultCard.classList.add('member-list-card');

    const title = resultCard.querySelector<HTMLElement>(':scope > .ant-card-head .ant-card-head-title');
    const extra = resultCard.querySelector<HTMLElement>(':scope > .ant-card-head .ant-card-extra');
    const queryExtra = queryCard.querySelector<HTMLElement>(':scope > .ant-card-head .ant-card-extra');
    if (!title || !extra) return;

    const placedTotal = title.querySelector<HTMLElement>('[data-member-total-placed="true"]');
    const sourceTotal = Array.from(extra.children).find(child => /共\s*\d+\s*名(?:成员)?/.test(child.textContent || ''));
    if (sourceTotal instanceof HTMLElement && sourceTotal !== placedTotal) {
      placedTotal?.remove();
      sourceTotal.dataset.memberTotalPlaced = 'true';
      title.appendChild(sourceTotal);
    }
    syncMemberTotalCount(sourceTotal instanceof HTMLElement ? sourceTotal : placedTotal);

    const inviteButton = findButton(document.querySelector('.github-like-header'), '邀请新成员')
      || findButton(extra, '邀请新成员');
    const grantButton = findButton(queryExtra, '新增成员授权')
      || findButton(extra, '新增成员授权');

    if (inviteButton && inviteButton.parentElement !== extra) extra.appendChild(inviteButton);
    if (grantButton && grantButton.parentElement !== extra) extra.appendChild(grantButton);
    if (inviteButton && grantButton && inviteButton.nextElementSibling !== grantButton) {
      extra.insertBefore(inviteButton, grantButton);
    }
  };

  const observer = new MutationObserver(syncPlacement);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  syncPlacement();
}

function installDetailActionUnification() {
  const destructiveLabels = ['删除', '删除草稿', '归档', '撤销', '停用'];

  const actionGroupOf = (root: HTMLElement) => (
    root.matches('.ant-space')
      ? root
      : root.querySelector<HTMLElement>(':scope > .ant-space') || root
  );

  const normalizeActionGroup = (root?: HTMLElement | null) => {
    if (!root) return;
    const group = actionGroupOf(root);
    group.classList.add('entity-detail-actions');

    Array.from(group.children).forEach(child => {
      if (!(child instanceof HTMLElement)) return;
      const button = child.matches('button')
        ? child as HTMLButtonElement
        : child.querySelector<HTMLButtonElement>('button');
      const label = child.textContent?.trim() || '';
      const isPrimary = Boolean(button?.classList.contains('ant-btn-primary'));
      const isDestructive = Boolean(button?.classList.contains('ant-btn-dangerous'))
        || label === '更多'
        || destructiveLabels.some(item => label.includes(item));
      child.style.order = isPrimary ? '30' : isDestructive ? '20' : '10';
    });
  };

  const normalizePageHeaders = () => {
    document.querySelectorAll<HTMLElement>('.entity-page-header__actions')
      .forEach(normalizeActionGroup);
  };

  const normalizeDrawerExtras = () => {
    document.querySelectorAll<HTMLElement>('.ant-drawer .ant-drawer-extra').forEach(extra => {
      if (!extra.querySelector('button')) return;
      extra.closest<HTMLElement>('.ant-drawer')?.classList.add('entity-detail-drawer');
      normalizeActionGroup(extra);
    });
  };

  const normalizeSourceDetail = () => {
    const page = document.querySelector<HTMLElement>('.source-library-query-page');
    const headerCard = page?.querySelector<HTMLElement>('.source-library-stack > .ant-space-item:first-child > .ant-card:first-child');
    const hasDetailTitle = Boolean(headerCard?.querySelector('.source-library-detail-title'));
    const actionGroup = headerCard?.querySelector<HTMLElement>('.ant-card-body .ant-row > .ant-col:last-child > .ant-space');
    if (!headerCard || !hasDetailTitle || !actionGroup) return;

    headerCard.classList.add('entity-detail-source-header');
    normalizeActionGroup(actionGroup);

    let portalHost = actionGroup.querySelector<HTMLElement>(':scope > [data-source-detail-actions="true"]');
    if (!portalHost) {
      portalHost = document.createElement('span');
      portalHost.className = 'ant-space-item entity-detail-source-action-host';
      portalHost.dataset.sourceDetailActions = 'true';
      actionGroup.appendChild(portalHost);
    }
  };

  const normalizeLineageInspector = () => {
    const drawer = document.querySelector<HTMLElement>('.lineage-inspector-drawer');
    const header = drawer?.querySelector<HTMLElement>('.ant-drawer-header');
    const actionGroup = drawer?.querySelector<HTMLElement>('.lineage-inspector-actions');
    if (!drawer || !header || !actionGroup) return;

    let extra = header.querySelector<HTMLElement>(':scope > .ant-drawer-extra');
    if (!extra) {
      extra = document.createElement('div');
      extra.className = 'ant-drawer-extra';
      header.appendChild(extra);
    }
    if (actionGroup.parentElement !== extra) extra.appendChild(actionGroup);
    drawer.classList.add('entity-detail-drawer');
    normalizeActionGroup(extra);
  };

  const syncActions = () => {
    normalizePageHeaders();
    normalizeDrawerExtras();
    normalizeSourceDetail();
    normalizeLineageInspector();
  };

  const observer = new MutationObserver(syncActions);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  syncActions();
}

installSourceRouteHistorySync();
installReviewCenterDefaultPageSize();
installTrackingMoreFilterTextSync();
installResultSortHeaderPlacement();
installMemberListHeaderPlacement();
installDetailActionUnification();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  React.createElement(
    RuntimeErrorBoundary,
    null,
    React.createElement(App)
  )
);
