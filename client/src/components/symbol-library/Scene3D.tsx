/**
 * Scene3D – React Three Fiber canvas that renders floating emoji symbols
 * with category-themed lighting, particles and hover/click interactions.
 *
 * Lazy-loaded via React.lazy() so the ~550 KB Three.js bundle is only
 * fetched when the Symbol Library popup is actually opened.
 */
import React, { useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Float, Stars, Sparkles } from "@react-three/drei";
import { Color, CanvasTexture, Mesh, WebGLRenderer, DoubleSide, Vector3 } from "three";

// ─── types ────────────────────────────────────────────────────────────
export type SceneSymbol = {
  id: string;
  char: string;
  nameAr: string;
  nameEn: string;
};

export type Scene3DProps = {
  symbols: SceneSymbol[];
  accentColor: string;
  onSymbolClick?: (sym: SceneSymbol) => void;
  particleColor?: string;
  enableStars?: boolean;
};

// ─── emoji texture cache ──────────────────────────────────────────────
const textureCache = new Map<string, CanvasTexture>();

function getEmojiTexture(emoji: string): CanvasTexture {
  if (textureCache.has(emoji)) return textureCache.get(emoji)!;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.font = `${size * 0.65}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(emoji, texture);
  return texture;
}

// ─── single floating emoji ───────────────────────────────────────────
function FloatingEmoji({
  symbol,
  position,
  accentHex,
  onClick,
}: {
  symbol: SceneSymbol;
  position: [number, number, number];
  accentHex: string;
  onClick?: () => void;
}) {
  const meshRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const texture = useMemo(() => getEmojiTexture(symbol.char), [symbol.char]);
  const accentColor = useMemo(() => new Color(accentHex), [accentHex]);

  // scratch vectors (avoid GC inside useFrame)
  const targetScale = useRef(new Vector3(1, 1, 1));

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    // gentle float
    meshRef.current.position.y =
      position[1] + Math.sin(t * 1.2 + position[0] * 2) * 0.08;
    // gentle wobble
    meshRef.current.rotation.z = Math.sin(t * 0.8 + position[0]) * 0.06;
    meshRef.current.rotation.y = Math.sin(t * 0.5 + position[1]) * 0.1;

    // smooth scale
    const s = hovered ? 1.35 : 1;
    targetScale.current.set(s, s, s);
    meshRef.current.scale.lerp(targetScale.current, 0.12);

    // glow pulse
    if (glowRef.current) {
      const gs = 1.6 + Math.sin(t * 2 + position[0]) * 0.1;
      glowRef.current.scale.set(gs, gs, gs);
      (glowRef.current.material as any).opacity =
        hovered ? 0.25 : 0.08 + Math.sin(t * 1.5) * 0.04;
    }
  });

  return (
    <Float
      speed={1.4 + Math.abs(position[0]) * 0.2}
      rotationIntensity={0.15}
      floatIntensity={0.4}
    >
      <group position={position}>
        {/* glow sphere behind */}
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshBasicMaterial
            color={accentColor}
            transparent
            opacity={0.1}
            depthWrite={false}
          />
        </mesh>

        {/* emoji plane */}
        <mesh
          ref={meshRef}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "default";
          }}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          <planeGeometry args={[0.85, 0.85]} />
          <meshBasicMaterial
            map={texture}
            transparent
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
    </Float>
  );
}

// ─── scene content (inside Canvas) ──────────────────────────────────
function SceneContent({
  symbols,
  accentColor,
  onSymbolClick,
  particleColor,
  enableStars = true,
}: Scene3DProps) {
  const { viewport } = useThree();

  // compute grid positions for up to 15 symbols
  const displaySymbols = useMemo(() => symbols.slice(0, 15), [symbols]);

  const positions = useMemo<[number, number, number][]>(() => {
    const cols = Math.min(5, displaySymbols.length);
    const rows = Math.ceil(displaySymbols.length / cols);
    const cellW = Math.min(viewport.width * 0.16, 1.4);
    const cellH = 1.3;
    return displaySymbols.map((_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x =
        (col - (cols - 1) / 2) * cellW +
        (Math.random() - 0.5) * 0.15;
      const y =
        ((rows - 1) / 2 - row) * cellH * 0.65 +
        (Math.random() - 0.5) * 0.15;
      const z = -1 + Math.random() * 0.4;
      return [x, y, z] as [number, number, number];
    });
  }, [displaySymbols, viewport.width]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <pointLight
        position={[4, 3, 4]}
        color={accentColor}
        intensity={0.8}
        distance={12}
      />
      <pointLight
        position={[-4, -2, 3]}
        color="#ffffff"
        intensity={0.35}
        distance={10}
      />

      {/* Background effects */}
      {enableStars && (
        <Stars
          radius={40}
          depth={30}
          count={150}
          factor={2.5}
          saturation={0}
          fade
          speed={0.8}
        />
      )}
      <Sparkles
        count={25}
        scale={7}
        size={3}
        speed={0.25}
        color={particleColor || accentColor}
      />

      {/* Floating symbols */}
      {displaySymbols.map((sym, i) => (
        <FloatingEmoji
          key={sym.id}
          symbol={sym}
          position={positions[i]}
          accentHex={accentColor}
          onClick={() => onSymbolClick?.(sym)}
        />
      ))}
    </>
  );
}

// ─── main export ─────────────────────────────────────────────────────
export default function Scene3D(props: Scene3DProps) {
  const handleCreated = useCallback(
    ({ gl }: { gl: WebGLRenderer }) => {
      gl.setClearColor(new Color(0x000000), 0); // transparent bg
    },
    [],
  );

  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 50 }}
      dpr={[1, 1.5]}
      onCreated={handleCreated}
      style={{ background: "transparent" }}
      gl={{ alpha: true, antialias: true, powerPreference: "default" }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
