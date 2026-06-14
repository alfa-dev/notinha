"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

function Receipt({
  position,
  rotation,
  speed,
  color,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  speed: number;
  color: string;
}) {
  const mesh = useRef<THREE.Mesh>(null!);
  const rotOffset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + rotOffset;
    mesh.current.position.y = position[1] + Math.sin(t) * 0.3;
    mesh.current.rotation.x = rotation[0] + Math.sin(t * 0.7) * 0.15;
    mesh.current.rotation.y = rotation[1] + t * 0.2;
    mesh.current.rotation.z = rotation[2] + Math.cos(t * 0.5) * 0.1;
  });

  return (
    <mesh ref={mesh} position={position} castShadow>
      {/* Receipt body */}
      <RoundedBox args={[1, 2.4, 0.04]} radius={0.06} smoothness={4}>
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.05} />
      </RoundedBox>
      {/* Lines on receipt */}
      {[-0.7, -0.3, 0.1, 0.5, 0.85].map((y, i) => (
        <mesh key={i} position={[0, y, 0.025]}>
          <boxGeometry args={[i === 0 ? 0.7 : 0.6, 0.04, 0.001]} />
          <meshStandardMaterial color="#1a1a18" opacity={0.15} transparent />
        </mesh>
      ))}
      {/* Dashed top edge */}
      {[-0.35, -0.15, 0.05, 0.25, 0.45].map((x, i) => (
        <mesh key={`t${i}`} position={[x, 1.2, 0.025]}>
          <boxGeometry args={[0.09, 0.04, 0.001]} />
          <meshStandardMaterial color="#1a1a18" opacity={0.12} transparent />
        </mesh>
      ))}
    </mesh>
  );
}

const RECEIPTS = [
  { position: [-2.5, 0.5, -1] as [number, number, number], rotation: [0.2, 0.5, 0.1] as [number, number, number], speed: 0.4, color: "#f0ede6" },
  { position: [0, 1.2, 0] as [number, number, number], rotation: [-0.1, -0.3, 0.05] as [number, number, number], speed: 0.35, color: "#f8f5ee" },
  { position: [2.8, -0.2, -0.5] as [number, number, number], rotation: [0.15, 0.8, -0.1] as [number, number, number], speed: 0.5, color: "#ece9e2" },
  { position: [-1.2, -1.5, -2] as [number, number, number], rotation: [-0.3, -0.6, 0.2] as [number, number, number], speed: 0.3, color: "#f4f1ea" },
  { position: [3.5, 1.5, -2] as [number, number, number], rotation: [0.4, 1.2, -0.05] as [number, number, number], speed: 0.45, color: "#f0ede6" },
  { position: [-3.8, -0.8, -1.5] as [number, number, number], rotation: [-0.2, 0.4, 0.15] as [number, number, number], speed: 0.38, color: "#f8f5ee" },
  { position: [1.5, -2, -1] as [number, number, number], rotation: [0.3, -0.7, -0.2] as [number, number, number], speed: 0.42, color: "#ece9e2" },
];

export default function ReceiptCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 50 }}
      style={{ background: "transparent" }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <directionalLight position={[-5, -3, 2]} intensity={0.3} color="#d4c9a0" />
      {RECEIPTS.map((r, i) => (
        <Receipt key={i} {...r} />
      ))}
    </Canvas>
  );
}
