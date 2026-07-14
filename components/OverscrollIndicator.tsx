'use client';

import {
  CSSProperties,
  forwardRef,
  HTMLAttributes,
  ReactNode,
  UIEventHandler,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

type OverscrollIndicatorProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onScroll'
> & {
  children: ReactNode;
  contentClassName?: string;
  indicatorColor?: string;
  indicatorHeight?: CSSProperties['height'];
  onScroll?: UIEventHandler<HTMLDivElement>;
  wrapperClassName?: string;
};

type IndicatorVisibility = {
  top: boolean;
  bottom: boolean;
};

const EDGE_EPSILON_PX = 1;

export const OverscrollIndicator = forwardRef<
  HTMLDivElement,
  OverscrollIndicatorProps
>(function OverscrollIndicator(
  {
    children,
    className = '',
    contentClassName = '',
    indicatorColor = 'rgb(0 0 0)',
    indicatorHeight = 50,
    onScroll,
    wrapperClassName = '',
    ...viewportProps
  },
  forwardedRef
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const visibilityRef = useRef<IndicatorVisibility>({
    top: false,
    bottom: false,
  });
  const [visibility, setVisibility] = useState(visibilityRef.current);

  const setViewportRef = useCallback(
    (node: HTMLDivElement | null) => {
      viewportRef.current = node;

      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef]
  );

  const updateIndicators = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const maximumScrollTop = Math.max(
      0,
      viewport.scrollHeight - viewport.clientHeight
    );
    const hasOverflow = maximumScrollTop > EDGE_EPSILON_PX;
    const nextVisibility = {
      top: hasOverflow && viewport.scrollTop > EDGE_EPSILON_PX,
      bottom:
        hasOverflow &&
        viewport.scrollTop < maximumScrollTop - EDGE_EPSILON_PX,
    };
    const currentVisibility = visibilityRef.current;

    if (
      currentVisibility.top === nextVisibility.top &&
      currentVisibility.bottom === nextVisibility.bottom
    ) {
      return;
    }

    visibilityRef.current = nextVisibility;
    setVisibility(nextVisibility);
  }, []);

  const handleScroll = useCallback<UIEventHandler<HTMLDivElement>>(
    (event) => {
      updateIndicators();
      onScroll?.(event);
    },
    [onScroll, updateIndicators]
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;

    if (!viewport || !content) {
      return;
    }

    updateIndicators();

    const resizeObserver = new ResizeObserver(updateIndicators);
    resizeObserver.observe(viewport);
    resizeObserver.observe(content);

    return () => resizeObserver.disconnect();
  }, [updateIndicators]);

  const transparentIndicatorColor = `color-mix(in srgb, ${indicatorColor} 0%, transparent)`;
  const indicatorStyle = { height: indicatorHeight };

  return (
    <div
      className={`relative min-h-0 min-w-0 ${wrapperClassName}`}
      data-overscroll-indicator
    >
      <div
        {...viewportProps}
        ref={setViewportRef}
        className={`h-full w-full overflow-y-auto ${className}`}
        onScroll={handleScroll}
      >
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      </div>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
          visibility.top ? 'opacity-100' : 'opacity-0'
        }`}
        data-overscroll-indicator-top
        style={{
          ...indicatorStyle,
          backgroundImage: `linear-gradient(to bottom, ${indicatorColor}, ${transparentIndicatorColor})`,
        }}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
          visibility.bottom ? 'opacity-100' : 'opacity-0'
        }`}
        data-overscroll-indicator-bottom
        style={{
          ...indicatorStyle,
          backgroundImage: `linear-gradient(to top, ${indicatorColor}, ${transparentIndicatorColor})`,
        }}
      />
    </div>
  );
});
