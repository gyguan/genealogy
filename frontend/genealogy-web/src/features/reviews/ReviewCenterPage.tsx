import { useEffect, useLayoutEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import { Button, Tooltip } from 'antd';
import { ReviewCenterPage as ReviewCenterPageContent } from './ReviewCenterPageContent';
import { hasValidReviewPageSize, withDefaultReviewPageSize } from './reviewCenterPagination';
import './reviewCenterLayout.css';

type Props = ComponentProps<typeof ReviewCenterPageContent>;

const REVIEW_CENTER_BODY_CLASS = 'genealogy-review-center-active';
const RESULT_EXTRA_SELECTOR = '.review-center-page .review-result-card .query-result-outer-card__extra';

export function ReviewCenterPage(props: Props) {
  const [ready, setReady] = useState(() => hasValidReviewPageSize(window.location.search));
  const [resultExtraHost, setResultExtraHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    document.body.classList.add(REVIEW_CENTER_BODY_CLASS);

    const resolveResultExtraHost = () => {
      const nextHost = document.querySelector<HTMLElement>(RESULT_EXTRA_SELECTOR);
      setResultExtraHost(current => current === nextHost ? current : nextHost);
    };

    resolveResultExtraHost();
    const observer = new MutationObserver(resolveResultExtraHost);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.body.classList.remove(REVIEW_CENTER_BODY_CLASS);
    };
  }, []);

  useLayoutEffect(() => {
    if (ready) return;
    const nextUrl = withDefaultReviewPageSize(window.location.href);
    window.history.replaceState(window.history.state, '', nextUrl);
    setReady(true);
  }, [ready]);

  return (
    <>
      {ready ? <ReviewCenterPageContent {...props} /> : null}
      {resultExtraHost ? createPortal(
        <Tooltip title="质量检查能力将在 #786～#788 完成契约、后端和前端接入">
          <Button className="review-quality-check-placeholder" disabled>触发质量检查</Button>
        </Tooltip>,
        resultExtraHost
      ) : null}
    </>
  );
}
