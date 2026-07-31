import { useLayoutEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { PageState } from '../../shared/ui/Feedback';
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

  useLayoutEffect(() => {
    if (!ready) return;

    const removeRootSpaceStyle = () => {
      const rootSpace = document.querySelector<HTMLElement>('.review-center-page > .ant-space-vertical');
      rootSpace?.removeAttribute('style');
      return rootSpace;
    };

    const rootSpace = removeRootSpaceStyle();
    if (!rootSpace) return;

    const observer = new MutationObserver(() => {
      if (rootSpace.hasAttribute('style')) rootSpace.removeAttribute('style');
    });
    observer.observe(rootSpace, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [ready]);

  return ready
    ? <ReviewCenterPageContent {...props} />
    : <PageState kind="loading" title="正在准备审核中心" description="正在恢复分页与查询状态。" />;
}
