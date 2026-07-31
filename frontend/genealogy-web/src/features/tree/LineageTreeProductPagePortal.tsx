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
type AdvancedState = Record<LineageMode, boolean>;

function activeMode(root: HTMLElement): LineageMode {
  const activeTab = root.querySelector<HTMLElement>('.lineage-query-tabs .ant-tabs-tab-active');
  return activeTab?.textContent?.includes('支派全局') ? 'branch' : 'person';
}

function queryGridMode(grid: HTMLElement): LineageMode {
  return grid.querySelector('[aria-label="包含下级支派"]') ? 'branch' : 'person';
}

function directQueryFields(grid: HTMLElement) {
  return Array.from(grid.children).filter((child): child is HTMLElement =>
    child instanceof HTMLElement && child.dataset.queryFieldRole === 'field'
  );
}

/**
 * The lineage query forms are currently rendered inside Ant Design Tabs. Apply the
 * query contract to every mounted tab pane instead of relying on one particular
 * Tabs DOM hierarchy or stylesheet load order.
 */
function syncQueryLayouts(root: HTMLElement, expandedByMode: AdvancedState) {
  const compact = window.matchMedia('(max-width: 767px)').matches;
  const grids = root.querySelectorAll<HTMLElement>(
    '.lineage-tabbed-query-card [data-query-grid-role="fields"]'
  );

  grids.forEach(grid => {
    const gridMode = queryGridMode(grid);
    const columns = compact ? 'minmax(0, 1fr)' : 'repeat(4, minmax(0, 1fr))';

    if (grid.style.getPropertyValue('grid-template-columns') !== columns
      || grid.style.getPropertyPriority('grid-template-columns') !== 'important') {
      grid.style.setProperty('grid-template-columns', columns, 'important');
    }
    grid.dataset.lineageQueryMode = gridMode;

    const advancedField = directQueryFields(grid)[4];
    if (!advancedField) return;

    const expanded = expandedByMode[gridMode];
    const hidden = !expanded;
    const display = expanded ? 'grid' : 'none';

    advancedField.id = `lineage-${gridMode}-advanced-filters`;
    advancedField.dataset.lineageAdvancedField = 'true';
    if (advancedField.hidden !== hidden) advancedField.hidden = hidden;
    if (advancedField.getAttribute('aria-hidden') !== String(hidden)) {
      advancedField.setAttribute('aria-hidden', String(hidden));
    }
    if (advancedField.style.getPropertyValue('display') !== display
      || advancedField.style.getPropertyPriority('display') !== 'important') {
      advancedField.style.setProperty('display', display, 'important');
    }
  });
}

export function LineageTreeProductPage(props: ComponentProps<typeof LineageTreeProductPageBase>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null);
  const [queryActionTarget, setQueryActionTarget] = useState<HTMLElement | null>(null);
  const [mode, setMode] = useState<LineageMode>('person');
  const [advancedExpanded, setAdvancedExpanded] = useState<AdvancedState>({
    person: false,
    branch: false
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const syncPage = () => {
      const nextToolbarTarget = root.querySelector<HTMLElement>('.lineage-graph-toolbar');
      const nextQueryActionTarget = root.querySelector<HTMLElement>(
        '.lineage-tabbed-query-card .standard-query-actions'
      );
      const nextMode = activeMode(root);

      setToolbarTarget(previous => previous === nextToolbarTarget ? previous : nextToolbarTarget);
      setQueryActionTarget(previous => previous === nextQueryActionTarget ? previous : nextQueryActionTarget);
      setMode(previous => previous === nextMode ? previous : nextMode);
      syncQueryLayouts(root, advancedExpanded);
    };

    syncPage();

    const observer = typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(syncPage);
    observer?.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
    window.addEventListener('resize', syncPage);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncPage);
    };
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
    <div
      ref={rootRef}
      className="lineage-tree-product-page-root"
      data-lineage-mode={mode}
      data-lineage-advanced-expanded={expanded ? 'true' : 'false'}
    >
      <FieldPortalProvider resolve={resolveFieldPortal}>
        <LineageTreeProductPageBase {...props} />
      </FieldPortalProvider>
      {queryActionTarget ? createPortal(
        <StandardMoreFiltersButton
          className="lineage-query-more-filters"
          expanded={expanded}
          aria-controls={`lineage-${mode}-advanced-filters`}
          onClick={() => setAdvancedExpanded(previous => ({
            ...previous,
            [mode]: !previous[mode]
          }))}
        />,
        queryActionTarget
      ) : null}
    </div>
  );
}
