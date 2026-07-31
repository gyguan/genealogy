import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import {
  FieldPortalProvider,
  type FieldPortalResolver
} from '../../shared/ui/Form';
import { StandardMoreFiltersButton } from '../../shared/ui/StandardQueryActions';
import { LineageTreeTabbedPage as LineageTreeProductPageBase } from './LineageTreeTabbedPage';
import './person-centered-direct.css';
import './lineage-more-filters.css';

const LINEAGE_TOOLBAR_FIELD_KIND: Record<string, 'locator'> = {
  图内定位人物: 'locator'
};

type LineageMode = 'person' | 'branch';

function activeMode(root: HTMLElement): LineageMode {
  const activeTab = root.querySelector<HTMLElement>('.lineage-query-tabs .ant-tabs-tab-active');
  return activeTab?.textContent?.includes('支派全局') ? 'branch' : 'person';
}

function applyAdvancedFieldState(root: HTMLElement, expanded: Record<LineageMode, boolean>) {
  const panes = root.querySelectorAll<HTMLElement>('.lineage-query-tabs .ant-tabs-tabpane');
  const modes: LineageMode[] = ['person', 'branch'];

  panes.forEach((pane, paneIndex) => {
    const mode = modes[paneIndex];
    if (!mode) return;
    const fields = pane.querySelectorAll<HTMLElement>('.standard-query-grid > .standard-query-field');
    fields.forEach((field, fieldIndex) => {
      const advanced = fieldIndex >= 4;
      field.classList.toggle('person-archive-advanced-filters', advanced);
      field.classList.toggle('lineage-advanced-filter-field', advanced);
      if (!advanced) return;
      field.id = `lineage-${mode}-advanced-filters`;
      field.hidden = !expanded[mode];
      field.setAttribute('aria-hidden', String(!expanded[mode]));
    });
  });
}

export function LineageTreeProductPage(props: ComponentProps<typeof LineageTreeProductPageBase>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null);
  const [queryActionTarget, setQueryActionTarget] = useState<HTMLElement | null>(null);
  const [mode, setMode] = useState<LineageMode>('person');
  const [advancedExpanded, setAdvancedExpanded] = useState<Record<LineageMode, boolean>>({
    person: false,
    branch: false
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const syncTargets = () => {
      const nextToolbarTarget = root.querySelector<HTMLElement>('.lineage-graph-toolbar');
      const nextQueryActionTarget = root.querySelector<HTMLElement>('.lineage-tabbed-query-card .standard-query-actions');
      const nextMode = activeMode(root);
      setToolbarTarget(previous => previous === nextToolbarTarget ? previous : nextToolbarTarget);
      setQueryActionTarget(previous => previous === nextQueryActionTarget ? previous : nextQueryActionTarget);
      setMode(previous => previous === nextMode ? previous : nextMode);
      applyAdvancedFieldState(root, advancedExpanded);
    };

    syncTargets();
    if (typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver(syncTargets);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [advancedExpanded]);

  const resolveFieldPortal = useCallback<FieldPortalResolver>(({ child }) => {
    const kind = LINEAGE_TOOLBAR_FIELD_KIND[String(child?.props['aria-label'] || '')];
    if (!kind) return null;
    return {
      target: toolbarTarget,
      className: `lineage-graph-toolbar-field lineage-graph-toolbar-field--${kind}`
    };
  }, [toolbarTarget]);

  const expanded = advancedExpanded[mode];

  return (
    <div ref={rootRef} className="lineage-tree-product-page-root">
      <FieldPortalProvider resolve={resolveFieldPortal}>
        <LineageTreeProductPageBase {...props} />
      </FieldPortalProvider>
      {queryActionTarget ? createPortal(
        <StandardMoreFiltersButton
          className="lineage-query-more-filters"
          expanded={expanded}
          aria-controls={`lineage-${mode}-advanced-filters`}
          onClick={() => setAdvancedExpanded(previous => ({ ...previous, [mode]: !previous[mode] }))}
        />,
        queryActionTarget
      ) : null}
    </div>
  );
}
