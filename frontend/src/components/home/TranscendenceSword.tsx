"use client";

import { Suspense, useEffect, useRef, useMemo } from "react";
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
      {/* Outer ring */}
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

      {/* Inner ring */}
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
      {/* Chrome Orb */}
      <mesh>
        <sphereGeometry args={[0.6, 64, 64]} />
        <meshStandardMaterial
          metalness={1}
          roughness={0.15}
          envMapIntensity={2}
        />
      </mesh>

      {/* Rotating Halo Ring */}
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

function SwordModel({ onClick }: { onClick: (e: any) => void }) {
  const startTime = performance.now();
  const { scene: originalScene } = useGLTF("/blob.glb");

  // Use useMemo to cache the processed scene
  const processedScene = useMemo(() => {
    console.log("⏱️ Model loaded in:", performance.now() - startTime, "ms");
    const cloneStart = performance.now();
    const scene = originalScene.clone(true);
    console.log("⏱️ Scene cloned in:", performance.now() - cloneStart, "ms");

    const materialStart = performance.now();
    // Create a single shared material instead of one per mesh
    const sharedMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#5b4777"),
      metalness: 1.0,
      roughness: 0.15,
      envMapIntensity: 1.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });

    // --- CHROME MATERIAL OVERRIDE ---
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Use the shared material for all meshes
        mesh.material = sharedMaterial;
      }
    });
    console.log("⏱️ Materials processed in:", performance.now() - materialStart, "ms");

    // --- CENTER & SCALE ---
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    scene.position.x -= center.x;
    scene.position.y -= center.y;
    scene.position.z -= center.z;

    const maxSide = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxSide;
    scene.scale.setScalar(scale);

    console.log("⏱️ Total initialization:", performance.now() - startTime, "ms");
    return scene;
  }, [originalScene, startTime]);

  return (
    <primitive
      object={processedScene}
      rotation={[-Math.PI / 2, 0, 0.1]}
      onClick={onClick}
      onPointerOver={(e: any) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e: any) => {
        e.stopPropagation();
        document.body.style.cursor = 'default';
      }}
    />
  );
}

export default function TranscendenceSword() {
  const router = useRouter();

  const handleClick = (e: any) => {
    e.stopPropagation();
    router.push("/match");
  };

  return (
    <div className={styles.canvasContainer}>
      <Canvas
      
        camera={{ position: [0, 0, 2.5], fov: 40 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Suspense fallback={
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#5b4777" wireframe />
          </mesh>
        }>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 10]} intensity={1.2} />
          <pointLight position={[-5, -3, -5]} intensity={0.7} color="#ffdca8" />

          {/* Better reflections for chrome */}
          <Environment preset="studio" />

          {/* <ChromeCore />
          <DualRings /> */}
          <SwordModel onClick={handleClick} />

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={2}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={(3 * Math.PI) / 4}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload("/blob.glb");
