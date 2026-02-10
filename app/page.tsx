'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { invalidate } from '@react-three/fiber';
import { Logo3D } from '@/components/Logo3D';
import { colorStore } from '@/stores/colorStore';

const COLORS = [
  '#ff0000',
  '#ff6600',
  '#ffcc00',
  '#88dd00',
  '#00cc44',
  '#00ccaa',
  '#0099ff',
  '#0044ff',
  '#6600ff',
  '#aa00ff',
  '#ff00aa',
  '#ff0055',
];

export default function Home() {
  const indexRef = useRef(Math.floor(Math.random() * COLORS.length));
  const [color, setColor] = useState(() => {
    colorStore.setColor(COLORS[indexRef.current]);
    return COLORS[indexRef.current];
  });
  const [canvasKey, setCanvasKey] = useState(0);

  useEffect(() => {
    colorStore.setColor(color);
    invalidate();
  }, [color]);

  const handleColorChange = useCallback(() => {
    indexRef.current = (indexRef.current + 1) % COLORS.length;
    setColor(COLORS[indexRef.current]);
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
      />
    </div>
  );
}
