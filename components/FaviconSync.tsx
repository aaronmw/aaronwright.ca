'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { faviconDataUrl } from '@/lib/favicon';

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function FaviconSync() {
  const pathname = usePathname();

  // The cleanup cancels both RAFs and disconnects the theme observer.
  // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
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
    let secondRafId: number | undefined;

    update();
    // Reapply after Next.js refreshes the document metadata on navigation.
    const firstRafId = requestAnimationFrame(() => {
      secondRafId = requestAnimationFrame(update);
    });

    return () => {
      cancelAnimationFrame(firstRafId);
      if (secondRafId !== undefined) {
        cancelAnimationFrame(secondRafId);
      }
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
