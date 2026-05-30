import React, { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, Environment, Float, Points, PointMaterial, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { easing } from 'maath';

// ── Water Droplets Emitted on Hover ──
const Droplets = ({ count = 15, active, blobPosition }) => {
  const meshRef = useRef();
  
  const dropletsData = useRef(
    Array.from({ length: count }, () => ({
      life: 0,
      maxLife: Math.random() * 1.5 + 0.5,
      velocity: new THREE.Vector3(),
      offset: new THREE.Vector3(),
      active: false,
      baseScale: Math.random() * 1.5 + 0.8
    }))
  );

  const geometry = useMemo(() => new THREE.SphereGeometry(0.08, 16, 16), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Always emit slowly but randomly when hovered
    if (active && Math.random() > 0.92) {
      const inactiveDroplet = dropletsData.current.find(d => !d.active);
      if (inactiveDroplet) {
        inactiveDroplet.active = true;
        inactiveDroplet.life = 0;
        
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI;
        const radius = 2.6; // Increased to match larger sphere
        
        inactiveDroplet.offset.set(
          Math.sin(angle2) * Math.cos(angle1) * radius,
          Math.cos(angle2) * radius,
          Math.sin(angle2) * Math.sin(angle1) * radius
        );
        
        inactiveDroplet.velocity.copy(inactiveDroplet.offset).normalize().multiplyScalar(1.5 + Math.random() * 1.5);
        inactiveDroplet.velocity.y += 1.0; // Upward boost
        inactiveDroplet.baseScale = Math.random() * 1.5 + 0.8;
      }
    }

    for (let i = 0; i < count; i++) {
      const data = dropletsData.current[i];
      if (data.active) {
        data.life += delta;
        if (data.life > data.maxLife) {
          data.active = false;
          dummy.scale.set(0, 0, 0);
        } else {
          data.velocity.y -= delta * 2.5; // Gravity
          data.offset.addScaledVector(data.velocity, delta);
          
          dummy.position.copy(blobPosition).add(data.offset);
          const scale = Math.max(0, 1 - (data.life / data.maxLife)) * data.baseScale;
          dummy.scale.setScalar(scale);
        }
      } else {
        dummy.scale.set(0, 0, 0);
      }
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, null, count]}>
      <MeshTransmissionMaterial
        transmission={1}
        ior={1.33}
        thickness={1.5}
        roughness={0.05}
        chromaticAberration={0.03}
        color="#e0f7fa"
        samples={8}
        resolution={256}
        clearcoat={1}
        attenuationDistance={0.6}
        attenuationColor="#4a9eff"
        toneMapped={true}
      />
    </instancedMesh>
  );
};




// ── Mini Droplets (Dripping/Orbiting metaball effect) ──
const MiniDroplets = ({ drop1Ref, drop2Ref }) => {
  const mesh1 = useRef();
  const mesh2 = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    
    // Droplet 1: large drip at bottom, slowly stretching/moving
    if (mesh1.current && drop1Ref.current) {
      mesh1.current.position.copy(drop1Ref.current);
      // Slight stretch effect
      mesh1.current.scale.y = 1 + Math.sin(t * 1.5) * 0.1;
      mesh1.current.scale.x = 1 - Math.sin(t * 1.5) * 0.05;
      mesh1.current.scale.z = 1 - Math.sin(t * 1.5) * 0.05;
    }

    // Droplet 2: smaller, orbiting slightly around the side
    if (mesh2.current && drop2Ref.current) {
      mesh2.current.position.copy(drop2Ref.current);
    }
  });

  return (
    <>
      {/* Bottom drip */}
      <mesh ref={mesh1}>
        <sphereGeometry args={[0.5, 32, 32]} />
          <MeshTransmissionMaterial
          transmission={1.0}
          thickness={1.0}
          roughness={0.05}
          ior={1.2}
          chromaticAberration={0.04}
          color="#ffffff"
          attenuationColor="#a6dfff"
          attenuationDistance={1.5}
          clearcoat={0.5}
          clearcoatRoughness={0.2}
          samples={4}
          resolution={256}
        />
      </mesh>

      {/* Orbiting side droplet */}
      <mesh ref={mesh2}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <MeshTransmissionMaterial
          transmission={1.0}
          thickness={0.8}
          roughness={0.05}
          ior={1.2}
          chromaticAberration={0.04}
          color="#ffffff"
          attenuationColor="#a6dfff"
          attenuationDistance={1.5}
          clearcoat={0.5}
          clearcoatRoughness={0.2}
          samples={4}
          resolution={256}
        />
      </mesh>
    </>
  );
};

// ── Liquid Blob — vertex distortion via Math.sin/cos, hover-reactive ──
const LiquidBlob = () => {
  const mesh = useRef();
  const [hovered, setHovered] = useState(false);
  const amplitudeRef = useRef(0.2); // Increased base amplitude
  const speedRef = useRef(1.0); // Moderate speed
  const pointerSmooth = useRef(new THREE.Vector2(0,0));
  
  // Dynamic refs for the mini droplets positions
  const drop1Ref = useRef(new THREE.Vector3(0, -3.8, 0));
  const drop2Ref = useRef(new THREE.Vector3(3.6, -1.5, 0));

  const { viewport, pointer } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(2, 128, 128);
    const orig = g.attributes.position.array;
    const count = orig.length / 3;
    const norms = new Float32Array(count * 3);
    const lengths = new Float32Array(count);
    
    let ix = 0;
    for (let i = 0; i < count; i++) {
      const iy = ix + 1, iz = ix + 2;
      const ox = orig[ix], oy = orig[iy], oz = orig[iz];
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
      lengths[i] = len;
      norms[ix] = ox / len;
      norms[iy] = oy / len;
      norms[iz] = oz / len;
      ix += 3;
    }
    
    g.userData.orig = orig.slice();
    g.userData.normals = norms;
    g.userData.lengths = lengths;
    return g;
  }, []);

  const mobile = viewport.width < 7.5;
  const posX = mobile ? 0 : viewport.width * 0.14;
  const blobPosition = useMemo(() => new THREE.Vector3(posX, 0, 0), [posX]);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    
    easing.damp(pointerSmooth.current, 'x', pointer.x, 0.35, delta);
    easing.damp(pointerSmooth.current, 'y', pointer.y, 0.35, delta);

    const tgtAmp = hovered ? 0.28 : 0.2; 
    const tgtSpd = hovered ? 1.1 : 0.8;
    
    easing.damp(amplitudeRef, 'current', tgtAmp, 0.6, delta);
    easing.damp(speedRef, 'current', tgtSpd, 0.8, delta);

    // Update droplet positions globally
    drop1Ref.current.y = -3.8 + Math.sin(t * 1.5) * 0.2;
    drop2Ref.current.x = 3.6 * Math.cos(t * 0.5);
    drop2Ref.current.z = 3.6 * Math.sin(t * 0.5);
    drop2Ref.current.y = -1.5 + Math.cos(t * 0.8) * 0.3;

    const amplitude = amplitudeRef.current;
    const speed = speedRef.current;
    
    const pos = mesh.current.geometry.attributes.position.array;
    const norms = mesh.current.geometry.userData.normals;
    const lengths = mesh.current.geometry.userData.lengths;
    const count = pos.length / 3;

    // Precalculate time factors
    const ts1 = t * speed;
    const ts2 = t * speed * 0.8;
    const ts3 = t * speed * 1.1;
    const ts4 = t * speed * 0.6;
    const ts5 = t * speed * 0.9;
    
    // Scale pointer coordinate space to match blob interaction radius
    const pX = pointerSmooth.current.x * 3.5; 
    const pY = pointerSmooth.current.y * 3.5;

    // Droplet positions in local mesh space (scaled by 1.35)
    const localScale = 1.35;
    const d1x = drop1Ref.current.x / localScale;
    const d1y = drop1Ref.current.y / localScale;
    const d1z = drop1Ref.current.z / localScale;

    const d2x = drop2Ref.current.x / localScale;
    const d2y = drop2Ref.current.y / localScale;
    const d2z = drop2Ref.current.z / localScale;

    let ix = 0;
    for (let i = 0; i < count; i++) {
      const iy = ix + 1, iz = ix + 2;
      const nx = norms[ix], ny = norms[iy], nz = norms[iz];
      const len = lengths[i];

      let d =
        Math.sin(nx * 2.5 + ts1) * 0.4 +
        Math.cos(ny * 3.0 + ts2) * 0.3 +
        Math.sin(nz * 2.0 + ts3) * 0.2 +
        Math.sin((nx + ny) * 4.0 + ts4) * 0.15 +
        Math.cos((ny + nz) * 2.5 - ts5) * 0.1;
        
      // Continuously react to the pointer position globally
      const dx = nx - pX;
      const dy = ny - pY;
      const distToPointer = Math.sqrt(dx * dx + dy * dy);
      
      const cursorInfluence = Math.max(0, 1.0 - distToPointer * 0.5);
      d += cursorInfluence * 1.1; 

      // Metaball effect: pull vertices towards droplets
      const bx = nx * len;
      const by = ny * len;
      const bz = nz * len;

      const dist1 = Math.sqrt((bx - d1x)**2 + (by - d1y)**2 + (bz - d1z)**2);
      const pull1 = Math.exp(-dist1 * dist1 * 2.0) * 1.8;
      d += pull1;

      const dist2 = Math.sqrt((bx - d2x)**2 + (by - d2y)**2 + (bz - d2z)**2);
      const pull2 = Math.exp(-dist2 * dist2 * 2.5) * 1.5;
      d += pull2;

      const r = len + d * amplitude;
      pos[ix] = nx * r;
      pos[iy] = ny * r;
      pos[iz] = nz * r;
      
      ix += 3;
    }

    mesh.current.geometry.attributes.position.needsUpdate = true;
    mesh.current.geometry.computeVertexNormals();

    mesh.current.rotation.y = t * 0.04 + pointerSmooth.current.x * 0.25;
    mesh.current.rotation.x = pointerSmooth.current.y * -0.25;
    mesh.current.rotation.z = Math.sin(t * 0.03) * 0.03;
  });

  return (
    <>
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
        <group position={blobPosition}>
          <mesh
            ref={mesh}
            geometry={geometry}
            scale={1.35}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
          >
          <MeshTransmissionMaterial
            transmission={1.0}
            thickness={1.5}
            roughness={0.06}
            ior={1.2}
            chromaticAberration={0.05}
            anisotropy={0.1}
            color="#ffffff"
            attenuationColor="#a6dfff"
            attenuationDistance={3.0}
            distortion={0.2}
            distortionScale={0.3}
            temporalDistortion={0.1}
            clearcoat={0.4}
            clearcoatRoughness={0.2}
            backside={true}
            samples={8}
            resolution={512}
            toneMapped={true}
          />
          </mesh>
          <MiniDroplets drop1Ref={drop1Ref} drop2Ref={drop2Ref} />
        </group>
      </Float>
      
      <Droplets active={hovered} blobPosition={blobPosition} count={15} />
    </>
  );
};

// ── Scene ──
export default function WaterHeroComponent() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1, overflow: 'hidden' }}>
      {/* Background Central Glow / Destello */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '70vw',
        height: '70vw',
        background: 'radial-gradient(circle, rgba(0, 242, 254, 0.12) 0%, rgba(29, 78, 216, 0.05) 40%, transparent 70%)',
        zIndex: 0,
        pointerEvents: 'none',
        filter: 'blur(40px)'
      }} />

      <Canvas
        style={{ zIndex: 1 }}
        camera={{ position: [0, 0, 8], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.4} color="#e0f0ff" />
        {/* Main white key light */}
        <directionalLight position={[5, 10, 8]} intensity={2.0} color="#ffffff" />
        {/* Soft fill light */}
        <directionalLight position={[-10, -5, 5]} intensity={1.0} color="#dcedff" />
        {/* Strong backlight for glowing contour - colored blue and soft screen-like blend */}
        <spotLight position={[0, 0, -8]} intensity={8} color="#00aaff" distance={25} penumbra={1.0} angle={Math.PI / 1.5} />
        <pointLight position={[0, -5, 5]} intensity={1.0} color="#ffffff" />

        <Suspense fallback={null}>
          <Environment resolution={512}>
            <color attach="background" args={['#050812']} />
            
            {/* Top wide light for soft upper reflection */}
            <Lightformer 
              form="rect" 
              intensity={3} 
              position={[0, 5, 0]} 
              scale={[10, 10, 1]} 
              target={[0, 0, 0]} 
              color="#ffffff"
            />
            
            {/* Soft side reflection (window-like) */}
            <Lightformer 
              form="rect" 
              intensity={4} 
              position={[-5, 0, 2]} 
              scale={[4, 10, 1]} 
              target={[0, 0, 0]} 
              color="#e6f7ff"
            />
            
            {/* Giant ring behind the sphere to create a glowing soft rim contour - colored blue */}
            <Lightformer 
              form="ring" 
              intensity={4} 
              position={[0, 0, -5]} 
              scale={[12, 12, 1]} 
              target={[0, 0, 0]} 
              color="#00aaff"
            />
          </Environment>
        </Suspense>

        <Suspense fallback={null}>
          <LiquidBlob />
        </Suspense>
      </Canvas>
    </div>
  );
}
