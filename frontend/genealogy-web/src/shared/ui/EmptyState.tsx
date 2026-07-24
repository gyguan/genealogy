import type { ComponentProps } from 'react';
import { Empty as AntEmpty } from 'antd';

export type EmptyStateProps = ComponentProps<typeof AntEmpty>;

/**
 * Unified business empty-state component.
 *
 * Keep page-level empty states behind this wrapper so default imagery,
 * accessibility and future interaction patterns can evolve consistently.
 */
export function EmptyState({ image = AntEmpty.PRESENTED_IMAGE_SIMPLE, ...props }: EmptyStateProps) {
  return <AntEmpty image={image} {...props} />;
}

EmptyState.PRESENTED_IMAGE_DEFAULT = AntEmpty.PRESENTED_IMAGE_DEFAULT;
EmptyState.PRESENTED_IMAGE_SIMPLE = AntEmpty.PRESENTED_IMAGE_SIMPLE;
