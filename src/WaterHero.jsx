import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, Environment, Float, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { easing } from 'maath';

// Ken Perlin's Improved 3D Noise for organic liquid deformation
class ImprovedNoise {
  constructor() {
    this.p = new Uint8Array(512);
    const permutation = [
      151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
      190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,
      136,171,168, 68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,
      46,245,40,244,102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,135,130,116,188,159,
      86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,
      47,16,58,17,182,189,28,42,223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,129,22,
      39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,
      241, 81,51,145,235,249,14,239,107,49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
      138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
    ];
    for (let i = 0; i < 256; i++) {
      this.p[i] = permutation[i];
      this.p[256 + i] = permutation[i];
    }
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(t, a, b) {
    return a + t * (b - a);
  }

  grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.p[X] + Y;
    const AA = this.p[A] + Z;
    const AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y;
    const BA = this.p[B] + Z;
    const BB = this.p[B + 1] + Z;

    return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.p[AA], x, y, z),
                                             this.grad(this.p[BA], x - 1, y, z)),
                                     this.lerp(u, this.grad(this.p[AB], x, y - 1, z),
                                             this.grad(this.p[BB], x - 1, y - 1, z))),
                     this.lerp(v, this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1),
                                             this.grad(this.p[BA + 1], x - 1, y, z - 1)),
                                     this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1),
                                             this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))));
  }
}

const perlin = new ImprovedNoise();

// Reusable animated fluid droplet component
const WaterDroplet = ({ radius, segments, initialPos, noiseScale, noiseIntensity, noiseSpeed, hoverPower, followSpeedFactor }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const pointerSpeed = useRef(0);

  const stateValues = useRef({
    intensity: noiseIntensity,
    speed: noiseSpeed,
    scale: 1.0,
  });

  const geometry = useMemo(() => new THREE.SphereGeometry(radius, segments, segments), [radius, segments]);
  const originalPositions = useMemo(() => geometry.attributes.position.clone(), [geometry]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Track pointer speed
    const dx = state.pointer.x - lastPointer.current.x;
    const dy = state.pointer.y - lastPointer.current.y;
    pointerSpeed.current = Math.min(Math.sqrt(dx * dx + dy * dy) / Math.max(delta, 0.001), 10);
    lastPointer.current = { x: state.pointer.x, y: state.pointer.y };

    // Fluid idle rotation
    meshRef.current.rotation.y += delta * 0.06;
    meshRef.current.rotation.z += delta * 0.02;

    // Soft cursor reactions
    const targetIntensity = hovered ? noiseIntensity * hoverPower : noiseIntensity + (pointerSpeed.current * 0.01);
    const targetSpeed = hovered ? noiseSpeed * 1.5 : noiseSpeed + (pointerSpeed.current * 0.02);
    const targetScale = hovered ? 1.05 : 1.0;

    easing.damp(stateValues.current, 'intensity', targetIntensity, 0.8, delta);
    easing.damp(stateValues.current, 'speed', targetSpeed, 0.9, delta);
    easing.damp(stateValues.current, 'scale', targetScale, 0.5, delta);

    const s = stateValues.current.scale;
    meshRef.current.scale.set(s, s, s);

    // Map desktop/mobile offset
    const isMobile = state.viewport.width < 7.5;
    const centerOffset = isMobile ? 0 : state.viewport.width * 0.22;
    const verticalOffset = isMobile ? -state.viewport.height * 0.05 : 0;

    // Smooth movement with lag, establishing natural liquid hierarchy (smaller drops lag less or more)
    const targetX = centerOffset + initialPos[0] + (state.pointer.x * state.viewport.width) / followSpeedFactor;
    const targetY = verticalOffset + initialPos[1] + (state.pointer.y * state.viewport.height) / followSpeedFactor;
    
    easing.damp3(meshRef.current.position, [targetX, targetY, initialPos[2]], 1.1, delta);

    // Vertex displacement calculations (Perlin liquid noise)
    const time = state.clock.elapsedTime * stateValues.current.speed;
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(originalPositions, i);
      
      const nx = vertex.x * noiseScale + time;
      const ny = vertex.y * noiseScale - time * 0.6;
      const nz = vertex.z * noiseScale + time * 0.8;

      let noiseVal = perlin.noise(nx, ny, nz) * 1.0;
      noiseVal += perlin.noise(nx * 2.0, ny * 2.0, nz * 2.0) * 0.3;
      
      const displacement = noiseVal * stateValues.current.intensity;
      vertex.normalize().multiplyScalar(radius + displacement);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <MeshTransmissionMaterial
        transmission={1.0}
        thickness={1.5}                 // Balanced thickness for natural water refraction
        roughness={0.0}                 // Flawless glossy liquid surface
        ior={1.333}                     // Refractive Index of pure Water
        chromaticAberration={0.03}      // Prism dispersion matching the reference photo
        anisotropy={0.9}
        color="#ffffff"                 // Hyper-pure neutral transparent white water tint
        distortion={0.12}
        distortionScale={0.3}
        temporalDistortion={0.04}
        clearcoat={1.0}
        clearcoatRoughness={0.0}
        attenuationColor="#60a5fa"      // Soft sky-blue glow inside refraction folds
        attenuationDistance={2.5}       // Generous depth that keeps the center clear and beautiful
        backside={true}
      />
    </mesh>
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
        {/* Soft, zafiro blue ambient fill light to mimic the starry cosmic backdrop */}
        <ambientLight intensity={0.6} color="#3b82f6" />
        
        {/* Crisp cinematic direct lighting from the top-left to cast desaturating white edge reflections */}
        <directionalLight position={[12, 12, 6]} intensity={5.5} color="#ffffff" />
        <directionalLight position={[-12, -6, -4]} intensity={3.0} color="#1d4ed8" />
        <directionalLight position={[0, -10, 2]} intensity={2.5} color="#60a5fa" />
        <pointLight position={[8, -8, 8]} intensity={4.0} color="#ffffff" />

        {/* Dynamic Studio Environment reflections: We change the background to #0d2866 (Deep blue) instead of black so the glass is filled with zafiro sky-blue light! */}
        <Environment resolution={512}>
          <color attach="background" args={['#06153b']} />
          <Lightformer 
            form="rect" 
            intensity={16} 
            position={[6, 7, 2]} 
            scale={[20, 10, 1]} 
            target={[0, 0, 0]} 
            color="#ffffff"
          />
          <Lightformer 
            form="circle" 
            intensity={10} 
            position={[-8, 6, -3]} 
            scale={[16, 16, 1]} 
            target={[0, 0, 0]} 
            color="#93c5fd"
          />
          <Lightformer 
            form="rect" 
            intensity={8} 
            position={[0, -9, 4]} 
            scale={[24, 4, 1]} 
            target={[0, 0, 0]} 
            color="#3b82f6"
          />
        </Environment>

        {/* Group floating in sync */}
        <Float speed={1.0} rotationIntensity={0.15} floatIntensity={0.35}>
          {/* Main big water body (organic aspherical deformation) */}
          <WaterDroplet 
            radius={2.1} 
            segments={64} 
            initialPos={[0, 0, 0]} 
            noiseScale={0.5} 
            noiseIntensity={0.14} 
            noiseSpeed={0.5} 
            hoverPower={2.0}
            followSpeedFactor={28}
          />
          
          {/* Top-Right satellite droplet (mimics the reference photo) */}
          <WaterDroplet 
            radius={0.45} 
            segments={32} 
            initialPos={[1.6, 2.0, -0.5]} 
            noiseScale={0.8} 
            noiseIntensity={0.08} 
            noiseSpeed={0.9} 
            hoverPower={1.8}
            followSpeedFactor={22} // Slightly faster reaction for tiny droplet inertia
          />

          {/* Bottom-Left satellite droplet (adds fluid splash depth) */}
          <WaterDroplet 
            radius={0.25} 
            segments={32} 
            initialPos={[-1.2, -1.8, 0.2]} 
            noiseScale={1.2} 
            noiseIntensity={0.06} 
            noiseSpeed={1.2} 
            hoverPower={1.5}
            followSpeedFactor={24}
          />
        </Float>
      </Canvas>
    </div>
  );
}
