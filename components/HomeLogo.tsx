'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
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
  const indexRef = useRef(Math.floor(Math.random() * COLORS.length));
  const colorRef = useRef(COLORS[indexRef.current]);
  const [canvasKey, setCanvasKey] = useState(0);
  const [rotationTrigger, setRotationTrigger] = useState(0);

  useLayoutEffect(() => {
    colorStore.setColor(colorRef.current);
    invalidate();
  }, []);

  const handleColorChange = useCallback(() => {
    indexRef.current = (indexRef.current + 1) % COLORS.length;
    colorRef.current = COLORS[indexRef.current];
    colorStore.setColor(colorRef.current);
    invalidate();
    setRotationTrigger((trigger) => trigger + 1);
  }, []);

  const handleContextLost = useCallback(() => {
    setCanvasKey((key) => key + 1);
  }, []);

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
