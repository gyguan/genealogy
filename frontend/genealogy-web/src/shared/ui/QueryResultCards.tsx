import { Children, cloneElement, isValidElement } from 'react';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import type { ButtonProps, CardProps } from 'antd';
import { StandardPageActions } from './StandardPagePatterns';
import './query-result-cards.css';

type QueryResultProps = Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> & {
  title?: ReactNode;
  total?: number;
  totalSuffix?: string;
  pageAction?: ReactNode;
  toolbar?: ReactNode;
  extra?: ReactNode;
  resultExtra?: ReactNode;
  size?: CardProps['size'];
  children: ReactNode;
};

type ActionElementProps = Pick<ButtonProps, 'type' | 'icon'> & {
  children?: ReactNode;
  menu?: unknown;
  overlay?: unknown;
  'data-result-action'?: string;
};

type ActionSplit = { pageAction?: ReactNode; resultActions?: ReactNode };

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (!isValidElement(node)) return '';
  return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
}

function normalizePageAction(node: ReactNode): ReactNode {
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<ActionElementProps>;
  const label = textOf(element.props.children).trim();
  const normalizedLabel = label.replace(/^(新增|新建)/, '创建');
  const createAction = normalizedLabel.startsWith('创建');
  if (!normalizedLabel || normalizedLabel === label && (!createAction || element.props.icon)) return element;
  return cloneElement(element, {
    icon: createAction && !element.props.icon ? <PlusOutlined /> : element.props.icon,
    'data-page-action': createAction ? 'create' : undefined
  } as ActionElementProps, normalizedLabel);
}

function normalizeResultActions(node: ReactNode): ReactNode {
  if (node === null || node === undefined || typeof node === 'boolean') return node;
  if (Array.isArray(node)) return node.map(normalizeResultActions);
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<ActionElementProps>;
  if (element.props.menu || element.props.overlay || !('children' in element.props)) return element;
  const children = Children.map(element.props.children, normalizeResultActions);
  return cloneElement(element, element.props.type === 'primary' ? { type: 'default', 'data-result-action': 'secondary' } : undefined, children);
}

function splitFirstPrimaryAction(node: ReactNode): ActionSplit {
  let pageAction: ReactNode;
  function visit(value: ReactNode): ReactNode {
    if (pageAction || value === null || value === undefined || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.map(visit).filter(item => item !== null);
    if (!isValidElement(value)) return value;
    const element = value as ReactElement<ActionElementProps>;
    if (element.props.type === 'primary') {
      pageAction = normalizePageAction(element);
      return null;
    }
    if (element.props.menu || element.props.overlay || !('children' in element.props)) return element;
    const children = Children.map(element.props.children, child => visit(child));
    if (Children.toArray(children).length === 0) return null;
    return cloneElement(element, undefined, children);
  }
  return { pageAction, resultActions: normalizeResultActions(visit(node)) };
}

function titleFromAction(action: ReactNode) {
  const label = textOf(action).trim().replace(/^(创建|新增|新建|邀请|发起)/, '');
  const known: Record<string, string> = {
    人物: '人物列表',
    来源: '来源资料',
    文化资料: '文化资料',
    迁徙事件: '迁徙事件',
    文化场所: '文化场所',
    修谱: '修谱任务',
    成员: '成员列表',
    导入: '导入任务'
  };
  if (known[label]) return known[label];
  return label && label.length <= 8 ? `${label}列表` : '';
}

function titleFromClassName(className: string) {
  const mappings: Array<[RegExp, string]> = [
    [/person-archive/, '人物列表'],
    [/source-library/, '来源资料'],
    [/migration/, '迁徙事件'],
    [/culture-site|site-result/, '文化场所'],
    [/culture/, '文化资料'],
    [/review/, '审核任务'],
    [/workbench|editing-workspace/, '修谱任务'],
    [/member/, '成员列表'],
    [/audit|log-/, '审计记录'],
    [/lineage|tree-/, '世系结果'],
    [/import/, '导入任务']
  ];
  return mappings.find(([pattern]) => pattern.test(className))?.[1] || '';
}

export function QueryResultCard({
  title,
  total,
  totalSuffix = '条',
  children,
  className = '',
  pageAction,
  toolbar,
  extra,
  resultExtra,
  size = 'small',
  ...sectionProps
}: QueryResultProps) {
  const split = splitFirstPrimaryAction(extra);
  const resolvedPageAction = normalizePageAction(pageAction || split.pageAction);
  const resolvedToolbar = normalizeResultActions(toolbar || split.resultActions);
  const resolvedTitle = title || titleFromAction(resolvedPageAction) || titleFromClassName(className) || '查询结果';
  return <>
    {resolvedPageAction ? <StandardPageActions>{resolvedPageAction}</StandardPageActions> : null}
    <section
      {...sectionProps}
      className={`query-result-outer-card ${className}`.trim()}
      data-query-result-role="outer"
      data-query-result-size={size}
    >
      <div className="query-result-outer-card__header">
        <div className="query-result-card__title">
          <Typography.Text strong>{resolvedTitle}</Typography.Text>
          {typeof total === 'number' ? <Typography.Text type="secondary">（共 {total} {totalSuffix}）</Typography.Text> : null}
        </div>
        {resultExtra || resolvedToolbar ? (
          <div className="query-result-outer-card__actions" aria-label="结果操作">
            {resultExtra ? <div className="query-result-outer-card__result-extra" data-result-toolbar-group="view">{resultExtra}</div> : null}
            {resolvedToolbar ? <div className="query-result-outer-card__extra" data-result-toolbar-group="actions">{resolvedToolbar}</div> : null}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  </>;
}
