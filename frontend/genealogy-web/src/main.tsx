import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles.css';
import './experience.css';
import './mvp1-wizard.css';
import './lineage-tree.css';
import './compact-ui.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
