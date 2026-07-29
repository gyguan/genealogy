import React from 'react';
import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';
import { App } from './app/App';
import { RuntimeErrorBoundary } from './shared/ui/RuntimeErrorBoundary';
import './styles/index.css';

const applicationRoot = document.getElementById('root') as HTMLElement;
applicationRoot.dataset.genealogyApp = 'true';

ReactDOM.createRoot(applicationRoot).render(
  React.createElement(
    RuntimeErrorBoundary,
    null,
    React.createElement(App)
  )
);
