'use client';

import { useEffect } from 'react';
import { faviconDataUrl } from '@/lib/favicon';

function setFavicon(href: string) {
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
  if (links.length === 0) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = href;
    document.head.appendChild(link);
    return;
  }
  for (const link of Array.from(links)) {
    if (link.href !== href) {
      link.href = href;
    }
  }
}

export function FaviconSync() {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const theme = root.dataset.portfolioTheme === 'light' ? 'light' : 'dark';
      setFavicon(faviconDataUrl(theme));
    };
    const observer = new MutationObserver(update);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-portfolio-theme'],
    });
    // Production metadata can arrive after hydration or route navigation.
    observer.observe(document.head, { childList: true });

    update();

    return () => observer.disconnect();
  }, []);

  return null;
}
