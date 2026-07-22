export function installLineageToolbarPlacement() {
  const syncPlacement = () => {
    document.querySelectorAll<HTMLElement>('.lineage-result-pane').forEach(pane => {
      const resultToolbar = pane.querySelector<HTMLElement>('.lineage-result-toolbar--double-card');
      const graphToolbar = pane.querySelector<HTMLElement>('.lineage-graph-toolbar');
      if (!resultToolbar || !graphToolbar || resultToolbar.parentElement === graphToolbar) return;

      const actionGroup = graphToolbar.querySelector<HTMLElement>(':scope > .ant-space');
      graphToolbar.insertBefore(resultToolbar, actionGroup || graphToolbar.firstChild);
      resultToolbar.dataset.graphToolbarPlaced = 'true';
    });
  };

  const observer = new MutationObserver(syncPlacement);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  syncPlacement();
}
