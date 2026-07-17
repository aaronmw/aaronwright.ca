export type SlideIndicatorMotionController = {
  begin: (targetIndex: number) => void;
  update: (position: number) => void;
  complete: (targetIndex: number) => void;
  cancel: () => void;
};

export type SlideNavigationItem = {
  id: string;
  label: string;
};
