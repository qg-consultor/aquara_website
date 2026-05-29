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

const WaterShape = () => {
  const meshRef = useRef();
  const materialRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  // Ref to interpolate state values smoothly
  const stateValues = useRef({
    intensity: 0.15,
    speed: 0.8,
    scale: 1.0,
    targetX: 0,
    targetY: 0,
  });

  const baseRadius = 2.0;
  // Detail of 24 is optimal for smooth organic sphere and excellent CPU calculations
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(baseRadius, 24), []);
  const originalPositions = useMemo(() => geometry.attributes.position.clone(), [geometry]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Slow and constant Y rotation
    meshRef.current.rotation.y += delta * 0.08;
    meshRef.current.rotation.z += delta * 0.03;

    // Smoothly interpolate hover states using maath easing
    easing.damp(stateValues.current, 'intensity', hovered ? 0.65 : 0.18, 0.45, delta);
    easing.damp(stateValues.current, 'speed', hovered ? 1.6 : 0.8, 0.5, delta);
    easing.damp(stateValues.current, 'scale', hovered ? 1.12 : 1.0, 0.35, delta);

    // Apply scale dampening
    const s = stateValues.current.scale;
    meshRef.current.scale.set(s, s, s);

    // Subtle cursor tracking
    const followFactor = 15;
    const targetX = (state.pointer.x * state.viewport.width) / followFactor;
    const targetY = (state.pointer.y * state.viewport.height) / followFactor;
    easing.damp3(meshRef.current.position, [targetX, targetY, 0], 0.6, delta);

    // Compute Perlin Noise vertex deformation
    const time = state.clock.elapsedTime * stateValues.current.speed;
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const noiseScale = 0.85;

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(originalPositions, i);
      
      // Calculate 3D Perlin noise based on spatial coordinates and time
      const nx = vertex.x * noiseScale + time;
      const ny = vertex.y * noiseScale - time * 0.9;
      const nz = vertex.z * noiseScale + time * 1.1;

      // Layered multi-octave Perlin noise for realism
      let noiseVal = perlin.noise(nx, ny, nz) * 1.0;
      noiseVal += perlin.noise(nx * 2.0, ny * 2.0, nz * 2.0) * 0.4;
      
      const displacement = noiseVal * stateValues.current.intensity;
      
      // Deform along original normal vector (which is the normalized original position vector)
      vertex.normalize().multiplyScalar(baseRadius + displacement);
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
        ref={materialRef}
        transmission={1.0}
        thickness={1.6}
        roughness={0.02}
        ior={1.333} // Water refractive index
        chromaticAberration={0.08} // Elegant rainbow dispersion
        anisotropy={0.5}
        color="#d5f4fc" // Pristine clear blue/cyan tint
        distortion={0.25}
        distortionScale={0.4}
        temporalDistortion={0.15}
        clearcoat={1.0}
        clearcoatRoughness={0.01}
        attenuationColor="#ffffff"
        attenuationDistance={2.0}
        backside={true}
      />
    </mesh>
  );
};

export default function WaterHeroComponent() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
      <Canvas 
        camera={{ position: [0, 0, 7.5], fov: 45 }}
        dpr={[1, 2]} 
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.2} color="#8abeff" />
        
        {/* Dynamic Specular Highlights & studio lighting */}
        <directionalLight position={[10, 8, 5]} intensity={3.5} color="#ffffff" />
        <directionalLight position={[-8, -6, -4]} intensity={2.0} color="#1b4dff" />
        <directionalLight position={[0, -10, 2]} intensity={1.5} color="#00d5ff" />
        <pointLight position={[5, -5, 5]} intensity={2.0} color="#ffffff" />

        {/* Customized Dark Studio Environment Map with Lightformers for perfect reflections */}
        <Environment resolution={512}>
          <color attach="background" args={['#050812']} />
          <Lightformer 
            form="rect" 
            intensity={8} 
            position={[4, 5, 2]} 
            scale={[12, 6, 1]} 
            target={[0, 0, 0]} 
            color="#ffffff"
          />
          <Lightformer 
            form="circle" 
            intensity={6} 
            position={[-5, 4, -3]} 
            scale={[8, 8, 1]} 
            target={[0, 0, 0]} 
            color="#00f2fe"
          />
          <Lightformer 
            form="rect" 
            intensity={4} 
            position={[0, -6, 4]} 
            scale={[15, 3, 1]} 
            target={[0, 0, 0]} 
            color="#4facfe"
          />
        </Environment>

        <Float speed={1.8} rotationIntensity={0.3} floatIntensity={0.8}>
          <WaterShape />
        </Float>
      </Canvas>
    </div>
  );
}

