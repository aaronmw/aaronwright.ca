import { gsap } from 'gsap';
import {
  clamp,
  getColorForPosition,
  getCoordinateForPosition,
  getNavigationScale,
  getPositionForCoordinate,
} from './navigationGeometry';
import {
  NAVIGATION_BREAKAWAY_DISTANCE,
  NAVIGATION_RETURN_DELAY,
  NAVIGATION_RING_HOVER_STROKE,
  NAVIGATION_RING_STROKE,
  NAVIGATION_SNAP_DISTANCE,
} from './navigationTokens';

export {
  getColorForPosition,
  getCoordinateForPosition,
  getNavigationRingRadius,
  getNavigationScale,
  getPositionForCoordinate,
} from './navigationGeometry';
export {
  NAVIGATION_ACTIVE_SCALE,
  NAVIGATION_BREAKAWAY_DISTANCE,
  NAVIGATION_DOT_DIAMETER,
  NAVIGATION_DOT_RADIUS,
  NAVIGATION_RETURN_DELAY,
  NAVIGATION_RING_DIAMETER,
  NAVIGATION_RING_HOVER_STROKE,
  NAVIGATION_RING_RADIUS,
  NAVIGATION_RING_STROKE,
  NAVIGATION_SLIDE_STEP,
  NAVIGATION_SNAP_DISTANCE,
} from './navigationTokens';

export type NavigationMode =
  | 'source-linked'
  | 'pointer-follow'
  | 'snap'
  | 'pinned';

export type NavigationRenderState = {
  activeIndex: number;
  color: string;
  coordinate: number;
  mode: NavigationMode;
  position: number;
  pressedIndex: number | null;
  pressScale: number;
  ringScale: number;
  snappedIndex: number | null;
  strokeWidth: number;
};

export type NavigationGeometry = {
  centers: number[];
  colors: string[];
};

export type TrackedNavigationOptions = {
  geometry: NavigationGeometry;
  activeIndex: number;
  sourcePosition?: number;
  reducedMotion?: boolean;
  snapDistance?: number;
  breakawayDistance?: number;
  returnDelay?: number;
  onRender: (state: NavigationRenderState) => void;
};

type MoveOptions = {
  duration?: number;
  ease?: string;
  immediate?: boolean;
  onComplete?: () => void;
};

export class TrackedNavigationController {
  private geometry: NavigationGeometry;
  private readonly onRender: (state: NavigationRenderState) => void;
  private readonly snapDistance: number;
  private readonly breakawayDistance: number;
  private readonly returnDelay: number;
  private reducedMotion: boolean;
  private sourcePosition: number;
  private activeIndex: number;
  private pointerCoordinate: number | null = null;
  private pointerArmed = false;
  private snappingEnabled = true;
  private focusedIndex: number | null = null;
  private previewIndex: number | null = null;
  private pinnedIndex: number | null = null;
  private snappedIndex: number | null = null;
  private mode: NavigationMode = 'source-linked';
  private strokeWidth = NAVIGATION_RING_STROKE;
  private pressedIndex: number | null = null;
  private pressScale = 1;
  private returnTimeout: ReturnType<typeof setTimeout> | null = null;
  private moveTween: gsap.core.Tween | null = null;
  private strokeTween: gsap.core.Tween | null = null;
  private pressTimeline: gsap.core.Timeline | null = null;
  private pressReleaseQueued = false;
  private readonly motion: { coordinate: number };

  constructor(options: TrackedNavigationOptions) {
    this.geometry = options.geometry;
    this.onRender = options.onRender;
    this.snapDistance = options.snapDistance ?? NAVIGATION_SNAP_DISTANCE;
    this.breakawayDistance =
      options.breakawayDistance ?? NAVIGATION_BREAKAWAY_DISTANCE;
    this.returnDelay = options.returnDelay ?? NAVIGATION_RETURN_DELAY;
    this.reducedMotion = options.reducedMotion ?? false;
    this.activeIndex = options.activeIndex;
    this.sourcePosition = options.sourcePosition ?? options.activeIndex;
    this.motion = {
      coordinate: getCoordinateForPosition(
        this.geometry.centers,
        this.sourcePosition,
      ),
    };
    this.render();
  }

  updateGeometry(
    geometry: NavigationGeometry,
    immediate = true,
    duration = 0.5,
  ) {
    this.geometry = geometry;
    const position = this.getLogicalPosition();
    this.moveToPosition(position, {
      immediate,
      duration: immediate ? 0 : duration,
      ease: 'expo.out',
    });
  }

  setReducedMotion(reducedMotion: boolean) {
    this.reducedMotion = reducedMotion;
  }

  setActiveIndex(activeIndex: number) {
    this.activeIndex = activeIndex;
    this.render();
  }

  setSourcePosition(position: number, immediate = true) {
    this.sourcePosition = clamp(
      position,
      0,
      Math.max(0, this.geometry.centers.length - 1),
    );

    if (this.mode === 'source-linked') {
      this.moveToPosition(this.sourcePosition, { immediate });
      return true;
    }

    return false;
  }

  setSnappingEnabled(enabled: boolean) {
    this.snappingEnabled = enabled;

    if (!enabled) {
      this.snappedIndex = null;
    }
  }

  engagePointer(coordinate: number) {
    this.clearReturnTimeout();
    this.pointerArmed = true;
    this.pointerCoordinate = coordinate;
    this.trackPointer(coordinate, true);
  }

  trackPointer(coordinate: number, acquire = false) {
    this.pointerCoordinate = coordinate;

    if (!this.pointerArmed || this.pinnedIndex !== null) {
      return;
    }

    const centers = this.geometry.centers;

    if (centers.length === 0) {
      return;
    }

    const nearestIndex = centers.reduce(
      (closestIndex, center, index) =>
        Math.abs(center - coordinate) <
        Math.abs(centers[closestIndex] - coordinate)
          ? index
          : closestIndex,
      0,
    );
    const nextSnapIndex =
      this.snappingEnabled &&
      Math.abs(centers[nearestIndex] - coordinate) <= this.snapDistance
        ? nearestIndex
        : null;
    const snapChanged = nextSnapIndex !== this.snappedIndex;
    const targetCoordinate =
      nextSnapIndex === null ? coordinate : centers[nextSnapIndex];
    const minimum = centers[0] - this.breakawayDistance;
    const maximum = centers[centers.length - 1] + this.breakawayDistance;

    if (
      (coordinate < minimum && targetCoordinate < minimum) ||
      (coordinate > maximum && targetCoordinate > maximum)
    ) {
      this.releasePointer(false);
      return;
    }

    this.snappedIndex = nextSnapIndex;
    this.mode = nextSnapIndex === null ? 'pointer-follow' : 'snap';
    this.animateStroke(NAVIGATION_RING_HOVER_STROKE);
    this.moveToCoordinate(targetCoordinate, {
      duration: acquire ? 0.3 : snapChanged ? 0.2 : 0,
      ease: 'power3.out',
      immediate: !acquire && !snapChanged,
    });
  }

  releasePointer(delayed = true) {
    this.clearReturnTimeout();
    this.pointerArmed = false;
    this.pointerCoordinate = null;
    this.snappedIndex = null;

    if (this.pinnedIndex !== null || this.focusedIndex !== null) {
      return;
    }

    const release = () => {
      this.returnTimeout = null;
      this.previewIndex = null;
      this.mode = 'source-linked';
      this.animateStroke(NAVIGATION_RING_STROKE);
      this.moveToPosition(this.sourcePosition, {
        duration: 0.3,
        ease: 'power3.out',
      });
    };

    if (!delayed) {
      release();
      return;
    }

    this.returnTimeout = setTimeout(release, this.returnDelay);
  }

  preview(index: number) {
    if (this.pinnedIndex !== null || this.pointerArmed) {
      return;
    }

    this.clearReturnTimeout();
    this.previewIndex = index;
    this.mode = 'snap';
    this.snappedIndex = index;
    this.animateStroke(NAVIGATION_RING_HOVER_STROKE);
    this.moveToPosition(index, { duration: 0.3, ease: 'power3.out' });
  }

  clearPreview(index: number, delayed = true) {
    if (this.previewIndex !== index) {
      return;
    }

    if (this.pointerArmed || this.pinnedIndex !== null) {
      this.previewIndex = null;
      this.snappedIndex = null;
      return;
    }

    this.releasePointer(delayed);
  }

  focus(index: number) {
    this.focusedIndex = index;

    if (!this.pointerArmed && this.pinnedIndex === null) {
      this.preview(index);
    }
  }

  blur(index: number) {
    if (this.focusedIndex !== index) {
      return;
    }

    this.focusedIndex = null;

    if (!this.pointerArmed) {
      this.clearPreview(index, true);
    }
  }

  pin(index: number, sourceLinked = false) {
    this.clearReturnTimeout();
    this.moveTween?.kill();
    this.moveTween = null;
    this.pinnedIndex = index;
    this.previewIndex = null;
    this.snappedIndex = sourceLinked ? null : index;
    this.activeIndex = index;
    this.mode = sourceLinked ? 'source-linked' : 'pinned';
    this.animateStroke(NAVIGATION_RING_STROKE);

    if (sourceLinked) {
      this.moveToPosition(this.sourcePosition, { immediate: true });
    } else {
      this.moveToPosition(index, { duration: 0.2, ease: 'power3.out' });
    }
  }

  completePin(index: number) {
    if (this.pinnedIndex !== index) {
      return;
    }

    this.pinnedIndex = null;
    this.sourcePosition = index;

    if (this.pointerArmed && this.pointerCoordinate !== null) {
      this.trackPointer(this.pointerCoordinate, true);
      return;
    }

    if (this.focusedIndex !== null) {
      this.preview(this.focusedIndex);
      return;
    }

    this.mode = 'source-linked';
    this.snappedIndex = null;
    this.moveToPosition(this.sourcePosition, { immediate: true });
  }

  cancelPin() {
    this.pinnedIndex = null;
    this.snappedIndex = null;
    this.mode = 'source-linked';
    this.animateStroke(NAVIGATION_RING_STROKE);
    this.moveToPosition(this.sourcePosition, { duration: 0.3 });
  }

  press(index: number) {
    this.pressTimeline?.kill();
    this.pressedIndex = index;
    this.pressReleaseQueued = false;
    this.pressTimeline = gsap.timeline({
      onUpdate: () => this.render(),
      onComplete: () => {
        if (this.pressReleaseQueued) {
          this.release(index);
        }
      },
    });
    this.pressTimeline.to(this, {
      pressScale: 0.95,
      duration: this.reducedMotion ? 0 : 0.09,
      ease: 'power1.in',
    });
  }

  release(index: number) {
    if (this.pressedIndex !== index) {
      return;
    }

    if (this.pressTimeline?.isActive()) {
      this.pressReleaseQueued = true;
      return;
    }

    this.pressTimeline?.kill();
    this.pressTimeline = gsap.timeline({
      onUpdate: () => this.render(),
      onComplete: () => {
        this.pressedIndex = null;
        this.pressScale = 1;
        this.pressReleaseQueued = false;
        this.render();
      },
    });
    this.pressTimeline
      .to(this, {
        pressScale: 1.1,
        duration: this.reducedMotion ? 0 : 0.15,
        ease: 'power3.out',
      })
      .to(this, {
        pressScale: 0.98,
        duration: this.reducedMotion ? 0 : 0.09,
        ease: 'power2.inOut',
      })
      .to(this, {
        pressScale: 1,
        duration: this.reducedMotion ? 0 : 0.12,
        ease: 'power2.out',
      });
  }

  triggerPress(index: number) {
    this.press(index);
    this.pressReleaseQueued = true;
  }

  getPinnedIndex() {
    return this.pinnedIndex;
  }

  getPointerCoordinate() {
    return this.pointerCoordinate;
  }

  isPointerArmed() {
    return this.pointerArmed;
  }

  destroy() {
    this.clearReturnTimeout();
    this.moveTween?.kill();
    this.strokeTween?.kill();
    this.pressTimeline?.kill();
  }

  private getLogicalPosition() {
    if (this.mode === 'source-linked') {
      return this.sourcePosition;
    }

    if (this.pinnedIndex !== null && this.mode === 'pinned') {
      return this.pinnedIndex;
    }

    if (this.previewIndex !== null) {
      return this.previewIndex;
    }

    if (this.pointerArmed && this.pointerCoordinate !== null) {
      return getPositionForCoordinate(
        this.geometry.centers,
        this.pointerCoordinate,
      );
    }

    return this.sourcePosition;
  }

  private moveToPosition(position: number, options: MoveOptions = {}) {
    this.moveToCoordinate(
      getCoordinateForPosition(this.geometry.centers, position),
      options,
    );
  }

  private moveToCoordinate(coordinate: number, options: MoveOptions = {}) {
    const immediate =
      options.immediate || this.reducedMotion || !options.duration;

    this.moveTween?.kill();

    if (immediate) {
      this.motion.coordinate = coordinate;
      this.render();
      options.onComplete?.();
      return;
    }

    const tween = gsap.to(this.motion, {
      coordinate,
      duration: options.duration,
      ease: options.ease ?? 'power3.out',
      overwrite: 'auto',
      onUpdate: () => this.render(),
      onComplete: () => {
        if (this.moveTween === tween) {
          this.moveTween = null;
        }
        options.onComplete?.();
      },
    });
    this.moveTween = tween;
  }

  private animateStroke(strokeWidth: number) {
    if (this.strokeWidth === strokeWidth) {
      return;
    }

    this.strokeTween?.kill();

    if (this.reducedMotion) {
      this.strokeWidth = strokeWidth;
      this.render();
      return;
    }

    this.strokeTween = gsap.to(this, {
      strokeWidth,
      duration: 0.2,
      ease: 'power2.out',
      onUpdate: () => this.render(),
    });
  }

  private render() {
    const position = getPositionForCoordinate(
      this.geometry.centers,
      this.motion.coordinate,
    );

    this.onRender({
      activeIndex: this.activeIndex,
      color: getColorForPosition(this.geometry.colors, position),
      coordinate: this.motion.coordinate,
      mode: this.mode,
      position,
      pressedIndex: this.pressedIndex,
      pressScale: this.pressScale,
      ringScale: getNavigationScale(position, this.activeIndex),
      snappedIndex: this.snappedIndex,
      strokeWidth: this.strokeWidth,
    });
  }

  private clearReturnTimeout() {
    if (this.returnTimeout) {
      clearTimeout(this.returnTimeout);
      this.returnTimeout = null;
    }
  }
}
