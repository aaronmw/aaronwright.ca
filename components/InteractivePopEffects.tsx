'use client';

import { useEffect } from 'react';

const INTERACTIVE_SELECTOR = [
  'button:not(:disabled)',
  'a[href]',
  'input:not(:disabled):is([type="button"], [type="submit"], [type="reset"], [type="image"])',
  '[role="button"]:not([aria-disabled="true"])',
  '[role="link"]:not([aria-disabled="true"])',
  '[data-interactive-pop="true"]',
].join(',');

function getInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  const interactive = target.closest<HTMLElement>(INTERACTIVE_SELECTOR);

  if (!interactive || interactive.closest('[data-interactive-pop="off"]')) {
    return null;
  }

  return interactive;
}

function getRenderedScale(element: HTMLElement) {
  const scale = getComputedStyle(element).scale;
  return scale === 'none' ? '1' : scale;
}

export function InteractivePopEffects() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new WeakMap<HTMLElement, Animation>();
    const activeAnimations = new Set<Animation>();
    const pointerTargets = new Map<number, HTMLElement>();
    const releasedAt = new WeakMap<HTMLElement, number>();
    let keyboardTarget: HTMLElement | null = null;

    const cancelAnimation = (element: HTMLElement) => {
      const animation = animations.get(element);

      if (!animation) {
        return;
      }

      animations.delete(element);
      activeAnimations.delete(animation);
      animation.cancel();
    };

    const runAnimation = (
      element: HTMLElement,
      keyframes: Keyframe[],
      options: KeyframeAnimationOptions,
      persist = false
    ) => {
      if (reducedMotion.matches) {
        cancelAnimation(element);
        return;
      }

      const currentScale = getRenderedScale(element);
      cancelAnimation(element);
      const animation = element.animate(
        [{ scale: currentScale }, ...keyframes],
        options
      );

      animations.set(element, animation);
      activeAnimations.add(animation);

      if (persist) {
        return;
      }

      animation.addEventListener('finish', () => {
        if (animations.get(element) !== animation) {
          return;
        }

        animations.delete(element);
        activeAnimations.delete(animation);
        animation.cancel();
      });
    };

    const depress = (element: HTMLElement) => {
      runAnimation(
        element,
        [{ scale: '0.95' }],
        {
          duration: 90,
          easing: 'cubic-bezier(0.4, 0, 1, 1)',
          fill: 'forwards',
        },
        true
      );
    };

    const release = (element: HTMLElement) => {
      runAnimation(
        element,
        [
          {
            scale: '1.1',
            offset: 0.42,
            easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
          },
          {
            scale: '0.98',
            offset: 0.72,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          },
          { scale: '1', offset: 1 },
        ],
        {
          duration: 360,
          fill: 'forwards',
        }
      );
    };

    const settle = (element: HTMLElement) => {
      runAnimation(element, [{ scale: '1' }], {
        duration: 120,
        easing: 'ease-out',
        fill: 'forwards',
      });
    };

    const markReleased = (element: HTMLElement) => {
      releasedAt.set(element, performance.now());
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) {
        return;
      }

      const target = getInteractiveTarget(event.target);

      if (!target) {
        return;
      }

      pointerTargets.set(event.pointerId, target);
      depress(target);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const target = pointerTargets.get(event.pointerId);

      if (!target) {
        return;
      }

      pointerTargets.delete(event.pointerId);
      const releaseTarget = document.elementFromPoint(event.clientX, event.clientY);

      if (releaseTarget && target.contains(releaseTarget)) {
        release(target);
        markReleased(target);
      } else {
        settle(target);
      }
    };

    const handlePointerCancel = (event: PointerEvent) => {
      const target = pointerTargets.get(event.pointerId);

      if (!target) {
        return;
      }

      pointerTargets.delete(event.pointerId);
      settle(target);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        (event.key !== 'Enter' && event.code !== 'Space')
      ) {
        return;
      }

      const target = getInteractiveTarget(event.target);

      if (!target) {
        return;
      }

      keyboardTarget = target;
      depress(target);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (
        !keyboardTarget ||
        (event.key !== 'Enter' && event.code !== 'Space')
      ) {
        return;
      }

      const target = keyboardTarget;
      keyboardTarget = null;
      release(target);
      markReleased(target);
    };

    const handleClick = (event: MouseEvent) => {
      const target = getInteractiveTarget(event.target);
      const millisecondsSinceRelease = target
        ? performance.now() - (releasedAt.get(target) ?? -Infinity)
        : Infinity;

      if (
        !target ||
        target === keyboardTarget ||
        millisecondsSinceRelease < 500
      ) {
        return;
      }

      depress(target);
      requestAnimationFrame(() => release(target));
    };

    const handleReducedMotionChange = () => {
      if (!reducedMotion.matches) {
        return;
      }

      activeAnimations.forEach((animation) => animation.cancel());
      activeAnimations.clear();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    document.addEventListener('pointercancel', handlePointerCancel, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('click', handleClick, true);
    reducedMotion.addEventListener('change', handleReducedMotionChange);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
      document.removeEventListener('pointercancel', handlePointerCancel, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
      document.removeEventListener('click', handleClick, true);
      reducedMotion.removeEventListener('change', handleReducedMotionChange);
      activeAnimations.forEach((animation) => animation.cancel());
      activeAnimations.clear();
    };
  }, []);

  return null;
}
