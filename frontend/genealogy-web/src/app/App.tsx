import { useEffect, useRef, useState } from 'react';
import { Space, Spin } from 'antd';
import { apiClient } from '../shared/api/client';
import { EMPTY_ENTITY_NAVIGATION_GUARD, entityNavigationDecision, entityNavigationPrompt } from '../shared/navigation/entityNavigationGuard';
import type { EntityNavigationGuardState } from '../shared/navigation/entityNavigationGuard';
import { subscribeNavigation } from '../shared/navigation/navigationEvents';
import { navigateToView } from '../shared/navigation/urlState';
import { loadFeatureStyles } from '../shared/styles/loadFeatureStyles';
import { feedback } from '../shared/ui/OperationFeedback';
import { confirmAction, InlineFeedback } from '../shared/ui/Feedback';
import { AuthPage } from '../features/auth/AuthPage';
import { PersonDetailPage } from '../features/persons/PersonDetailPage';
import { navigateBackFromPersonDetail, readPersonDetailRoute } from '../features/persons/personDetailNavigation';
import type { PersonDetailRoute } from '../features/persons/personDetailNavigation';
import { PersonEditPage } from '../features/persons/PersonEditPage';
import { navigateBackFromPersonEdit, readPersonEditRoute } from '../features/persons/personEditNavigation';
import type { PersonEditRoute } from '../features/persons/personEditNavigation';
import { AppProviders } from './AppProviders';
import { AuthenticatedShell } from './AuthenticatedShell';
import { getModule, isModuleKey } from './moduleRegistry';
import type { ModuleKey } from './moduleRegistry';

type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

function readViewFromUrl(): ModuleKey {
  if (readPersonEditRoute() || readPersonDetailRoute()) return 'personArchive';
  const requested = new URLSearchParams(window.location.search).get('view');
  return isModuleKey(requested) ? requested : 'home';
}

function writeViewToUrl(key: ModuleKey, mode: 'push' | 'replace' = 'push') {
  navigateToView(key, window.location.href, { mode });
}

export function App() { return <AppProviders><AppShell /></AppProviders>; }

function AppShell() {
  const [active, setActive] = useState<ModuleKey>(readViewFromUrl);
  const [personDetailRoute, setPersonDetailRoute] = useState<PersonDetailRoute | null>(readPersonDetailRoute);
  const [personEditRoute, setPersonEditRoute] = useState<PersonEditRoute | null>(readPersonEditRoute);
  const [pageEntryVersion, setPageEntryVersion] = useState(0);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const navigationGuardRef = useRef<EntityNavigationGuardState>(EMPTY_ENTITY_NAVIGATION_GUARD);
  const guardedUrlRef = useRef('');

  function syncRouteFromUrl() {
    setPersonDetailRoute(readPersonDetailRoute());
    setPersonEditRoute(readPersonEditRoute());
    setActive(readViewFromUrl());
    setPageEntryVersion(previous => previous + 1);
  }

  function setNavigationGuard(state: EntityNavigationGuardState) {
    navigationGuardRef.current = state;
    if (state.dirty || state.busy) guardedUrlRef.current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  function requestNavigation(action: () => void) {
    const decision = entityNavigationDecision(navigationGuardRef.current);
    if (decision === 'block_busy') {
      feedback.from({ message: '人物档案正在提交，请稍后再离开。' }, true);
      return;
    }
    if (decision === 'confirm_dirty') {
      confirmAction({
        title: '确认离开当前页面？',
        content: entityNavigationPrompt(),
        okText: '离开页面',
        cancelText: '继续编辑',
        okButtonProps: { danger: true },
        onOk: () => { navigationGuardRef.current = EMPTY_ENTITY_NAVIGATION_GUARD; action(); }
      });
      return;
    }
    navigationGuardRef.current = EMPTY_ENTITY_NAVIGATION_GUARD;
    action();
  }

  function enterPage(key: ModuleKey) { requestNavigation(() => writeViewToUrl(key)); }

  function logout() {
    apiClient.post('/auth/logout').catch(() => undefined).finally(() => {
      apiClient.clearToken(); setAuthStatus('anonymous'); feedback.from({ message: '已退出登录' });
    });
  }

  useEffect(() => {
    let activeRequest = true;
    apiClient.get('/auth/me').then(() => { if (activeRequest) setAuthStatus('authenticated'); }).catch(() => { if (activeRequest) setAuthStatus('anonymous'); });
    const onUnauthorized = () => { apiClient.clearToken(); setAuthStatus('anonymous'); };
    window.addEventListener('genealogy:unauthorized', onUnauthorized);
    return () => { activeRequest = false; window.removeEventListener('genealogy:unauthorized', onUnauthorized); };
  }, []);

  useEffect(() => {
    const onUnhandled = (event: PromiseRejectionEvent) => { event.preventDefault(); feedback.from({ message: event.reason?.message || '操作失败，请检查输入后重试' }, true); };
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => window.removeEventListener('unhandledrejection', onUnhandled);
  }, []);

  useEffect(() => subscribeNavigation(() => {
    const targetUrl = window.location.href;
    if (entityNavigationDecision(navigationGuardRef.current) !== 'allow') {
      window.history.replaceState(window.history.state, '', guardedUrlRef.current);
      requestNavigation(() => { window.history.pushState(window.history.state, '', targetUrl); syncRouteFromUrl(); });
      return;
    }
    navigationGuardRef.current = EMPTY_ENTITY_NAVIGATION_GUARD;
    syncRouteFromUrl();
  }), []);

  useEffect(() => { void loadFeatureStyles(active).catch(error => console.error(`Failed to load feature styles for ${active}`, error)); }, [active]);

  if (authStatus === 'checking') return <div className="commercial-auth-shell" aria-label="正在检查登录状态"><Space direction="vertical" align="center" size={16}><Spin size="large" /><InlineFeedback tone="info" title="正在安全验证登录状态…" /></Space></div>;
  if (authStatus === 'anonymous') return <AuthPage onChanged={() => setAuthStatus('authenticated')} standalone />;

  const activeModule = getModule(active);
  const specialRoute = Boolean(personDetailRoute || personEditRoute);
  const page = personEditRoute ? <PersonEditPage personId={personEditRoute.personId} onCancel={navigateBackFromPersonEdit} onNavigationGuardChange={setNavigationGuard} /> : personDetailRoute ? <PersonDetailPage personId={personDetailRoute.personId} onBack={navigateBackFromPersonDetail} /> : activeModule.render(enterPage);
  const routeKey = personEditRoute?.personId ? `edit-${personEditRoute.personId}` : personDetailRoute?.personId ? `detail-${personDetailRoute.personId}` : 'list';

  return <AuthenticatedShell active={active} pageKey={`${active}-${routeKey}-${pageEntryVersion}`} page={page} headerActions={specialRoute ? null : activeModule.renderHeaderActions?.()} onNavigate={enterPage} onLogout={logout} />;
}
