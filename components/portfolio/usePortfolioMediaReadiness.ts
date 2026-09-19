'use client';

import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import {
  isBrowserPageActive,
  waitForPageActivity,
  withPageActivityTimeout,
} from '@/components/portfolio/runtime/pageActivity';

export type PortfolioMediaElement = HTMLImageElement | HTMLVideoElement;

export type ImagePreloadProgress = {
  loaded: number;
  failed: number;
  total: number;
};

const MEDIA_ATTEMPT_TIMEOUT_MS = 8000;
const MEDIA_ATTEMPT_COUNT = 4;
const MEDIA_RETRY_DELAYS_MS = [250, 500, 1000];

function delay(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}

function waitForImage(image: HTMLImageElement) {
  const source = image.dataset.portfolioImageSrc;
  if (source && !image.getAttribute('src')) image.src = source;
  image.loading = 'eager';
  image.decoding = 'async';

  if (image.complete) {
    return image.naturalWidth > 0
      ? image.decode()
      : Promise.reject(new Error('Portfolio image failed to load.'));
  }

  return new Promise<void>((resolve, reject) => {
    const finish = () => {
      image.removeEventListener('load', handleLoad);
      image.removeEventListener('error', handleError);
    };
    const handleLoad = () => {
      finish();
      image.decode().then(resolve, reject);
    };
    const handleError = () => {
      finish();
      reject(new Error('Portfolio image failed to load.'));
    };

    image.addEventListener('load', handleLoad, { once: true });
    image.addEventListener('error', handleError, { once: true });
  });
}

function waitForVideo(video: HTMLVideoElement) {
  const source = video.dataset.portfolioVideoSrc;
  if (source && !video.getAttribute('src')) video.src = source;
  video.preload = 'auto';

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const finish = () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };
    const handleLoadedData = () => {
      finish();
      resolve();
    };
    const handleError = () => {
      finish();
      reject(new Error('Portfolio video failed to load.'));
    };

    video.addEventListener('loadeddata', handleLoadedData, { once: true });
    video.addEventListener('error', handleError, { once: true });
    video.load();
  });
}

function cloneMediaElement(
  element: PortfolioMediaElement,
  imageSizes?: string,
) {
  if (element instanceof HTMLImageElement) {
    const image = new window.Image();
    image.alt = '';
    image.crossOrigin = element.crossOrigin;
    image.referrerPolicy = element.referrerPolicy;
    image.sizes = imageSizes ?? element.sizes;
    image.srcset = element.srcset;
    image.src = element.src || element.dataset.portfolioImageSrc || '';
    return image;
  }

  const video = document.createElement('video');
  video.crossOrigin = element.crossOrigin;
  video.muted = true;
  video.playsInline = true;
  video.src =
    element.currentSrc ||
    element.src ||
    element.dataset.portfolioVideoSrc ||
    '';
  return video;
}

export function usePortfolioMediaReadiness() {
  const elementsRef = useRef(new Map<string, Set<PortfolioMediaElement>>());
  const elementWaitersRef = useRef(
    new Map<string, Set<(element: PortfolioMediaElement) => void>>(),
  );
  const readyKeysRef = useRef(new Set<string>());
  const inFlightRef = useRef(new Map<string, Promise<void>>());
  const mountedRef = useRef(true);
  const [imageProgress, setImageProgress] = useState<ImagePreloadProgress>({
    loaded: 0,
    failed: 0,
    total: 0,
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      elementWaitersRef.current.clear();
    };
  }, []);

  const registerMediaElement = useCallback(function registerMediaElement(
    key: string,
    element: PortfolioMediaElement | null,
  ) {
    const elements = elementsRef.current.get(key) ?? new Set();

    Array.from(elements).forEach((registeredElement) => {
      if (!registeredElement.isConnected) {
        elements.delete(registeredElement);
      }
    });

    if (!element) {
      if (elements.size === 0) {
        elementsRef.current.delete(key);
      }
      return;
    }

    elements.add(element);
    elementsRef.current.set(key, elements);
    elementWaitersRef.current.get(key)?.forEach((resolve) => resolve(element));
    elementWaitersRef.current.delete(key);
  }, []);

  const waitForRegisteredElement = useCallback(
    function waitForRegisteredElement(key: string) {
      const registeredElements = elementsRef.current.get(key);
      const existingElement = registeredElements
        ? Array.from(registeredElements).find((element) => element.isConnected)
        : undefined;

      if (existingElement) {
        return Promise.resolve(existingElement);
      }

      return new Promise<PortfolioMediaElement>((resolve) => {
        const waiters = elementWaitersRef.current.get(key) ?? new Set();
        waiters.add(resolve);
        elementWaitersRef.current.set(key, waiters);
      });
    },
    [],
  );

  const loadMediaKey = useCallback(
    async function loadMediaKey(key: string) {
      let lastError = new Error(`Portfolio media did not load: ${key}`);

      for (let attempt = 0; attempt < MEDIA_ATTEMPT_COUNT; attempt += 1) {
        await waitForPageActivity();

        if (attempt > 0) {
          await delay(MEDIA_RETRY_DELAYS_MS[attempt - 1]);
          await waitForPageActivity();
        }

        try {
          const registeredElement = await withPageActivityTimeout(
            waitForRegisteredElement(key),
            MEDIA_ATTEMPT_TIMEOUT_MS,
            () => new Error(`Timed out loading portfolio media: ${key}`),
          );
          const loadingElement =
            attempt === 0 && !key.startsWith('modal:')
              ? registeredElement
              : cloneMediaElement(
                  registeredElement,
                  key.startsWith('modal:') ? '92vw' : undefined,
                );
          const loadPromise =
            loadingElement instanceof HTMLImageElement
              ? waitForImage(loadingElement)
              : waitForVideo(loadingElement);

          await withPageActivityTimeout(
            loadPromise,
            MEDIA_ATTEMPT_TIMEOUT_MS,
            () => new Error(`Timed out loading portfolio media: ${key}`),
          );
          return;
        } catch (error) {
          if (!isBrowserPageActive()) {
            await waitForPageActivity();
            attempt -= 1;
            continue;
          }

          lastError =
            error instanceof Error
              ? error
              : new Error(`Portfolio media failed: ${key}`);
        }
      }

      throw lastError;
    },
    [waitForRegisteredElement],
  );

  const ensureMediaReady = useCallback(
    function ensureMediaReady(keys: string | string[]) {
      const requestedKeys = Array.from(
        new Set(Array.isArray(keys) ? keys : [keys]),
      ).filter(Boolean);

      return Promise.all(
        requestedKeys.map((key) => {
          if (readyKeysRef.current.has(key)) {
            return Promise.resolve();
          }

          const existingPromise = inFlightRef.current.get(key);

          if (existingPromise) {
            return existingPromise;
          }

          const promise = loadMediaKey(key)
            .then(() => {
              readyKeysRef.current.add(key);
            })
            .finally(() => {
              inFlightRef.current.delete(key);
            });

          inFlightRef.current.set(key, promise);
          return promise;
        }),
      ).then(() => undefined);
    },
    [loadMediaKey],
  );

  const preloadQueue = useCallback(
    async function preloadQueue(keys: string[], concurrency = 2) {
      const uniqueKeys = Array.from(new Set(keys)).filter(Boolean);
      const queue = uniqueKeys.filter((key) => !readyKeysRef.current.has(key));
      const progress = {
        loaded: uniqueKeys.length - queue.length,
        failed: 0,
        total: uniqueKeys.length,
      };
      const publishProgress = () => {
        if (mountedRef.current) {
          startTransition(() => setImageProgress({ ...progress }));
        }
      };
      publishProgress();
      let cursor = 0;

      const worker = async () => {
        while (mountedRef.current && cursor < queue.length) {
          const key = queue[cursor];
          cursor += 1;
          try {
            await ensureMediaReady(key);
            progress.loaded += 1;
          } catch {
            // A failed background image must not stop the remaining queue or
            // prevent browsing. Opening-media failures are handled by reveal.
            progress.failed += 1;
          }
          publishProgress();
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(concurrency, queue.length) }, worker),
      );
    },
    [ensureMediaReady],
  );

  return {
    imageProgress,
    registerMediaElement,
    ensureMediaReady,
    preloadQueue,
  };
}
