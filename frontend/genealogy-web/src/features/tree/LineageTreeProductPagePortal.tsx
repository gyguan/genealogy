import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  FieldPortalProvider,
  type FieldPortalResolver
} from '../../shared/ui/Form';
import { LineageTreeTabbedPage as LineageTreeProductPageBase } from './LineageTreeTabbedPage';
import './person-centered-direct.css';

const LINEAGE_TOOLBAR_FIELD_KIND: Record<string, 'locator'> = {
  图内定位人物: 'locator'
};

export function LineageTreeProductPage(props: ComponentProps<typeof LineageTreeProductPageBase>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const syncTarget = () => {
      const nextTarget = root.querySelector<HTMLElement>('.lineage-graph-toolbar');
      setToolbarTarget(previous => previous === nextTarget ? previous : nextTarget);
    };

    syncTarget();
    if (typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver(syncTarget);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const resolveFieldPortal = useCallback<FieldPortalResolver>(({ child }) => {
    const kind = LINEAGE_TOOLBAR_FIELD_KIND[String(child?.props['aria-label'] || '')];
    if (!kind) return null;
    return {
      target: toolbarTarget,
      className: `lineage-graph-toolbar-field lineage-graph-toolbar-field--${kind}`
    };
  }, [toolbarTarget]);

  return (
    <div ref={rootRef} className="lineage-tree-product-page-root">
      <FieldPortalProvider resolve={resolveFieldPortal}>
        <LineageTreeProductPageBase {...props} />
      </FieldPortalProvider>
    </div>
  );
}
