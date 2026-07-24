import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { Alert, Button, Popover, Space, Spin, Tag, Tooltip } from 'antd';
import { FullscreenExitOutlined, FullscreenOutlined, ReloadOutlined } from '@ant-design/icons';
import type {
  TreeEdgeResponse,
  TreeGraphResponse,
  TreeNodeResponse,
  TreeRelationScope
} from '../../shared/api/generated/tree-types';
import { buildLineageLayout } from './lineageGraphModel';
import { edgeIndicators, edgeVisual, nodeIndicators } from './lineageSemanticsModel';
import { dataStatusText } from './treeDisplayModel';

import { PageFeedback } from '../../shared/ui/Feedback';

import { EmptyState } from '../../shared/ui/EmptyState';

type Props = {
  graph: TreeGraphResponse | null;
  loading?: boolean;
  emptyText: string;
  activeNodeId?: string | null;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
  highlightedNodeIds?: string[];
  highlightedEdgeIds?: string[];
  focusNodeId?: string | null;
  autoFocus?: 'fit' | 'active' | 'none';
  relationScopes?: TreeRelationScope[];
  onSelectNode: (node: TreeNodeResponse) => void;
  onSelectEdge?: (edge: TreeEdgeResponse) => void;
  onSetCenter?: (node: TreeNodeResponse) => void;
};

type Viewport = { x: number; y: number; scale: number };
type DragState = { pointerId: number; x: number; y: number; originX: number; originY: number };

const INITIAL_VIEWPORT: Viewport = { x: 48, y: 48, scale: 1 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function noticeType(code: string): 'info' | 'warning' | 'error' {
  if (code.includes('cycle') || code.includes('limit') || code.includes('truncat')) return 'warning';
  if (code.includes('error')) return 'error';
  return 'info';
}

function nodeSubtitle(node: TreeNodeResponse) {
  if (node.visibility === 'masked') return '隐私信息已保护';
  const generation = node.generationNo ? `${node.generationNo}世` : '世次未维护';
  const word = node.generationWord ? `${node.generationWord}字辈` : '字辈未维护';
  return `${generation} · ${word}`;
}

export function LineageGraphCanvas({
  graph,
  loading = false,
  emptyText,
  activeNodeId,
  selectedNodeId,
  selectedEdgeId,
  highlightedNodeIds = [],
  highlightedEdgeIds = [],
  focusNodeId,
  autoFocus = 'none',
  relationScopes = ['blood', 'ritual', 'marriage'],
  onSelectNode,
  onSelectEdge,
  onSetCenter
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const markerId = useId().replace(/:/g, '');
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [fullScreen, setFullScreen] = useState(false);

  const layout = useMemo(
    () => graph ? buildLineageLayout(graph, collapsedNodeIds) : null,
    [graph, collapsedNodeIds]
  );
  const highlightedNodeSet = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds]);
  const highlightedEdgeSet = useMemo(() => new Set(highlightedEdgeIds), [highlightedEdgeIds]);
  const hasPath = highlightedNodeSet.size > 1 || highlightedEdgeSet.size > 0;
  const overviewMode = Boolean(layout && (viewport.scale < 0.58 || (layout.nodes.length > 220 && viewport.scale < 0.9)));

  function fitToCanvas() {
    if (!layout || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 48;
    const scale = clamp(Math.min(
      (rect.width - padding * 2) / Math.max(layout.width, 1),
      (rect.height - padding * 2) / Math.max(layout.height, 1)
    ), 0.25, 1.35);
    setViewport({
      scale,
      x: (rect.width - layout.width * scale) / 2,
      y: (rect.height - layout.height * scale) / 2
    });
  }

  function centerNode(nodeId?: string | null) {
    if (!layout || !containerRef.current) return;
    const targetId = nodeId || activeNodeId || graph?.rootNodeId;
    const target = layout.nodes.find(item => item.id === targetId) || layout.nodes[0];
    if (!target) return;
    const rect = containerRef.current.getBoundingClientRect();
    setViewport(previous => {
      const scale = Math.max(previous.scale, 0.72);
      return {
        scale,
        x: rect.width / 2 - (target.x + target.width / 2) * scale,
        y: rect.height / 2 - (target.y + target.height / 2) * scale
      };
    });
  }

  function resetViewport() {
    if (autoFocus === 'fit') fitToCanvas();
    else if (autoFocus === 'active') centerNode(activeNodeId || graph?.rootNodeId);
    else setViewport(INITIAL_VIEWPORT);
  }

  useEffect(() => {
    setCollapsedNodeIds(new Set());
    const frame = window.requestAnimationFrame(resetViewport);
    return () => window.cancelAnimationFrame(frame);
  }, [graph?.rootNodeId, graph?.meta.generatedAt, autoFocus]);

  useEffect(() => {
    if (!focusNodeId) return;
    const frame = window.requestAnimationFrame(() => centerNode(focusNodeId));
    return () => window.cancelAnimationFrame(frame);
  }, [focusNodeId]);

  useEffect(() => {
    if (!containerRef.current || !layout) return;
    const observer = new ResizeObserver(() => {
      if (autoFocus === 'fit') fitToCanvas();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [layout?.width, layout?.height, autoFocus]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(resetViewport);
    return () => window.cancelAnimationFrame(frame);
  }, [fullScreen]);

  function zoom(factor: number) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pointerX = rect.width / 2;
    const pointerY = rect.height / 2;
    setViewport(previous => {
      const scale = clamp(previous.scale * factor, 0.25, 2.6);
      const ratio = scale / previous.scale;
      return {
        scale,
        x: pointerX - (pointerX - previous.x) * ratio,
        y: pointerY - (pointerY - previous.y) * ratio
      };
    });
  }

  function handleWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.88 : 1.12;
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    setViewport(previous => {
      const scale = clamp(previous.scale * factor, 0.25, 2.6);
      const ratio = scale / previous.scale;
      return {
        scale,
        x: pointerX - (pointerX - previous.x) * ratio,
        y: pointerY - (pointerY - previous.y) * ratio
      };
    });
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originX: viewport.x,
      originY: viewport.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setViewport(previous => ({
      ...previous,
      x: drag.originX + event.clientX - drag.x,
      y: drag.originY + event.clientY - drag.y
    }));
  }

  function handlePointerEnd(event: ReactPointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function toggleCollapsed(nodeId: string) {
    setCollapsedNodeIds(previous => {
      const next = new Set(previous);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  if (!graph || !layout?.nodes.length) {
    return (
      <div className="lineage-graph-empty" aria-busy={loading}>
        {loading ? <Spin /> : <EmptyState description={emptyText} />}
      </div>
    );
  }

  const noticeContent = (
    <Space direction="vertical" size={8} className="lineage-graph-notice-popover">
      {layout.notices.map(notice => (
        <PageFeedback
          key={notice.code}
          tone={noticeType(notice.code)}
          title={`${notice.message}${notice.count > 1 ? `（${notice.count}）` : ''}`}
        />
      ))}
    </Space>
  );

  return (
    <div className={`lineage-graph-shell ${fullScreen ? 'is-fullscreen' : ''}`}>
      <div className="lineage-graph-toolbar">
        <Space wrap size={6}>
          <Tooltip title="放大"><Button aria-label="放大" size="small" onClick={() => zoom(1.2)}>＋</Button></Tooltip>
          <Tooltip title="缩小"><Button aria-label="缩小" size="small" onClick={() => zoom(0.82)}>－</Button></Tooltip>
          <Button size="small" onClick={fitToCanvas}>适配画布</Button>
          <Button size="small" onClick={() => centerNode(activeNodeId || graph.rootNodeId)}>居中人物</Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={resetViewport}>重置视图</Button>
          {collapsedNodeIds.size ? <Button size="small" onClick={() => setCollapsedNodeIds(new Set())}>全部展开</Button> : null}
          <Button size="small" icon={fullScreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} onClick={() => setFullScreen(value => !value)}>{fullScreen ? '退出全屏' : '全屏查看'}</Button>
          <Tag>{Math.round(viewport.scale * 100)}%</Tag>
          {hasPath ? <Tag color="processing">已高亮关系路径</Tag> : null}
        </Space>
        <span className="lineage-graph-help">滚轮缩放 · 拖动画布 · 单击查看详情 · 双击设为中心</span>
      </div>

      {layout.notices.length ? (
        <div className="lineage-graph-notices">
          <PageFeedback
            tone={noticeType(layout.notices[0].code)}
            title={`${layout.notices[0].message}${layout.notices[0].count > 1 ? `（${layout.notices[0].count}）` : ''}`}
            action={layout.notices.length > 1 ? <Popover trigger="click" placement="bottomRight" content={noticeContent}><Button type="link" size="small">查看全部 {layout.notices.length} 项</Button></Popover> : null}
          />
        </div>
      ) : null}

      <div className="lineage-graph-viewport" ref={containerRef}>
        <svg
          className={`lineage-graph-svg ${overviewMode ? 'is-overview' : ''}`}
          role="img"
          aria-label="关系边驱动的世系拓扑图"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <defs>
            <marker id={`${markerId}-blood`} className="lineage-marker lineage-marker--blood" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 0 L 8 4 L 0 8 z" />
            </marker>
            <marker id={`${markerId}-ritual`} className="lineage-marker lineage-marker--ritual" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 1 L 8 4.5 L 0 8" fill="none" />
            </marker>
          </defs>
          <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
            {layout.edges.map(item => {
              const visual = edgeVisual(item.edge);
              const markerEnd = visual.marker === 'none' ? undefined : `url(#${markerId}-${visual.marker === 'ritual' ? 'ritual' : 'blood'})`;
              const indicators = edgeIndicators(item.edge);
              const primaryIndicator = indicators[0];
              const pathActive = highlightedEdgeSet.has(item.id);
              const selected = item.id === selectedEdgeId;
              const dimmed = hasPath && !pathActive;
              return (
                <g
                  key={item.id}
                  className={`lineage-graph-edge lineage-graph-edge--${visual.tone} ${pathActive ? 'is-path' : ''} ${selected ? 'is-selected' : ''} ${dimmed ? 'is-dimmed' : ''}`}
                  role={onSelectEdge ? 'button' : undefined}
                  tabIndex={onSelectEdge ? 0 : undefined}
                  aria-label={`${visual.description}，点击查看关系详情`}
                  onClick={event => { event.stopPropagation(); onSelectEdge?.(item.edge); }}
                  onKeyDown={event => {
                    if (onSelectEdge && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      onSelectEdge(item.edge);
                    }
                  }}
                >
                  <title>{visual.description}{indicators.length ? `，${indicators.map(indicator => indicator.label).join('、')}` : ''}</title>
                  <path d={item.path} markerEnd={markerEnd} />
                  <text className="lineage-graph-edge-label" x={item.labelX} y={item.labelY}>{visual.label}</text>
                  {primaryIndicator ? (
                    <g className={`lineage-graph-edge-indicator indicator-${primaryIndicator.tone}`} transform={`translate(${item.labelX + 18} ${item.labelY - 4})`}>
                      <circle r="8" />
                      <text y="3" textAnchor="middle">{primaryIndicator.glyph}</text>
                    </g>
                  ) : null}
                </g>
              );
            })}

            {layout.nodes.map(item => {
              const active = item.id === activeNodeId || item.id === graph.rootNodeId;
              const selected = item.id === selectedNodeId;
              const pathActive = highlightedNodeSet.has(item.id);
              const dimmed = hasPath && !pathActive;
              const indicators = nodeIndicators(item.node);
              const primaryIndicator = indicators[0];
              const statusText = primaryIndicator?.label || (item.isolated ? '孤立人物' : active ? '当前定位' : dataStatusText(item.node.dataStatus || 'official'));
              return (
                <g
                  key={item.id}
                  className={`lineage-graph-node ${active ? 'is-active' : ''} ${selected ? 'is-selected' : ''} ${pathActive ? 'is-path' : ''} ${dimmed ? 'is-dimmed' : ''} ${item.node.visibility === 'masked' ? 'is-masked' : ''} ${item.isolated ? 'is-isolated' : ''} ${primaryIndicator ? `has-indicator indicator-${primaryIndicator.tone}` : ''}`}
                  transform={`translate(${item.x} ${item.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`查看人物 ${item.node.displayName}${primaryIndicator ? `，${primaryIndicator.label}` : ''}`}
                  onClick={event => { event.stopPropagation(); onSelectNode(item.node); }}
                  onDoubleClick={event => { event.stopPropagation(); onSetCenter?.(item.node); }}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectNode(item.node);
                    }
                  }}
                >
                  <rect width={item.width} height={item.height} rx="12" />
                  <circle cx="28" cy="30" r="17" />
                  <text className="lineage-graph-avatar-text" x="28" y="35" textAnchor="middle">{item.node.displayName.slice(0, 1) || '谱'}</text>
                  <text className="lineage-graph-node-name" x="54" y="27">{item.node.displayName.slice(0, 10)}</text>
                  <text className="lineage-graph-node-meta" x="54" y="48">{nodeSubtitle(item.node)}</text>
                  <text className="lineage-graph-node-branch" x="16" y="78">{item.node.visibility === 'masked' ? '支派信息受保护' : item.node.branchName || '支派未标注'}</text>
                  <text className="lineage-graph-node-status" x="16" y="100">{statusText}</text>
                  {primaryIndicator && item.node.visibility !== 'masked' ? (
                    <g className={`lineage-graph-node-indicator indicator-${primaryIndicator.tone}`} transform={`translate(${item.width - 18} 18)`}>
                      <title>{indicators.map(indicator => indicator.label).join('、')}</title>
                      <circle r="10" />
                      <text y="4" textAnchor="middle">{primaryIndicator.glyph}</text>
                    </g>
                  ) : null}
                  {item.hasChildren ? (
                    <g
                      className="lineage-graph-collapse"
                      transform={`translate(${item.width - 16} ${item.height - 14})`}
                      role="button"
                      tabIndex={0}
                      aria-label={item.collapsed ? '展开后代' : '折叠后代'}
                      onClick={event => { event.stopPropagation(); toggleCollapsed(item.id); }}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleCollapsed(item.id);
                        }
                      }}
                    >
                      <circle r="11" />
                      <text y="4" textAnchor="middle">{item.collapsed ? '+' : '−'}</text>
                    </g>
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="lineage-graph-legend" aria-label="世系图谱图例">
        {relationScopes.includes('blood') ? <span><i className="legend-blood" />实线箭头：血缘亲子</span> : null}
        {relationScopes.includes('ritual') ? <span><i className="legend-ritual" />虚线空心箭头：承嗣宗法</span> : null}
        {relationScopes.includes('marriage') ? <span><i className="legend-marriage" />无箭头实线：婚配</span> : null}
        {relationScopes.includes('status') ? <span><i className="legend-status" />点划线：状态关系</span> : null}
        <span><b className="legend-risk">证</b>徽标：证据、审核或修谱提示</span>
      </div>
    </div>
  );
}
