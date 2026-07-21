import { useLayoutEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { ReviewCenterPage as ReviewCenterPageContent } from './ReviewCenterPageContent';
import { hasValidReviewPageSize, withDefaultReviewPageSize } from './reviewCenterPagination';

type Props = ComponentProps<typeof ReviewCenterPageContent>;

export function ReviewCenterPage(props: Props) {
  const [ready, setReady] = useState(() => hasValidReviewPageSize(window.location.search));

  useLayoutEffect(() => {
    if (ready) return;
    const nextUrl = withDefaultReviewPageSize(window.location.href);
    window.history.replaceState(window.history.state, '', nextUrl);
    setReady(true);
  }, [ready]);

  return ready ? <ReviewCenterPageContent {...props} /> : null;
}
