import React, { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, Environment, Float, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { easing } from 'maath';

// ── Interactive Star/Particle Field ──
const InteractiveStarField = ({ count = 400 }) => {
  const ref = useRef();
  const { viewport, pointer } = useThree();
  const mouse = useRef(new THREE.Vector2(0, 0));
  
  // Store original positions to allow particles to return to their place
  const { positions, originalPositions, randomFactors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const orig = new Float32Array(count * 3);
    const rand = new Float32Array(count); 
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 15;
      const z = (Math.random() - 0.5) * 10 - 2;
      
      pos[i*3] = orig[i*3] = x;
      pos[i*3+1] = orig[i*3+1] = y;
      pos[i*3+2] = orig[i*3+2] = z;
      
      rand[i] = Math.random() * 0.5 + 0.5; 
    }
    return { positions: pos, originalPositions: orig, randomFactors: rand };
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    
    const t = state.clock.elapsedTime;
    
    easing.damp(mouse.current, 'x', pointer.x, 0.15, delta);
    easing.damp(mouse.current, 'y', pointer.y, 0.15, delta);
    
    const mouseX = (mouse.current.x * viewport.width) / 2;
    const mouseY = (mouse.current.y * viewport.height) / 2;
    
    const pos = ref.current.geometry.attributes.position.array;
    
    for (let i = 0; i < count; i++) {
      const ix = i * 3, iy = ix + 1, iz = ix + 2;
      
      let targetX = originalPositions[ix];
      let targetY = originalPositions[iy];
      let targetZ = originalPositions[iz];
      
      targetX += Math.sin(t * 0.5 * randomFactors[i] + originalPositions[iy]) * 0.3;
      targetY += Math.cos(t * 0.3 * randomFactors[i] + originalPositions[ix]) * 0.3;
      
      const dx = targetX - mouseX;
      const dy = targetY - mouseY;
      const distSq = dx * dx + dy * dy;
      const interactionRadius = 9.0;
      
      if (distSq < interactionRadius) {
        const force = (1.0 - distSq / interactionRadius) * 2.0 * randomFactors[i];
        const dist = Math.sqrt(distSq) || 0.1;
        targetX += (dx / dist) * force;
        targetY += (dy / dist) * force;
        targetZ += force * 0.5; 
      }
      
      pos[ix] += (targetX - pos[ix]) * 0.05;
      pos[iy] += (targetY - pos[iy]) * 0.05;
      pos[iz] += (targetZ - pos[iz]) * 0.05;
    }
    
    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.rotation.y = t * 0.02;
    ref.current.rotation.x = Math.sin(t * 0.01) * 0.02;
  });

  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial
        transparent color="#4fc3f7" size={0.035}
        sizeAttenuation depthWrite={false}
        blending={THREE.AdditiveBlending} opacity={0.6}
      />
    </Points>
  );
};

// ── Water Droplets Emitted on Hover ──
const Droplets = ({ count = 20, active, blobPosition }) => {
  const ref = useRef();
  
  const dropletsData = useRef(
    Array.from({ length: count }, () => ({
      life: 0,
      maxLife: Math.random() * 1.5 + 0.5,
      velocity: new THREE.Vector3(),
      offset: new THREE.Vector3(),
      active: false
    }))
  );

  const geometry = useMemo(() => new THREE.SphereGeometry(0.06, 16, 16), []);
  // Use THREE.MeshPhysicalMaterial instead of Drei's component for instanced/mapped droplets
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
     transmission: 1, 
     ior: 1.33, 
     thickness: 0.5, 
     roughness: 0.0, 
     color: new THREE.Color("#e0f7fa")
  }), []);

  useFrame((state, delta) => {
    if (!ref.current) return;
    
    // Activate new droplets if hovering
    if (active && Math.random() > 0.6) {
      const inactiveDroplet = dropletsData.current.find(d => !d.active);
      if (inactiveDroplet) {
        inactiveDroplet.active = true;
        inactiveDroplet.life = 0;
        
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI;
        const radius = 2.0; 
        
        inactiveDroplet.offset.set(
          Math.sin(angle2) * Math.cos(angle1) * radius,
          Math.cos(angle2) * radius,
          Math.sin(angle2) * Math.sin(angle1) * radius
        );
        
        inactiveDroplet.velocity.copy(inactiveDroplet.offset).normalize().multiplyScalar(1.5 + Math.random() * 1.5);
        inactiveDroplet.velocity.y += 1.0; // Upward boost
      }
    }

    ref.current.children.forEach((mesh, i) => {
      const data = dropletsData.current[i];
      if (data.active) {
        data.life += delta;
        
        if (data.life > data.maxLife) {
          data.active = false;
          mesh.visible = false;
        } else {
          mesh.visible = true;
          data.velocity.y -= delta * 2.5; // Gravity
          data.offset.addScaledVector(data.velocity, delta);
          
          mesh.position.copy(blobPosition).add(data.offset);
          
          const scale = Math.max(0, 1 - (data.life / data.maxLife));
          mesh.scale.setScalar(scale);
        }
      } else {
        mesh.visible = false;
      }
    });
  });

  return (
    <group ref={ref}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} geometry={geometry} material={material} visible={false} />
      ))}
    </group>
  );
};


// ── Liquid Blob — vertex distortion via Math.sin/cos, hover-reactive ──
const LiquidBlob = () => {
  const mesh = useRef();
  const [hovered, setHovered] = useState(false);
  const amplitudeRef = useRef(0.12);
  const speedRef = useRef(0.6);
  const pointerSmooth = useRef(new THREE.Vector2(0,0));
  
  const { viewport, pointer } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(2, 128, 128);
    g.userData.orig = g.attributes.position.array.slice();
    return g;
  }, []);

  const mobile = viewport.width < 7.5;
  const posX = mobile ? 0 : viewport.width * 0.14;
  const blobPosition = useMemo(() => new THREE.Vector3(posX, 0, 0), [posX]);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    
    easing.damp(pointerSmooth.current, 'x', pointer.x, 0.15, delta);
    easing.damp(pointerSmooth.current, 'y', pointer.y, 0.15, delta);

    const tgtAmp = hovered ? 0.28 : 0.12; 
    const tgtSpd = hovered ? 1.6 : 0.6;
    
    easing.damp(amplitudeRef, 'current', tgtAmp, 0.25, delta);
    easing.damp(speedRef, 'current', tgtSpd, 0.35, delta);

    const amplitude = amplitudeRef.current;
    const speed = speedRef.current;
    
    const pos = mesh.current.geometry.attributes.position.array;
    const orig = mesh.current.geometry.userData.orig;
    const count = pos.length / 3;

    for (let i = 0; i < count; i++) {
      const ix = i * 3, iy = ix + 1, iz = ix + 2;
      const ox = orig[ix], oy = orig[iy], oz = orig[iz];
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
      const nx = ox / len, ny = oy / len, nz = oz / len;

      let d =
        Math.sin(nx * 2.5 + t * speed) * 0.4 +
        Math.cos(ny * 3.0 + t * speed * 0.8) * 0.3 +
        Math.sin(nz * 2.0 + t * speed * 1.1) * 0.2 +
        Math.sin((nx + ny) * 4.0 + t * speed * 0.6) * 0.15 +
        Math.cos((ny + nz) * 2.5 - t * speed * 0.9) * 0.1;
        
      if (hovered) {
         // Map pointer to object space for bulge effect
         const pX = pointerSmooth.current.x * 2.5; 
         const pY = pointerSmooth.current.y * 2.5;
         
         const distToPointer = Math.sqrt(Math.pow(nx - pX, 2) + Math.pow(ny - pY, 2));
         const cursorInfluence = Math.max(0, 1.0 - distToPointer * 0.7);
         d += cursorInfluence * 0.4; 
      }

      const r = len + d * amplitude;
      pos[ix] = nx * r;
      pos[iy] = ny * r;
      pos[iz] = nz * r;
    }

    mesh.current.geometry.attributes.position.needsUpdate = true;
    mesh.current.geometry.computeVertexNormals();

    mesh.current.rotation.y = t * 0.04 + pointerSmooth.current.x * 0.15;
    mesh.current.rotation.x = pointerSmooth.current.y * -0.15;
    mesh.current.rotation.z = Math.sin(t * 0.03) * 0.03;
  });

  return (
    <>
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
        <mesh
          ref={mesh}
          geometry={geometry}
          position={blobPosition}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <MeshTransmissionMaterial
            transmission={1}
            ior={1.33}
            thickness={1.5}
            roughness={0.05}
            chromaticAberration={0.03}
            color="#e0f7fa"
            backside
            backsideThickness={0.3}
            samples={16}
            resolution={1024}
            clearcoat={1}
            attenuationDistance={0.6}
            attenuationColor="#4a9eff"
            toneMapped={true}
          />
        </mesh>
      </Float>
      
      <Droplets active={hovered} blobPosition={blobPosition} count={25} />
    </>
  );
};

// ── Scene ──
export default function WaterHeroComponent() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[8, 12, 6]} intensity={3.5} color="#cce7ff" />
        <directionalLight position={[-6, -4, -4]} intensity={2.0} color="#1e40af" />
        <pointLight position={[0, -2, 5]} intensity={1.5} color="#00f2fe" distance={10} />

        <Environment preset="city" />

        <InteractiveStarField count={450} />

        <Suspense fallback={null}>
          <LiquidBlob />
        </Suspense>
      </Canvas>
    </div>
  );
}
