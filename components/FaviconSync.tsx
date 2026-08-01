'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getProjectColorBySlug } from '@/components/portfolio/domain/portfolioColors';
import { TOP_SCREEN_COLOR } from '@/components/portfolio/domain/theme';
import { faviconDataUrl } from '@/lib/favicon';
import { colorStore } from '@/stores/colorStore';

function getRouteColor(pathname: string) {
  const [rootSegment, projectSlug] = pathname.split('/').filter(Boolean);

  if (rootSegment !== 'work') {
    return undefined;
  }

  return projectSlug
    ? (getProjectColorBySlug(projectSlug) ?? TOP_SCREEN_COLOR)
    : TOP_SCREEN_COLOR;
}

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

  useEffect(() => {
    const routeColor = getRouteColor(pathname);
    const update = () =>
      setFavicon(faviconDataUrl(routeColor ?? colorStore.getColor()));
    let secondRafId: number | undefined;

    update();
    const firstRafId = requestAnimationFrame(() => {
      secondRafId = requestAnimationFrame(update);
    });
    const unsubscribe =
      routeColor === undefined ? colorStore.subscribe(update) : undefined;

    return () => {
      cancelAnimationFrame(firstRafId);
      if (secondRafId !== undefined) {
        cancelAnimationFrame(secondRafId);
      }
      unsubscribe?.();
    };
  }, [pathname]);

  return null;
}
