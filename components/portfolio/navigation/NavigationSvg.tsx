import { forwardRef, SVGProps } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { NAVIGATION_DOT_RADIUS } from './navigationTokens';

type NavigationSquareProps = Omit<
  SVGProps<SVGRectElement>,
  'height' | 'width' | 'x' | 'y'
> & {
  centerX?: number;
  centerY?: number;
  size?: number;
};

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

export const NavigationDot = forwardRef<SVGRectElement, NavigationSquareProps>(
  function NavigationDot(
    { centerX = 0, centerY = 0, size = NAVIGATION_DOT_RADIUS * 2, ...props },
    ref,
  ) {
    return (
      <rect
        ref={ref}
        x={centerX - size / 2}
        y={centerY - size / 2}
        width={size}
        height={size}
        fill="currentColor"
        shapeRendering="crispEdges"
        {...props}
      />
    );
  },
);

export const NavigationRing = forwardRef<
  SVGRectElement,
  SVGProps<SVGRectElement>
>(function NavigationRing(props, ref) {
  const { style, ...restProps } = props;

  return (
    <rect
      ref={ref}
      fill="none"
      shapeRendering="crispEdges"
      strokeLinejoin="miter"
      vectorEffect="non-scaling-stroke"
      {...restProps}
      style={{ strokeWidth: 'var(--logo-stroke-width)', ...style }}
    />
  );
});
