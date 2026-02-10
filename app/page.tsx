'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

export default function Home() {
  const indexRef = useRef(Math.floor(Math.random() * COLORS.length));
  const [color, setColor] = useState(() => {
    colorStore.setColor(COLORS[indexRef.current]);
    return COLORS[indexRef.current];
  });
  const [canvasKey, setCanvasKey] = useState(0);
  const [rotationTrigger, setRotationTrigger] = useState(0);

  useEffect(() => {
    colorStore.setColor(color);
    invalidate();
  }, [color]);

  const handleColorChange = useCallback(() => {
    indexRef.current = (indexRef.current + 1) % COLORS.length;
    setColor(COLORS[indexRef.current]);
    setRotationTrigger((t) => t + 1);
  }, []);

  const handleContextLost = useCallback(() => {
    setCanvasKey((k) => k + 1);
  }, []);

  return (
    <div
      className="absolute inset-0 cursor-pointer bg-black"
    >
      <Logo3D
        onColorChange={handleColorChange}
        canvasKey={canvasKey}
        onContextLost={handleContextLost}
        rotationTrigger={rotationTrigger}
      />
    </div>
  );
}
