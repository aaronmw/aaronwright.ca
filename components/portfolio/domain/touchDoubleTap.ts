export const DOUBLE_TAP_MAX_DELAY_MS = 500;

const DOUBLE_TAP_MAX_DISTANCE_PX = 32;
const TAP_MAX_DURATION_MS = 300;
const TAP_MOVE_TOLERANCE_PX = 12;

export type TouchTapPoint = {
  identifier: number;
  clientX: number;
  clientY: number;
};

type TouchTapCandidate = TouchTapPoint & {
  startedAt: number;
};

type CompletedTouchTap = Omit<TouchTapPoint, 'identifier'> & {
  completedAt: number;
};

function distanceBetween(
  first: Pick<TouchTapPoint, 'clientX' | 'clientY'>,
  second: Pick<TouchTapPoint, 'clientX' | 'clientY'>
) {
  return Math.hypot(
    first.clientX - second.clientX,
    first.clientY - second.clientY
  );
}

export function createTouchDoubleTapRecognizer() {
  let candidate: TouchTapCandidate | null = null;
  let completedTap: CompletedTouchTap | null = null;

  const reset = () => {
    candidate = null;
    completedTap = null;
  };

  return {
    start(point: TouchTapPoint, startedAt: number) {
      candidate = {
        identifier: point.identifier,
        clientX: point.clientX,
        clientY: point.clientY,
        startedAt,
      };
    },
    move(points: TouchTapPoint[]) {
      if (!candidate) {
        return;
      }

      const currentPoint = points.find(
        (point) => point.identifier === candidate?.identifier
      );

      if (
        !currentPoint ||
        distanceBetween(currentPoint, candidate) > TAP_MOVE_TOLERANCE_PX
      ) {
        reset();
      }
    },
    end(
      points: TouchTapPoint[],
      completedAt: number
    ): TouchTapPoint | null {
      if (!candidate) {
        return null;
      }

      const endedPoint = points.find(
        (point) => point.identifier === candidate?.identifier
      );
      const completedCandidate = candidate;
      candidate = null;

      if (
        !endedPoint ||
        completedAt - completedCandidate.startedAt > TAP_MAX_DURATION_MS ||
        distanceBetween(endedPoint, completedCandidate) >
          TAP_MOVE_TOLERANCE_PX
      ) {
        completedTap = null;
        return null;
      }

      const isDoubleTap =
        completedTap !== null &&
        completedAt - completedTap.completedAt <=
          DOUBLE_TAP_MAX_DELAY_MS &&
        distanceBetween(endedPoint, completedTap) <=
          DOUBLE_TAP_MAX_DISTANCE_PX;

      if (isDoubleTap) {
        completedTap = null;
        return endedPoint;
      }

      completedTap = {
        clientX: endedPoint.clientX,
        clientY: endedPoint.clientY,
        completedAt,
      };
      return null;
    },
    reset,
  };
}
