import { forwardRef, SVGProps } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { NAVIGATION_DOT_RADIUS } from './navigationTokens';

function getIconPaths(icon: IconDefinition) {
  const [width, height, , , pathData] = icon.icon;

  return {
    height,
    paths: Array.isArray(pathData) ? pathData : [pathData],
    width,
  };
}

export function NavigationSvgIcon({
  icon,
  centerX,
  centerY,
  size,
}: {
  icon: IconDefinition;
  centerX: number;
  centerY: number;
  size: number;
}) {
  const { width, height, paths } = getIconPaths(icon);
  const scale = size / Math.max(width, height);
  const renderedWidth = width * scale;
  const renderedHeight = height * scale;

  return (
    <g
      transform={`translate(${centerX - renderedWidth / 2} ${
        centerY - renderedHeight / 2
      }) scale(${scale})`}
    >
      {paths.map((path, index) => (
        <path
          key={index}
          d={path}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={20}
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

export const NavigationDot = forwardRef<
  SVGCircleElement,
  SVGProps<SVGCircleElement>
>(function NavigationDot({ r = NAVIGATION_DOT_RADIUS, ...props }, ref) {
  return <circle ref={ref} r={r} fill="currentColor" {...props} />;
});

export const NavigationRing = forwardRef<
  SVGEllipseElement,
  SVGProps<SVGEllipseElement>
>(function NavigationRing(props, ref) {
  return (
    <ellipse
      ref={ref}
      fill="none"
      vectorEffect="non-scaling-stroke"
      {...props}
    />
  );
});
