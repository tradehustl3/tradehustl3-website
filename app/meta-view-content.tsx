'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackMetaViewContent, type MetaViewContentName } from './meta-pixel';

const CONTENT_BY_PATH: Record<string, MetaViewContentName> = {
  '/top-10-trades': 'top_10_trades',
  '/book/sample': 'book_sample',
  '/book/sample/read': 'book_sample_reader',
};

export function MetaCampaignViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const contentName = CONTENT_BY_PATH[pathname];
    if (contentName) trackMetaViewContent(contentName);
  }, [pathname]);

  return null;
}
