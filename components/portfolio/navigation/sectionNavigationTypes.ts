import type { SectionNavigationSide } from './navigationGeometry';

export type SectionNavigationAxis = 'horizontal' | 'vertical';
export type SectionNavigationGeometryMode = 'title-linked' | 'centered';

export type SectionNavigationItem = {
  id: string;
  title: string;
  color: string;
  hasSlides: boolean;
  pending: boolean;
};

export type SectionNavigationHandle = {
  cancel: () => void;
  click: (index: number, side?: SectionNavigationSide) => boolean;
  getPinnedIndex: () => number | null;
  pin: (
    index: number,
    axis: SectionNavigationAxis,
    sourceLinked?: boolean,
  ) => void;
  preview: (index: number, previewed: boolean) => void;
  settle: (axis: SectionNavigationAxis) => void;
  syncSourcePosition: () => void;
};

export type SectionNavigationGeometry = {
  centers: number[];
  height: number;
};

export type SectionNavigationView = {
  ring: SVGCircleElement | null;
  itemGroups: Array<SVGGElement | null>;
  arrowGroups: Array<SVGGElement | null>;
  dots: Array<SVGCircleElement | null>;
  buttons: Array<HTMLButtonElement | null>;
  tooltip: HTMLDivElement | null;
  tooltipText: HTMLSpanElement | null;
};
