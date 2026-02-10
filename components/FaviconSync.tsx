'use client';

import { useEffect } from 'react';
import { colorStore } from '@/stores/colorStore';

const LOGO_COORDS = [
  [1, 1], [5, 1], [1, 2], [3, 2], [5, 2], [1, 3], [5, 3],
  [1, 4], [3, 4], [5, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5],
];

function faviconDataUrl(color: string) {
  const squares = LOGO_COORDS
    .map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 7"><rect width="7" height="7" fill="#000"/>${squares}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
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
  useEffect(() => {
    const update = () => setFavicon(faviconDataUrl(colorStore.getColor()));
    const rafId = requestAnimationFrame(() => requestAnimationFrame(update));
    const unsub = colorStore.subscribe(update);
    return () => {
      cancelAnimationFrame(rafId);
      unsub();
    };
  }, []);
  return null;
}
