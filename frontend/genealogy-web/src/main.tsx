import React from 'react';
import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';
import { App } from './app/App';
import './styles.css';
import './experience.css';
import './mvp1-wizard.css';
import './mvp1-wizard-simplified.css';
import './lineage-tree.css';
import './compact-ui.css';
import './audit-trace.css';
import './antd-bridge.css';
import './person-archive-tweaks.css';
import './home-dashboard-overrides.css';
import './mvp1-wizard-enhancements';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
