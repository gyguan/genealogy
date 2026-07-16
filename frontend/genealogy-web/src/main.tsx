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
import './antd-bridge.css';
import './person-archive-tweaks.css';
import './person-archive-source.css';
import './person-edit-page.css';
import './person-detail-page.css';
import './runtime-error.css';
import './guidance-cleanup.css';
import './lineage-workbench-overrides.css';
import './member-permission-page.css';

function installSourceRouteHistorySync() {
  const historyWithMarker = window.history as History & { __sourceRouteSyncInstalled?: boolean };
  if (historyWithMarker.__sourceRouteSyncInstalled) return;
  historyWithMarker.__sourceRouteSyncInstalled = true;

  const wrapHistoryMethod = (method: 'pushState' | 'replaceState') => {
    const original = window.history[method].bind(window.history);
    window.history[method] = ((data: unknown, unused: string, url?: string | URL | null) => {
      const previousSourceId = new URL(window.location.href).searchParams.get('sourceId');
      original(data, unused, url);
      const nextSourceId = new URL(window.location.href).searchParams.get('sourceId');
      if (previousSourceId !== nextSourceId) {
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
      }
    }) as History[typeof method];
  };

  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');
}

installSourceRouteHistorySync();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  React.createElement(
    RuntimeErrorBoundary,
    null,
    React.createElement(App)
  )
);
