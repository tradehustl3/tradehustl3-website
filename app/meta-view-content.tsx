'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackMetaViewContent, type MetaViewContentName } from './meta-pixel';
import { META_PIXEL_QUEUE_READY } from './deferred-meta-pixel';

const CONTENT_BY_PATH: Record<string, MetaViewContentName> = {
  '/top-10-trades': 'top_10_trades',
  '/book/sample': 'book_sample',
  '/book/sample/read': 'book_sample_reader',
};

export function MetaCampaignViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const contentName = CONTENT_BY_PATH[pathname];
    if (!contentName) return;
    const track = () => {
      if (window.location.pathname === pathname) trackMetaViewContent(contentName);
    };
    window.addEventListener(META_PIXEL_QUEUE_READY, track);
    track();
    return () => window.removeEventListener(META_PIXEL_QUEUE_READY, track);
  }, [pathname]);

  return null;
}
