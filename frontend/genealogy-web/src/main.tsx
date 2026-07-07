import React from 'react';
import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';
import { App } from './app/App';
import { GenerationStepListsPanel } from './features/mvp1/GenerationStepListsPanel';
import { RelationshipStepPanel } from './features/mvp1/RelationshipStepPanel';
import { ReviewObjectQueryPanel } from './features/mvp1/ReviewObjectQueryPanel';
import { StepDraftReviewPanel } from './features/mvp1/StepDraftReviewPanel';
import { RuntimeErrorBoundary } from './shared/ui/RuntimeErrorBoundary';
import './styles.css';
import './experience.css';
import './mvp1-wizard.css';
import './mvp1-wizard-simplified.css';
import './mvp1-source-step.css';
import './mvp1-tree-step.css';
import './mvp1-person-step.css';
import './review-object-query-panel.css';
import './step-draft-review-panel.css';
import './lineage-tree.css';
import './compact-ui.css';
import './audit-trace.css';
import './antd-bridge.css';
import './person-archive-tweaks.css';
import './person-archive-source.css';
import './runtime-error.css';
import './home-dashboard-overrides.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  React.createElement(
    RuntimeErrorBoundary,
    null,
    React.createElement(
      React.Fragment,
      null,
      React.createElement(App),
      React.createElement(ReviewObjectQueryPanel),
      React.createElement(RelationshipStepPanel),
      React.createElement(StepDraftReviewPanel),
      React.createElement(GenerationStepListsPanel)
    )
  )
);
