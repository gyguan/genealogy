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

installSourceRouteHistorySync();
installTrackingMoreFilterTextSync();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  React.createElement(
    RuntimeErrorBoundary,
    null,
    React.createElement(App)
  )
);