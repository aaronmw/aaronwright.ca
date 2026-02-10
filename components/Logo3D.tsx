'use client';

import { useRef, useMemo } from 'react';
import { Center, OrbitControls, RoundedBox } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { colorStore } from '@/stores/colorStore';

const GRID = [
  [0, 4],
  [0, 2, 4],
  [0, 4],
  [0, 2, 4],
  [0, 1, 2, 3, 4],
];

const CUBE_SIZE = 0.9;
const FLOOR_SCALE = 150;
const FLICKER_AMOUNT = 1.5;
const BASE_INTENSITY = 3;
const COLOR_LERP_SPEED = 3;

function Cube({
  position,
  phase,
  speed,
}: {
  position: [number, number, number];
  phase: number;
  speed: number;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const currentColor = useRef(new THREE.Color(colorStore.getColor()));
  const targetColorRef = useRef(new THREE.Color(colorStore.getColor()));

  useFrame((state, delta) => {
    targetColorRef.current.set(colorStore.getColor());
    const t = state.clock.elapsedTime;
    if (lightRef.current) {
      lightRef.current.intensity =
        BASE_INTENSITY + Math.sin(t * speed + phase) * FLICKER_AMOUNT;
    }
    currentColor.current.lerp(
      targetColorRef.current,
      Math.min(1, delta * COLOR_LERP_SPEED)
    );
    const flicker = Math.sin(t * speed + phase);
    const emissiveScale = 0.5 + flicker * 0.3;
    if (lightRef.current) lightRef.current.color.copy(currentColor.current);
    if (materialRef.current) {
      materialRef.current.color.copy(currentColor.current);
      materialRef.current.emissive.copy(currentColor.current);
      materialRef.current.emissiveIntensity = emissiveScale;
    }
  });

  return (
    <group position={position}>
      <pointLight
        ref={lightRef}
        color={currentColor.current}
        intensity={BASE_INTENSITY}
        distance={100}
        decay={1.1}
      />
      <RoundedBox args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} radius={0.1} smoothness={4}>
        <meshStandardMaterial
          ref={materialRef}
          color={currentColor.current}
          emissive={currentColor.current}
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </RoundedBox>
    </group>
  );
}

function Logo({ onColorChange }: { onColorChange: () => void }) {
  const cells = useMemo(
    () =>
      GRID.flatMap((cols, row) =>
        cols.map((col) => ({
          position: [col - 2, 2 - row, 0] as [number, number, number],
          phase: Math.random() * Math.PI * 2,
          speed: 2 + Math.random() * 4,
          key: `${row}-${col}`,
        }))
      ),
    []
  );
  return (
    <group>
      {cells.map(({ position, phase, speed, key }) => (
        <Cube key={key} position={position} phase={phase} speed={speed} />
      ))}
    </group>
  );
}

export function Logo3D({
  onColorChange,
  canvasKey,
  onContextLost,
}: {
  onColorChange: () => void;
  canvasKey: number;
  onContextLost: () => void;
}) {
  return (
    <Canvas
      key={canvasKey}
      camera={{ position: [0, 0, 40], fov: 60 }}
      gl={{ antialias: true, toneMappingExposure: 1.2 }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color('black');
        gl.toneMappingExposure = 1.2;
        gl.domElement.addEventListener(
          'webglcontextlost',
          (e) => {
            e.preventDefault();
            onContextLost();
          },
          { once: true }
        );
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -2.5, 0]}
        scale={FLOOR_SCALE}
        onClick={onColorChange}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#000000" side={THREE.DoubleSide} />
      </mesh>
      <Center>
        <Logo onColorChange={onColorChange} />
      </Center>
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
    </Canvas>
  );
}
