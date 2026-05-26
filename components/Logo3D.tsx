'use client';

import { useRef, useMemo } from 'react';
import {
  Center,
  MeshTransmissionMaterial,
  OrbitControls,
  RoundedBox,
} from '@react-three/drei';
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
const FLOOR_Y = -2.5;
const LOGO_Y = 1.5;
const CAMERA_POSITION: [number, number, number] = [0, 0, 40];
const CAMERA_FLOOR_CLEARANCE = 2;
const MIN_CAMERA_Y = FLOOR_Y + CAMERA_FLOOR_CLEARANCE;
const CAMERA_DISTANCE = Math.hypot(...CAMERA_POSITION);
const MAX_POLAR_ANGLE = Math.acos(MIN_CAMERA_Y / CAMERA_DISTANCE);
const FLICKER_AMOUNT = 1.5;
const BASE_INTENSITY = 3;
const COLOR_LERP_SPEED = 3;

function Cube({
  position,
  phase,
  speed,
  index,
  rotationTrigger,
  rotationDuration,
}: {
  position: [number, number, number];
  phase: number;
  speed: number;
  index: number;
  rotationTrigger: number;
  rotationDuration: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const currentColor = useRef(new THREE.Color(colorStore.getColor()));
  const targetColorRef = useRef(new THREE.Color(colorStore.getColor()));
  const animRef = useRef({
    lastTrigger: 0,
    startTime: 0,
    baseRotation: 0,
    targetRotation: 0,
  });

  useFrame((state, delta) => {
    const { elapsedTime } = state.clock;
    const t = elapsedTime;

    if (rotationTrigger !== animRef.current.lastTrigger && groupRef.current) {
      const current = groupRef.current.rotation.y;
      const normalized =
        ((current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      animRef.current.lastTrigger = rotationTrigger;
      animRef.current.startTime = elapsedTime + index * 0.1;
      animRef.current.baseRotation = normalized;
      animRef.current.targetRotation =
        (Math.floor(normalized / Math.PI) + 1) * Math.PI;
    }

    let rotationProgress = 0;
    if (groupRef.current && animRef.current.lastTrigger === rotationTrigger) {
      const { baseRotation, targetRotation, startTime } = animRef.current;
      rotationProgress = Math.max(
        0,
        Math.min(1, (elapsedTime - startTime) / rotationDuration)
      );
      const r = baseRotation + (targetRotation - baseRotation) * rotationProgress;
      groupRef.current.rotation.y =
        rotationProgress >= 1
          ? ((targetRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
          : r;
    }

    if (lightRef.current) {
      lightRef.current.intensity =
        BASE_INTENSITY + Math.sin(t * speed + phase) * FLICKER_AMOUNT;
    }

    if (rotationProgress >= 0.5) {
      targetColorRef.current.set(colorStore.getColor());
      currentColor.current.lerp(
        targetColorRef.current,
        Math.min(1, delta * COLOR_LERP_SPEED)
      );
    }
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
    <group ref={groupRef} position={position}>
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

function Logo({
  onColorChange,
  rotationTrigger,
}: {
  onColorChange: () => void;
  rotationTrigger: number;
}) {
  const cells = useMemo(
    () =>
      GRID.flatMap((cols, row) =>
        cols.map((col) => ({
          position: [col - 2, 2 - row, 0] as [number, number, number],
          phase: Math.random() * Math.PI * 2,
          speed: 2 + Math.random() * 4,
          rotationDuration: 0.4 + Math.random() * 0.2,
          key: `${row}-${col}`,
        }))
      ),
    []
  );
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onColorChange();
      }}
    >
      {cells.map(({ position, phase, speed, rotationDuration, key }, index) => (
        <Cube
          key={key}
          position={position}
          phase={phase}
          speed={speed}
          index={index}
          rotationTrigger={rotationTrigger}
          rotationDuration={rotationDuration}
        />
      ))}
    </group>
  );
}

export function Logo3D({
  onColorChange,
  canvasKey,
  onContextLost,
  rotationTrigger,
}: {
  onColorChange: () => void;
  canvasKey: number;
  onContextLost: () => void;
  rotationTrigger: number;
}) {
  return (
    <Canvas
      key={canvasKey}
      camera={{ position: CAMERA_POSITION, fov: 60 }}
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
      onPointerMissed={onColorChange}
      style={{ width: '100%', height: '100%' }}
    >
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y, 0]}
        scale={FLOOR_SCALE}
        onClick={onColorChange}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <planeGeometry args={[1, 1]} />
        <MeshTransmissionMaterial
          color="#000000"
          transparent
          opacity={0.8}
          transmission={0.25}
          roughness={0.6}
          thickness={0.35}
          anisotropicBlur={0.35}
          samples={6}
          resolution={256}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>
      <Center position={[0, LOGO_Y, 0]}>
        <Logo
          onColorChange={onColorChange}
          rotationTrigger={rotationTrigger}
        />
      </Center>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        enablePan={false}
        maxDistance={CAMERA_DISTANCE}
        maxPolarAngle={MAX_POLAR_ANGLE}
      />
    </Canvas>
  );
}
