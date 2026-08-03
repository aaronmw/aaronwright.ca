import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faArrowUp,
} from '@fortawesome/free-solid-svg-icons';
import { gsap } from 'gsap';

const NAVIGATION_ACTIVE_SCALE = 1.1;

export type PortfolioHelperMessageKind = 'navigation' | 'close' | null;

function KeyboardKey({
  icon,
  label,
  ariaLabel,
}: {
  icon?: IconProp;
  label?: string;
  ariaLabel?: string;
}) {
  return (
    <kbd
      aria-label={ariaLabel}
      className="relative mx-0.5 inline-grid h-[1.3125rem] min-w-[1.3125rem] place-items-center rounded-sm bg-[var(--portfolio-keycap-shadow)] px-[0.1875rem] pb-[0.1875rem] pt-[0.09375rem] align-middle"
    >
      <span
        className={`grid h-[0.9375rem] min-w-[0.9375rem] -translate-y-px place-items-center rounded-xs bg-[var(--portfolio-inverse-surface)] text-[0.5rem] font-black leading-none text-[var(--portfolio-inverse-ink)] ${
          label ? 'px-[0.28125rem]' : 'px-0'
        }`}
        aria-hidden={ariaLabel ? true : undefined}
      >
        {icon ? (
          <FontAwesomeIcon icon={icon} />
        ) : (
          <span className="translate-y-px">{label}</span>
        )}
      </span>
    </kbd>
  );
}

export function PortfolioHelperMessage({
  kind,
}: {
  kind: PortfolioHelperMessageKind;
}) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const hasInitializedMotionRef = useRef(false);
  const [renderedKind, setRenderedKind] = useState<
    Exclude<PortfolioHelperMessageKind, null>
  >(kind ?? 'navigation');
  const isVisible = kind !== null && renderedKind === kind;

  useEffect(() => {
    if (!kind || kind === renderedKind) {
      return;
    }

    const frame = requestAnimationFrame(() => setRenderedKind(kind));

    return () => cancelAnimationFrame(frame);
  }, [kind, renderedKind]);

  useLayoutEffect(() => {
    const bubble = bubbleRef.current;

    if (!bubble) {
      return;
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const y = isVisible || reducedMotion ? 0 : 64;

    gsap.killTweensOf(bubble);

    if (!hasInitializedMotionRef.current) {
      hasInitializedMotionRef.current = true;
      gsap.set(bubble, { y, opacity: isVisible ? 1 : 0 });
      return;
    }

    gsap.to(bubble, {
      y,
      opacity: isVisible ? 1 : 0,
      duration: reducedMotion ? 0 : 0.3,
      ease: isVisible ? 'expo.out' : 'power2.in',
      overwrite: 'auto',
    });

    return () => gsap.killTweensOf(bubble);
  }, [isVisible]);

  return (
    <div
      ref={bubbleRef}
      role="status"
      aria-live="polite"
      aria-hidden={isVisible ? undefined : true}
      className="pointer-events-none fixed bottom-5 right-5 z-[110] max-w-[calc(100vw-2.5rem)] translate-y-16 rounded-full bg-[var(--portfolio-helper-surface)] px-4 py-2 text-sm font-normal leading-tight text-[var(--portfolio-ink)] opacity-0 backdrop-blur-md motion-reduce:translate-y-0"
      style={{
        right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
        bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      {renderedKind === 'navigation' ? (
        <span className="leading-6">
          Use <KeyboardKey icon={faArrowLeft} ariaLabel="left arrow" />
          <KeyboardKey icon={faArrowRight} ariaLabel="right arrow" />
          <KeyboardKey icon={faArrowUp} ariaLabel="up arrow" />
          <KeyboardKey icon={faArrowDown} ariaLabel="down arrow" />
          , or <KeyboardKey label="1" />,
          <KeyboardKey label="2" />, ... <KeyboardKey label="0" /> to navigate
          sections
        </span>
      ) : (
        <span className="leading-6">
          Press <KeyboardKey label="ESC" /> to close
        </span>
      )}
    </div>
  );
}

export function NavigationActiveRing({
  color,
  visualScale = 1,
  elementRef,
  previewElementRef,
  className,
  style,
  dataAttributes,
  previewDataAttributes,
  tooltip,
}: {
  color: string;
  visualScale?: number;
  elementRef?: (node: HTMLDivElement | null) => void;
  previewElementRef?: (node: HTMLDivElement | null) => void;
  className: string;
  style?: CSSProperties;
  dataAttributes?: Record<`data-${string}`, string>;
  previewDataAttributes?: Record<`data-${string}`, string>;
  tooltip?: {
    id: string;
    side: 'left' | 'right';
    elementRef: (node: HTMLDivElement | null) => void;
    textElementRef: (node: HTMLSpanElement | null) => void;
  };
}) {
  return (
    <div
      ref={elementRef}
      {...dataAttributes}
      className={`pointer-events-none size-11 overflow-visible ${className}`}
      style={{ color, ...style }}
      aria-hidden={tooltip ? undefined : true}
    >
      <div
        ref={previewElementRef}
        {...previewDataAttributes}
        data-navigation-ring-pop-layer="true"
        className="relative size-11"
      >
        <svg
          className="absolute inset-0 size-11 overflow-visible"
          viewBox="0 0 44 44"
          style={
            visualScale === 1
              ? undefined
              : {
                  transform: `scale(${visualScale})`,
                  transformBox: 'fill-box',
                  transformOrigin: '50% 50%',
                }
          }
          aria-hidden="true"
        >
          <circle
            cx="22"
            cy="22"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
          />
        </svg>
        {tooltip ? (
          <div
            ref={tooltip.elementRef}
            id={tooltip.id}
            role="tooltip"
            className={`invisible absolute top-1/2 z-30 -translate-y-1/2 whitespace-nowrap px-3 py-2 text-[0.6875rem] font-black uppercase leading-none tracking-[0.24em] opacity-0 ${
              tooltip.side === 'left'
                ? 'left-full ml-3 -translate-x-1'
                : 'right-full mr-3 translate-x-1'
            }`}
            style={{ backgroundColor: 'currentColor' }}
          >
            <span
              ref={tooltip.textElementRef}
              className="text-[var(--portfolio-inverse-ink)]"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CircularIconButton({
  icon,
  buttonRef,
  iconRef,
  iconClassName,
  iconStrokeWidth,
  visualRef,
  secondaryVisual,
  ring = false,
  className,
  ...buttonProps
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: IconProp;
  buttonRef?: (node: HTMLButtonElement | null) => void;
  iconRef?: (node: SVGSVGElement | null) => void;
  iconClassName: string;
  iconStrokeWidth?: number;
  visualRef?: (node: HTMLSpanElement | null) => void;
  secondaryVisual?: ReactNode;
  ring?: boolean;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`group/icon-button relative flex items-center justify-center rounded-full outline-none ${className ?? ''}`}
      {...buttonProps}
    >
      {ring ? (
        <NavigationActiveRing
          color="inherit"
          visualScale={NAVIGATION_ACTIVE_SCALE}
          className="absolute inset-0 z-0"
        />
      ) : null}
      {visualRef || secondaryVisual ? (
        <span ref={visualRef} className="relative z-10 block h-full w-full">
          <span className="absolute inset-0 flex items-center justify-center">
            <FontAwesomeIcon
              ref={iconRef}
              icon={icon}
              className={`${iconClassName} portfolio-icon-shadow`}
              stroke={iconStrokeWidth ? 'currentColor' : undefined}
              strokeWidth={iconStrokeWidth}
              strokeLinejoin={iconStrokeWidth ? 'round' : undefined}
              aria-hidden="true"
            />
          </span>
          {secondaryVisual ? (
            <span className="absolute inset-0 flex items-center justify-center">
              {secondaryVisual}
            </span>
          ) : null}
        </span>
      ) : (
        <FontAwesomeIcon
          ref={iconRef}
          icon={icon}
          className={`relative z-10 ${iconClassName} portfolio-icon-shadow`}
          stroke={iconStrokeWidth ? 'currentColor' : undefined}
          strokeWidth={iconStrokeWidth}
          strokeLinejoin={iconStrokeWidth ? 'round' : undefined}
          aria-hidden="true"
        />
      )}
    </button>
  );
}
