import {
  NAVIGATION_ACTIVE_SCALE,
  NAVIGATION_RING_DIAMETER,
  NAVIGATION_SLIDE_STEP,
  SECTION_NAVIGATION_CENTERED_STEP,
} from './navigationTokens';

export type SectionNavigationSide = 'left' | 'right';

type HslColor = {
  alpha: number;
  hue: number;
  lightness: number;
  saturation: number;
};

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

export function getCoordinateForPosition(centers: number[], position: number) {
  if (centers.length === 0) {
    return 0;
  }

  const boundedPosition = clamp(position, 0, centers.length - 1);
  const lowerIndex = Math.floor(boundedPosition);
  const upperIndex = Math.min(centers.length - 1, Math.ceil(boundedPosition));

  return interpolate(
    centers[lowerIndex],
    centers[upperIndex],
    boundedPosition - lowerIndex,
  );
}

export function getPositionForCoordinate(
  centers: number[],
  coordinate: number,
) {
  if (centers.length === 0 || coordinate <= centers[0]) {
    return 0;
  }

  const lastIndex = centers.length - 1;

  if (coordinate >= centers[lastIndex]) {
    return lastIndex;
  }

  for (let index = 1; index < centers.length; index += 1) {
    const nextCenter = centers[index];

    if (coordinate > nextCenter) {
      continue;
    }

    const previousCenter = centers[index - 1];
    return (
      index -
      1 +
      (coordinate - previousCenter) / (nextCenter - previousCenter)
    );
  }

  return lastIndex;
}

function parseHslColor(color: string): HslColor | null {
  const match = color.match(
    /^hsla?\(\s*(-?(?:\d+(?:\.\d+)?|\.\d+))(?:deg)?[\s,]+(-?(?:\d+(?:\.\d+)?|\.\d+))%[\s,]+(-?(?:\d+(?:\.\d+)?|\.\d+))%(?:\s*(?:\/|,)\s*((?:-?(?:\d+(?:\.\d+)?|\.\d+))%?))?\s*\)$/i,
  );

  if (!match) {
    return null;
  }

  return {
    hue: Number(match[1]),
    saturation: Number(match[2]),
    lightness: Number(match[3]),
    alpha:
      match[4] === undefined
        ? 1
        : match[4].endsWith('%')
          ? Number(match[4].slice(0, -1)) / 100
          : Number(match[4]),
  };
}

export function getColorForPosition(colors: string[], position: number) {
  if (colors.length === 0) {
    return 'white';
  }

  const boundedPosition = clamp(position, 0, colors.length - 1);
  const lowerIndex = Math.floor(boundedPosition);
  const upperIndex = Math.min(colors.length - 1, Math.ceil(boundedPosition));
  const progress = boundedPosition - lowerIndex;
  const lowerColor = parseHslColor(colors[lowerIndex]);
  const upperColor = parseHslColor(colors[upperIndex]);

  if (!lowerColor || !upperColor) {
    return progress < 0.5 ? colors[lowerIndex] : colors[upperIndex];
  }

  const hueDelta =
    ((((upperColor.hue - lowerColor.hue) % 360) + 540) % 360) - 180;
  const hue =
    (((lowerColor.hue + hueDelta * progress) % 360) + 360) % 360;

  return `hsla(${hue},${interpolate(
    lowerColor.saturation,
    upperColor.saturation,
    progress,
  )}%,${interpolate(
    lowerColor.lightness,
    upperColor.lightness,
    progress,
  )}%,${interpolate(lowerColor.alpha, upperColor.alpha, progress)})`;
}

export function getNavigationScale(position: number, activeIndex: number) {
  const proximity = Math.max(0, 1 - Math.abs(position - activeIndex));

  return 1 + (NAVIGATION_ACTIVE_SCALE - 1) * proximity;
}

export function getNavigationRingRadius(scale: number, strokeWidth: number) {
  return (NAVIGATION_RING_DIAMETER * scale - strokeWidth) / 2;
}

export function getSlideSlotIds(count: number) {
  return Array.from({ length: count }, (_, index) => {
    if (index === 0) {
      return 0;
    }

    return index % 2 === 1 ? Math.ceil(index / 2) : -(index / 2);
  }).sort((a, b) => a - b);
}

export function getOutsideInDelay(
  index: number,
  count: number,
  pairStagger = 90,
  sideLead = 30,
) {
  const distanceFromLeft = index;
  const distanceFromRight = count - index - 1;
  const pairIndex = Math.min(distanceFromLeft, distanceFromRight);
  const leftSideDelay = distanceFromLeft < distanceFromRight ? sideLead : 0;

  return pairIndex * pairStagger + leftSideDelay;
}

export function getLongestDelay(
  count: number,
  getDelay: (index: number, count: number) => number,
) {
  return Math.max(
    0,
    ...Array.from({ length: count }, (_, index) => getDelay(index, count)),
  );
}

export function getSlideLatticeCoordinate(count: number, surfaceWidth: number) {
  const parityOffset =
    count > 0 && count % 2 === 0 ? -NAVIGATION_SLIDE_STEP / 2 : 0;

  return surfaceWidth / 2 + parityOffset;
}

export function getSlideSlotCoordinate(
  slotId: number,
  count: number,
  surfaceWidth: number,
) {
  return (
    getSlideLatticeCoordinate(count, surfaceWidth) +
    slotId * NAVIGATION_SLIDE_STEP
  );
}

export function getSlideCenters(count: number, surfaceWidth: number) {
  return getSlideSlotIds(count).map((slotId) =>
    getSlideSlotCoordinate(slotId, count, surfaceWidth),
  );
}

export function getCenteredSectionCenters(
  count: number,
  height: number,
  step = SECTION_NAVIGATION_CENTERED_STEP,
) {
  const firstCenter = (height - step * (count - 1)) / 2;

  return Array.from({ length: count }, (_, index) => firstCenter + index * step);
}

export function getTitleLinkedSectionCenters(
  titleCenters: number[],
  fallbackStep = SECTION_NAVIGATION_CENTERED_STEP,
) {
  if (titleCenters.length === 0) {
    return [];
  }

  const step =
    titleCenters.length > 1
      ? (titleCenters[titleCenters.length - 1] - titleCenters[0]) /
        (titleCenters.length - 1)
      : fallbackStep;

  return [titleCenters[0] - step, ...titleCenters];
}

export function getSectionItemBounds(
  centers: number[],
  height: number,
  index: number,
) {
  const top = index === 0 ? 0 : (centers[index - 1] + centers[index]) / 2;
  const bottom =
    index === centers.length - 1
      ? height
      : (centers[index] + centers[index + 1]) / 2;

  return { top, height: Math.max(0, bottom - top) };
}

export function getSectionAffordanceOpacity(
  itemIndex: number,
  sourcePosition: number,
  hasSlides: boolean,
) {
  const arrowOpacity = hasSlides
    ? clamp(1 - Math.abs(sourcePosition - itemIndex), 0, 1)
    : 0;

  return {
    arrowOpacity,
    dotOpacity: 1 - arrowOpacity,
  };
}
