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
import './mvp1-source-step.css';
import './mvp1-tree-step.css';
import './mvp1-person-step.css';
import './lineage-tree.css';
import './compact-ui.css';
import './audit-trace.css';
import './antd-bridge.css';
import './person-archive-tweaks.css';
import './person-archive-source.css';
import './runtime-error.css';
import './home-dashboard-overrides.css';
import './guidance-cleanup.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  React.createElement(
    RuntimeErrorBoundary,
    null,
    React.createElement(App)
  )
);
