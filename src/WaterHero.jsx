import React, { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, Environment, Float, Lightformer, Points, PointMaterial, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { easing } from 'maath';

// Preload GLB model for rapid web performance
useGLTF.preload('/water_splash.glb');

// Starry Particle system for beautiful cosmic background
const StarField = ({ count = 250 }) => {
  const pointsRef = useRef();

  const [positions] = useState(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 12 + 2;
      const y = (Math.random() - 0.5) * 8;
      const z = (Math.random() - 0.5) * 4 - 3;
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  });

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.012;
    pointsRef.current.rotation.z = state.clock.getElapsedTime() * 0.005;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3}>
      <PointMaterial
        transparent
        color="#93c5fd"
        size={0.035}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.7}
      />
    </Points>
  );
};

// Main interactive water component loading the custom 3D model splash
const PureWaterSplash = () => {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const pointerSpeed = useRef(0);

  // Load the customized 3D GLB model
  const { scene } = useGLTF('/water_splash.glb');

  // Deeply clone the scene to allow manual material modification
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((node) => {
      if (node.isMesh) {
        // Create the custom hyperrealistic water material
        node.material = new THREE.MeshPhysicalMaterial({
          transmission: 1.0,
          thickness: 3.5,                 // Glass physical refraction thickness
          roughness: 0.0,                 // Mirror smooth
          ior: 1.333,                     // Water Refractive Index
          chromaticAberration: 0.05,
          anisotropy: 1.0,
          color: new THREE.Color("#ffffff"),
          clearcoat: 1.0,
          clearcoatRoughness: 0.0,
          attenuationColor: new THREE.Color("#3b82f6"),
          attenuationDistance: 1.8,
          transparent: true,
          opacity: 1.0,
          side: THREE.DoubleSide
        });
      }
    });
    return clone;
  }, [scene]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Track mouse speed for dynamic reactions
    const dx = state.pointer.x - lastPointer.current.x;
    const dy = state.pointer.y - lastPointer.current.y;
    pointerSpeed.current = Math.min(Math.sqrt(dx * dx + dy * dy) / Math.max(delta, 0.001), 10);
    lastPointer.current = { x: state.pointer.x, y: state.pointer.y };

    // Fluid float rotation
    groupRef.current.rotation.y = 0.45 + state.clock.getElapsedTime() * 0.05;
    groupRef.current.rotation.z = -0.1 + state.clock.getElapsedTime() * 0.015;

    // Much larger scale (2.6 - 2.8) to make the splash look majestically big and close
    const baseScale = 2.6;
    const targetScale = hovered ? baseScale * 1.08 : baseScale + (pointerSpeed.current * 0.012);
    easing.damp3(groupRef.current.scale, [targetScale, targetScale, targetScale], 0.45, delta);

    // Subtle cursor position follow (larger travel range factor / 18)
    const isMobile = state.viewport.width < 7.5;
    const centerOffset = isMobile ? 0 : state.viewport.width * 0.22;
    const verticalOffset = isMobile ? -state.viewport.height * 0.05 : 0.0;

    const targetX = centerOffset + (state.pointer.x * state.viewport.width) / 18;
    const targetY = verticalOffset + (state.pointer.y * state.viewport.height) / 18;
    
    easing.damp3(groupRef.current.position, [targetX, targetY, 0], 0.8, delta);
  });

  return (
    <group 
      ref={groupRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={clonedScene} />
    </group>
  );
};

export default function WaterHeroComponent() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
      <Canvas 
        camera={{ position: [0, 0, 7.0], fov: 45 }}
        dpr={[1, 2]} 
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        {/* Soft fill light from the starry sky backdrop */}
        <ambientLight intensity={0.5} color="#1d4ed8" />
        
        {/* Cinematic spotlights matching the reference reflections */}
        <directionalLight position={[12, 12, 6]} intensity={7.0} color="#ffffff" />
        <directionalLight position={[-12, -6, -4]} intensity={4.0} color="#1e40af" />
        <directionalLight position={[0, -10, 2]} intensity={3.0} color="#3b82f6" />
        <pointLight position={[8, -8, 8]} intensity={5.0} color="#ffffff" />

        {/* Dynamic Studio Environment reflections for beautiful high-contrast glassy edges */}
        <Environment resolution={512}>
          <color attach="background" args={['#050d24']} />
          <Lightformer 
            form="rect" 
            intensity={24}                  // Ultra-bright white highlights on edge reflections
            position={[6, 7, 2]} 
            scale={[20, 10, 1]} 
            target={[0, 0, 0]} 
            color="#ffffff"
          />
          <Lightformer 
            form="circle" 
            intensity={14} 
            position={[-8, 6, -3]} 
            scale={[16, 16, 1]} 
            target={[0, 0, 0]} 
            color="#93c5fd"
          />
          <Lightformer 
            form="rect" 
            intensity={12} 
            position={[0, -9, 4]} 
            scale={[24, 4, 1]} 
            target={[0, 0, 0]} 
            color="#3b82f6"
          />
        </Environment>

        {/* Cosmic floating stars dust */}
        <StarField count={280} />

        <Float speed={0.9} rotationIntensity={0.12} floatIntensity={0.3}>
          <Suspense fallback={null}>
            <PureWaterSplash />
          </Suspense>
        </Float>
      </Canvas>
    </div>
  );
}
