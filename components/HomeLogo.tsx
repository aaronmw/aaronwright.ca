'use client';

import { useLayoutEffect, useReducer, useState } from 'react';
import { invalidate } from '@react-three/fiber';
import { Logo3D } from '@/components/Logo3D';
import { colorStore } from '@/stores/colorStore';

const COLORS = [
  '#ff0000',
  '#ffcc00',
  '#00cc44',
  '#0099ff',
  '#6600ff',
  '#ff00aa',
];

export function HomeLogo() {
  const [colorIndex, advanceColor] = useReducer(
    (index: number) => (index + 1) % COLORS.length,
    0,
    () => Math.floor(Math.random() * COLORS.length)
  );
  const [canvasKey, setCanvasKey] = useState(0);
  const [rotationTrigger, setRotationTrigger] = useState(0);
  const color = COLORS[colorIndex];

  useLayoutEffect(() => {
    colorStore.setColor(color);
    invalidate();
  }, [color]);

  function handleColorChange() {
    advanceColor();
    setRotationTrigger((trigger) => trigger + 1);
  }

  function handleContextLost() {
    setCanvasKey((key) => key + 1);
  }

  return (
    <div className="absolute inset-0 cursor-pointer bg-black">
      <Logo3D
        onColorChange={handleColorChange}
        canvasKey={canvasKey}
        onContextLost={handleContextLost}
        rotationTrigger={rotationTrigger}
      />
    </div>
  );
}
