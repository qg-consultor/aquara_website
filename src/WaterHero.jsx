import React, { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, Environment, Float, Points, PointMaterial, Lightformer, useTexture, useFBO } from '@react-three/drei';
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
        {...miniDropletMaterialProps}
        color="#0a1930"
        attenuationColor="#021a4a"
        thickness={0.5}
      />
    </instancedMesh>
  );
};




const miniDropletMaterialProps = {
  transmission: 1.0,
  roughness: 0.05,
  ior: 1.2,
  chromaticAberration: 0.04,
  color: "#ffffff",
  attenuationColor: "#a6dfff",
  attenuationDistance: 1.5,
  clearcoat: 0.5,
  clearcoatRoughness: 0.2,
  samples: 4,
  resolution: 256
};

// ── Lens shader — lives at module level (created once, never re-allocated) ──
const LENS_VERT = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const LENS_FRAG = `
  uniform sampler2D uBackground;
  uniform vec2      uResolution;
  uniform float     uIOR;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    // Current fragment's screen-space UV
    vec2 screenUV = gl_FragCoord.xy / uResolution;

    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewPosition);

    // Snell's law refraction  (air n=1 -> water glass n=uIOR)
    float eta = 1.0 / uIOR;
    vec3  R   = refract(-V, N, eta);

    // R.xy projected onto screen = lens distortion offset
    vec2 lensUV = clamp(screenUV + R.xy * 0.18, 0.001, 0.999);
    vec4 bg     = texture2D(uBackground, lensUV);

    // Fresnel rim (bright edge like a real water droplet)
    float NdotV  = max(dot(N, V), 0.0);
    float fresnel = pow(1.0 - NdotV, 4.0);

    // Water-blue tint for transmitted light
    vec3 tint      = vec3(0.78, 0.91, 1.0);
    vec3 transmitted = bg.rgb * tint;

    // Bright white-blue rim
    vec3 finalColor = mix(transmitted, vec3(0.85, 0.95, 1.0), fresnel * 0.70);

    // Sharp specular highlight (top-left key light)
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
    float spec    = pow(max(dot(reflect(-V, N), lightDir), 0.0), 48.0);
    finalColor   += spec * 0.60;

    gl_FragColor = vec4(finalColor, 0.88 + fresnel * 0.12);
  }
`;

// ── Mini Droplets — Screen-Space Lens Refraction ──
// Each frame the scene is rendered into an FBO (without the droplets themselves),
// then the droplets draw using that texture + a Snell's-law lens shader.
// Result: dark over dark background, magnified blob colours when hovering the blob.
const MiniDroplets = ({ drop1Ref, drop2Ref, drop3Ref }) => {
  const mesh1 = useRef();
  const mesh2 = useRef();
  const mesh3 = useRef();
  const { size } = useThree();

  // Render target that captures the scene without the mini droplets
  const fbo = useFBO(512, 512, { stencilBuffer: false });

  // Shared uniforms — updated every frame, shared across all three meshes
  const lensUniforms = useMemo(() => ({
    uBackground: { value: null },
    uResolution:  { value: new THREE.Vector2(size.width, size.height) },
    uIOR:         { value: 1.55 },
  }), []);

  // One material instance, shared by all three spheres (efficient)
  const lensMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms:       lensUniforms,
    vertexShader:   LENS_VERT,
    fragmentShader: LENS_FRAG,
    transparent:    true,
  }), [lensUniforms]);

  // Priority -1: runs BEFORE R3F's automatic render at priority 0
  useFrame((state) => {
    const { gl, scene, camera } = state;
    const t = state.clock.elapsedTime;

    // ── Position updates ──
    if (mesh1.current && drop1Ref.current) {
      mesh1.current.position.copy(drop1Ref.current);
      mesh1.current.scale.y = 1 + Math.sin(t * 1.5) * 0.1;
      mesh1.current.scale.x = 1 - Math.sin(t * 1.5) * 0.05;
      mesh1.current.scale.z = 1 - Math.sin(t * 1.5) * 0.05;
    }
    if (mesh2.current && drop2Ref.current) {
      mesh2.current.position.copy(drop2Ref.current);
    }
    if (mesh3.current && drop3Ref.current) {
      mesh3.current.position.copy(drop3Ref.current);
      mesh3.current.scale.setScalar(1 + Math.sin(t * 2.0) * 0.05);
    }

    // ── FBO capture: hide droplets → render scene → restore ──
    if (mesh1.current) mesh1.current.visible = false;
    if (mesh2.current) mesh2.current.visible = false;
    if (mesh3.current) mesh3.current.visible = false;

    gl.setRenderTarget(fbo);
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    if (mesh1.current) mesh1.current.visible = true;
    if (mesh2.current) mesh2.current.visible = true;
    if (mesh3.current) mesh3.current.visible = true;

    // Push FBO texture and current resolution to shader
    lensUniforms.uBackground.value = fbo.texture;
    lensUniforms.uResolution.value.set(state.size.width, state.size.height);
  }, -1);

  return (
    <>
      {/* Bottom drip */}
      <mesh ref={mesh1} material={lensMaterial}>
        <sphereGeometry args={[0.5, 32, 32]} />
      </mesh>

      {/* Orbiting side droplet */}
      <mesh ref={mesh2} material={lensMaterial}>
        <sphereGeometry args={[0.3, 32, 32]} />
      </mesh>

      {/* Top emerging droplet */}
      <mesh ref={mesh3} material={lensMaterial}>
        <sphereGeometry args={[0.4, 32, 32]} />
      </mesh>
    </>
  );
};

// ── Water Overlay Background Shader ──
const WaterOverlay = () => {
  const { size, camera } = useThree();
  const viewport = useThree((state) => state.viewport.getCurrentViewport(state.camera, new THREE.Vector3(0, 0, -10)));
  const texture = useTexture('https://img.pikbest.com/wp/202408/swimming-pool-water-background-high-resolution-wave-abstract-captivating-textures-in-a_9904458.jpg!sw800');
  texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;

  const uniforms = useMemo(() => ({
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(size.width, size.height) },
    texture1: { value: texture },
  }), [texture, size]);

  useFrame((state) => {
    uniforms.time.value = state.clock.elapsedTime * 1.2; // Equivalent to time += 0.02 at 60fps
    uniforms.resolution.value.set(state.size.width, state.size.height);
  });

  return (
    <mesh position={[0, 0, -10]} scale={[viewport.width * 1.1, viewport.height * 1.1, 1]} renderOrder={-1}>
      <planeGeometry args={[1, 1, 64, 64]} />
      <shaderMaterial
        transparent={false}
        depthWrite={false}
        blending={THREE.NormalBlending}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float time;
          uniform vec2 resolution;
          uniform sampler2D texture1;
          varying vec2 vUv;
          
          void main() {  
            vec2 uv1 = vUv;
            
            float frequency = 15.0;
            float amplitude = 0.015;
            
            float x = uv1.y * frequency + time * 0.7; 
            float y = uv1.x * frequency + time * 0.3;
            
            uv1.x += cos(x + y) * amplitude * cos(y);
            uv1.y += sin(x - y) * amplitude * cos(y);

            vec4 texColor = texture2D(texture1, uv1);
            
            vec3 targetColor = vec3(0.05, 0.08, 0.18);
            vec3 finalColor = texColor.rgb * targetColor * 4.5;
            
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `}
      />
    </mesh>
  );
};

// ── Liquid Blob — vertex distortion via Math.sin/cos, hover-reactive ──
const LiquidBlob = () => {
  const mesh = useRef();
  const [hovered, setHovered] = useState(false);
  const amplitudeRef = useRef(0.2); // Increased base amplitude
  const speedRef = useRef(1.0); // Moderate speed
  const pointerSmooth = useRef(new THREE.Vector2(0, 0));
  // Accumulate base rotation via delta to avoid precision loss / jitter at large t values
  const rotRef = useRef({ y: 0 });

  // Dynamic refs for the mini droplets positions
  const drop1Ref = useRef(new THREE.Vector3(0, -3.8, 0));
  const drop2Ref = useRef(new THREE.Vector3(3.6, -1.5, 0));
  const drop3Ref = useRef(new THREE.Vector3(-1.8, 3.4, 0)); // Top droplet

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

    easing.damp(pointerSmooth.current, 'x', pointer.x, 0.12, delta);
    easing.damp(pointerSmooth.current, 'y', pointer.y, 0.12, delta);

    const tgtAmp = hovered ? 0.28 : 0.2;
    const tgtSpd = hovered ? 1.1 : 0.8;

    easing.damp(amplitudeRef, 'current', tgtAmp, 0.6, delta);
    easing.damp(speedRef, 'current', tgtSpd, 0.8, delta);

    // Update droplet positions globally
    drop1Ref.current.y = -3.8 + Math.sin(t * 1.5) * 0.2;
    drop2Ref.current.x = 3.6 * Math.cos(t * 0.5);
    drop2Ref.current.z = 3.6 * Math.sin(t * 0.5);
    drop2Ref.current.y = -1.5 + Math.cos(t * 0.8) * 0.3;

    // Top droplet slowly moves up and down
    drop3Ref.current.x = -1.8 + Math.sin(t * 0.8) * 0.2;
    drop3Ref.current.y = 3.3 + Math.cos(t * 1.2) * 0.15;

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

    const d3x = drop3Ref.current.x / localScale;
    const d3y = drop3Ref.current.y / localScale;
    const d3z = drop3Ref.current.z / localScale;

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
      // OPTIMIZATION: Math.sqrt() removed to save CPU. We use squared distances directly.
      const bx = nx * len;
      const by = ny * len;
      const bz = nz * len;

      const distSq1 = (bx - d1x) * (bx - d1x) + (by - d1y) * (by - d1y) + (bz - d1z) * (bz - d1z);
      const pull1 = Math.exp(-distSq1 * 2.0) * 1.8;
      d += pull1;

      // pull2/pull3 intentionally weak — prevents the dark groove artifact
      const distSq2 = (bx - d2x) * (bx - d2x) + (by - d2y) * (by - d2y) + (bz - d2z) * (bz - d2z);
      const pull2 = Math.exp(-distSq2 * 2.5) * 0.4;
      d += pull2;

      const distSq3 = (bx - d3x) * (bx - d3x) + (by - d3y) * (by - d3y) + (bz - d3z) * (bz - d3z);
      const pull3 = Math.exp(-distSq3 * 2.5) * 0.4;
      d += pull3;

      const r = len + d * amplitude;
      pos[ix] = nx * r;
      pos[iy] = ny * r;
      pos[iz] = nz * r;

      ix += 3;
    }

    mesh.current.geometry.attributes.position.needsUpdate = true;
    mesh.current.geometry.computeVertexNormals();

    // Accumulate base Y rotation per frame — stays in safe numeric range forever
    rotRef.current.y += delta * 0.04;
    mesh.current.rotation.y = rotRef.current.y + pointerSmooth.current.x * 0.25;
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
          <MiniDroplets drop1Ref={drop1Ref} drop2Ref={drop2Ref} drop3Ref={drop3Ref} />
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
        <pointLight position={[0, -5, 5]} intensity={1.0} color="#ffffff" />

        <Suspense fallback={null}>
          <Environment resolution={512}>
            <color attach="background" args={['#0a1930']} />

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
          </Environment>
        </Suspense>

        <Suspense fallback={null}>
          <WaterOverlay />
          <LiquidBlob />
        </Suspense>
      </Canvas>
    </div>
  );
}
