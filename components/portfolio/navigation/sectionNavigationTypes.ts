import type { MutableRefObject } from 'react';
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
  ring: SVGEllipseElement | null;
  itemGroups: Array<SVGGElement | null>;
  arrowGroups: Array<SVGGElement | null>;
  dots: Array<SVGCircleElement | null>;
  buttons: Array<HTMLButtonElement | null>;
  tooltip: HTMLDivElement | null;
  tooltipText: HTMLSpanElement | null;
};

export type SectionNavigationProps = {
  controllerRef: MutableRefObject<SectionNavigationHandle | null>;
  sourceRef: MutableRefObject<HTMLDivElement | null>;
  menuTitleRefs: MutableRefObject<Array<HTMLSpanElement | null>>;
  items: SectionNavigationItem[];
  activeIndex: number;
  hovered: boolean;
  geometryMode: SectionNavigationGeometryMode;
  hideRightRail: boolean;
  modalLayerActive: boolean;
  modalPresentationActive: boolean;
  canMoveHorizontally: boolean;
  previousSlideTitle: string;
  nextSlideTitle: string;
  onHoveredChange: (hovered: boolean) => void;
  onHorizontalNavigate: (side: SectionNavigationSide) => void;
  onVerticalNavigate: (itemIndex: number, sourceLinked: boolean) => void;
};
