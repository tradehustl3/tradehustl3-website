'use client';

import { useEffect } from 'react';
import { trackMetaViewContent, type MetaViewContentName } from './meta-pixel';

export function MetaViewContent({ contentName }: { contentName: MetaViewContentName }) {
  useEffect(() => {
    trackMetaViewContent(contentName);
  }, [contentName]);

  return null;
}
