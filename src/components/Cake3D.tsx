"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { FLAVORS } from "@/lib/flavors";
import type { FlavorKey } from "@/lib/types";

const rnd = (i: number, s = 1) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const SCALE: Record<number, number> = { 15: 0.74, 20: 0.9, 25: 1.05, 30: 1.2 };

function Topping({ kind, color, y }: { kind: string; color: string; y: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const r = i === 8 ? 0 : 0.5 + rnd(i, 2) * 0.12;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, i, rot: rnd(i, 4) * Math.PI };
      }),
    [],
  );
  return (
    <group position={[0, y, 0]}>
      {items.map((p) => {
        const pos: [number, number, number] = [p.x, 0, p.z];
        switch (kind) {
          case "strawberry":
            return (
              <group key={p.i} position={pos} rotation={[0, p.rot, 0]}>
                <mesh position={[0, 0.1, 0]} scale={[1, 1.2, 1]}>
                  <sphereGeometry args={[0.13, 20, 16]} />
                  <meshStandardMaterial color={color} roughness={0.35} />
                </mesh>
                <mesh position={[0, 0.25, 0]}>
                  <coneGeometry args={[0.07, 0.07, 6]} />
                  <meshStandardMaterial color="#3E8E41" roughness={0.6} />
                </mesh>
              </group>
            );
          case "blueberry":
            return (
              <mesh key={p.i} position={[p.x, 0.07, p.z]}>
                <sphereGeometry args={[0.1, 18, 14]} />
                <meshStandardMaterial color={color} roughness={0.3} />
              </mesh>
            );
          case "lotus":
            return p.i < 5 ? (
              <mesh key={p.i} position={[p.x, 0.05, p.z]} rotation={[0.15, p.rot, 0.1]}>
                <boxGeometry args={[0.26, 0.06, 0.15]} />
                <meshStandardMaterial color="#B8742E" roughness={0.8} />
              </mesh>
            ) : (
              <mesh key={p.i} position={[p.x, 0.03, p.z]}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshStandardMaterial color="#8F5A25" roughness={0.9} />
              </mesh>
            );
          case "pistachio":
            return (
              <mesh key={p.i} position={[p.x, 0.05, p.z]} scale={[1.3, 0.8, 1]} rotation={[0, p.rot, 0]}>
                <icosahedronGeometry args={[0.08, 0]} />
                <meshStandardMaterial color={p.i % 2 ? "#9DBE62" : color} roughness={0.55} />
              </mesh>
            );
          case "chocolate":
            return p.i < 6 ? (
              <mesh key={p.i} position={[p.x, 0.06, p.z]} rotation={[0, p.rot, Math.PI / 2]}>
                <cylinderGeometry args={[0.05, 0.05, 0.26, 10]} />
                <meshStandardMaterial color="#6B3A25" roughness={0.3} />
              </mesh>
            ) : null;
          case "caramel":
            return (
              <mesh key={p.i} position={[p.x, 0.05, p.z]}>
                <sphereGeometry args={[0.07, 14, 12]} />
                <meshStandardMaterial color={color} roughness={0.2} />
              </mesh>
            );
          case "mango":
            return (
              <mesh key={p.i} position={[p.x, 0.06, p.z]} rotation={[0.2, p.rot, 0.1]}>
                <boxGeometry args={[0.15, 0.12, 0.15]} />
                <meshStandardMaterial color={color} roughness={0.4} />
              </mesh>
            );
          default:
            return (
              <mesh key={p.i} position={[p.x, 0.02, p.z]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshStandardMaterial color="#fff" />
              </mesh>
            );
        }
      })}
    </group>
  );
}

function Cake({ flavor, cm }: { flavor: FlavorKey; cm: number }) {
  const th = FLAVORS[flavor];
  const group = useRef<THREE.Group>(null);
  const target = SCALE[cm] ?? 1;

  const drips = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        a: (i / 16) * Math.PI * 2,
        len: 0.12 + rnd(i, 7) * 0.42,
        r: 0.05 + rnd(i, 9) * 0.03,
      })),
    [],
  );

  useFrame((s, dt) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.pow(0.0005, dt); // smooth size change
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x || target, target, k));
    g.position.y = Math.sin(s.clock.elapsedTime * 1.2) * 0.04;
  });

  const topY = 0.74;
  return (
    <group ref={group} scale={target}>
      {/* plate */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <cylinderGeometry args={[1.45, 1.35, 0.07, 64]} />
        <meshStandardMaterial color="#ffffff" roughness={0.25} />
      </mesh>
      {/* crust */}
      <mesh position={[0, -0.32, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.3, 64]} />
        <meshStandardMaterial color={th.crust} roughness={0.9} />
      </mesh>
      {/* body */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.99, 0.99, 0.75, 64]} />
        <meshStandardMaterial color={th.body} roughness={0.55} />
      </mesh>
      {/* sauce on top */}
      <mesh position={[0, topY - 0.01, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.07, 64]} />
        <meshPhysicalMaterial color={th.top} roughness={0.18} clearcoat={0.8} clearcoatRoughness={0.15} />
      </mesh>
      {/* dripping sauce */}
      {drips.map((d, i) => (
        <mesh key={i} position={[Math.cos(d.a) * 0.99, topY - 0.02 - d.len / 2, Math.sin(d.a) * 0.99]}>
          <capsuleGeometry args={[d.r, d.len, 6, 12]} />
          <meshPhysicalMaterial color={th.top} roughness={0.18} clearcoat={0.8} />
        </mesh>
      ))}
      <Topping kind={th.topping} color={th.topColor} y={topY + 0.03} />
    </group>
  );
}

export default function Cake3D({
  flavor,
  cm = 20,
  interactive = true,
  reduceMotion = false,
}: {
  flavor: FlavorKey;
  cm?: number;
  interactive?: boolean;
  reduceMotion?: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 2.0, 4.6], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
      aria-label="3D cheesecake"
    >
      <ambientLight intensity={1.25} />
      <directionalLight position={[3, 5, 3]} intensity={2.4} />
      <directionalLight position={[-4, 2, -2]} intensity={0.9} color="#ffd9c2" />
      <pointLight position={[0, 3, 0]} intensity={8} color="#fff1dc" />
      <Cake flavor={flavor} cm={cm} />
      <ContactShadows position={[0, -0.56, 0]} opacity={0.35} scale={6} blur={2.6} far={2} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enabled={interactive}
        autoRotate={!reduceMotion}
        autoRotateSpeed={2}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
