"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import styles from "./TranscendenceSword.module.css";

function DualRings() {
  const outerRef = useRef<THREE.Mesh>(null!);
  const innerRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (outerRef.current) outerRef.current.rotation.z = t * 0.12;
    if (innerRef.current) innerRef.current.rotation.z = -t * 0.08;
  });

  return (
    <group position={[0, 0, -0.25]} scale={0.9}>
      <mesh ref={outerRef}>
        <torusGeometry args={[1, 0.01, 32, 200]} />
        <meshStandardMaterial
          color="#404046"
          metalness={0.6}
          roughness={0.8}
          transparent
          opacity={0.8}
        />
      </mesh>

      <mesh ref={innerRef} scale={0.8}>
        <torusGeometry args={[1, 0.008, 32, 200]} />
        <meshStandardMaterial
          color="#505058"
          metalness={0.7}
          roughness={0.7}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

function ChromeCore() {
  const ringRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <group position={[0, 0, -0.5]} scale={0.12}>
      <mesh>
        <sphereGeometry args={[0.6, 64, 64]} />
        <meshStandardMaterial
          metalness={1}
          roughness={0.15}
          envMapIntensity={2}
        />
      </mesh>

      <mesh ref={ringRef} scale={1.4}>
        <torusGeometry args={[0.8, 0.015, 32, 200]} />
        <meshStandardMaterial
          color="#d9d9d9"
          metalness={0.9}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

const swordMaterial = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color("#5b4777"),
  metalness: 1.0,
  roughness: 0.15,
  envMapIntensity: 1.2,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
});

function SwordModel({
  onClick,
  setHoveringSword,
  onLoaded,
}: {
  onClick: (e: any) => void;
  setHoveringSword: (val: boolean) => void;
  onLoaded?: () => void;
}) {
  const { scene: originalScene } = useGLTF("/blob.glb");

  const processedScene = useMemo(() => {
    const scene = originalScene;

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = swordMaterial;
      }
    });

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxSide = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxSide;
    scene.scale.setScalar(scale);

    return scene;
  }, [originalScene]);

  useEffect(() => {
    if (onLoaded) {
      onLoaded();
    }
  }, [onLoaded]);

  return (
    <primitive
      object={processedScene}
      rotation={[-Math.PI / 2, 0, 0.1]}
      onClick={onClick}
      onPointerOver={(e: any) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
        setHoveringSword(true);
      }}
      onPointerOut={(e: any) => {
        e.stopPropagation();
        document.body.style.cursor = "default";
        setHoveringSword(false);
      }}
    />
  );
}

export default function TranscendenceSword({ onLoaded }: { onLoaded?: () => void }) {
  const router = useRouter();
  const [hoveringSword, setHoveringSword] = useState(false);

  const handleClick = (e: any) => {
    e.stopPropagation();
    router.push("/match");
  };

  return (
    <div
      className={`${styles.canvasContainer} ${
        hoveringSword ? styles.glow : ""
      }`}
    >
      <Canvas
        camera={{ position: [0, 0, 2.9], fov: 40 }}
        style={{ width: "100%", height: "100%" }}
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <ambientLight intensity={.6} />
        <directionalLight position={[5, 5, 10]} intensity={1.2} />
        <hemisphereLight intensity={0.6} groundColor="#888" />

        <Environment preset="forest" />

        <SwordModel
          onClick={handleClick}
          setHoveringSword={setHoveringSword}
          onLoaded={onLoaded}
        />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={2}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={(3 * Math.PI) / 4}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/blob.glb");
