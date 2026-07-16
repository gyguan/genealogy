import React from 'react';
import ReactDOM from 'react-dom/client';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
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

const SOURCE_LIST_QUERY_KEYS = [
  'clanId',
  'keyword',
  'sourceType',
  'verificationStatus',
  'privacyLevel',
  'hasAttachment',
  'hasBinding',
  'pageNo',
  'pageSize',
  'sort'
] as const;

function isSourceDetailRoute() {
  const params = new URLSearchParams(window.location.search);
  return params.get('view') === 'sourceLibrary' && Boolean(params.get('sourceId'));
}

function buildSourceListUrl() {
  const current = new URL(window.location.href);
  const next = new URL('/', current.origin);
  next.searchParams.set('view', 'sourceLibrary');
  for (const key of SOURCE_LIST_QUERY_KEYS) {
    const value = current.searchParams.get(key);
    if (value !== null && value !== '') next.searchParams.set(key, value);
  }
  return `${next.pathname}${next.search}`;
}

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

function SourceDetailBackAction() {
  const [visible, setVisible] = React.useState(isSourceDetailRoute);

  React.useEffect(() => {
    const sync = () => setVisible(isSourceDetailRoute());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  if (!visible) return null;

  const backToSourceList = () => {
    window.history.pushState(
      { ...(window.history.state || {}), sourceLibraryScrollY: window.history.state?.sourceLibraryScrollY || 0 },
      '',
      buildSourceListUrl()
    );
    setVisible(false);
  };

  return (
    <Button
      icon={<ArrowLeftOutlined />}
      onClick={backToSourceList}
      style={{ position: 'fixed', top: 72, right: 24, zIndex: 1200, boxShadow: '0 4px 16px rgba(0, 0, 0, 0.16)' }}
    >
      返回来源资料列表
    </Button>
  );
}

installSourceRouteHistorySync();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  React.createElement(
    RuntimeErrorBoundary,
    null,
    React.createElement(
      React.Fragment,
      null,
      React.createElement(App),
      React.createElement(SourceDetailBackAction)
    )
  )
);
