import { useEffect, useLayoutEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { ReviewCenterPage as ReviewCenterPageContent } from './ReviewCenterPageContent';
import { hasValidReviewPageSize, withDefaultReviewPageSize } from './reviewCenterPagination';
import './reviewCenterLayout.css';

type Props = ComponentProps<typeof ReviewCenterPageContent>;

const REVIEW_CENTER_BODY_CLASS = 'genealogy-review-center-active';

export function ReviewCenterPage(props: Props) {
  const [ready, setReady] = useState(() => hasValidReviewPageSize(window.location.search));

  useEffect(() => {
    document.body.classList.add(REVIEW_CENTER_BODY_CLASS);
    return () => document.body.classList.remove(REVIEW_CENTER_BODY_CLASS);
  }, []);

  useLayoutEffect(() => {
    if (ready) return;
    const nextUrl = withDefaultReviewPageSize(window.location.href);
    window.history.replaceState(window.history.state, '', nextUrl);
    setReady(true);
  }, [ready]);

  return ready ? <ReviewCenterPageContent {...props} /> : null;
}
