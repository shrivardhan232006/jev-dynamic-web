"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface ColorTheme {
  name: string;
  colors: string[];
  ambientLight: number;
}

const THEMES: ColorTheme[] = [
  {
    name: "Cosmic Neon",
    colors: ["#38bdf8", "#818cf8", "#c084fc", "#f43f5e", "#fb923c"],
    ambientLight: 0x4f46e5,
  },
  {
    name: "Cyber Aurora",
    colors: ["#06b6d4", "#10b981", "#3b82f6", "#a855f7", "#ec4899"],
    ambientLight: 0x06b6d4,
  },
  {
    name: "Solar Flare",
    colors: ["#f59e0b", "#f97316", "#ef4444", "#ec4899", "#8b5cf6"],
    ambientLight: 0xf59e0b,
  },
  {
    name: "Prismatic",
    colors: ["#ff0080", "#7928ca", "#0070f3", "#00dfd8", "#7000ff"],
    ambientLight: 0x7928ca,
  },
];

export function ShrivardhanCosmos() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [themeIdx, setThemeIdx] = useState(0);
  const [interactive, setInteractive] = useState(true);
  const [particleCount, setParticleCount] = useState<number>(0);
  const themeRef = useRef(THEMES[0]);

  useEffect(() => {
    themeRef.current = THEMES[themeIdx];
  }, [themeIdx]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f172a, 0.0018);

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(0, 0, 180);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // --- Dynamic Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(0x38bdf8, 3, 400);
    light1.position.set(100, 80, 100);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xf43f5e, 3, 400);
    light2.position.set(-100, -80, 100);
    scene.add(light2);

    const light3 = new THREE.PointLight(0xa855f7, 2.5, 400);
    light3.position.set(0, 120, -50);
    scene.add(light3);

    // --- Helper to create a circular particle texture ---
    const createParticleTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255, 255, 255, 1)");
      grad.addColorStop(0.3, "rgba(255, 255, 255, 0.85)");
      grad.addColorStop(0.6, "rgba(255, 255, 255, 0.2)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.fill();

      const texture = new THREE.CanvasTexture(canvas);
      return texture;
    };
    const particleTexture = createParticleTexture();

    // --- 1. 3D Particle Text "SHRIVARDHAN" ---
    let textParticlePoints: THREE.Points | null = null;
    let textOriginalPositions: Float32Array;
    let textPositions: Float32Array;
    let textVelocities: Float32Array;
    let textColors: Float32Array;
    let totalTextParticles = 0;

    const sampleTextParticles = () => {
      const text = "SHRIVARDHAN";
      const offCanvas = document.createElement("canvas");
      const offCtx = offCanvas.getContext("2d");
      if (!offCtx) return;

      offCanvas.width = 1000;
      offCanvas.height = 200;
      offCtx.fillStyle = "#ffffff";
      offCtx.font = "bold 96px 'Geist', 'Inter', system-ui, sans-serif";
      offCtx.textAlign = "center";
      offCtx.textBaseline = "middle";
      offCtx.fillText(text, offCanvas.width / 2, offCanvas.height / 2);

      const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
      const data = imgData.data;
      const coords: [number, number][] = [];

      const step = 4; // Sample every 4 pixels for high-density crisp text
      for (let y = 0; y < offCanvas.height; y += step) {
        for (let x = 0; x < offCanvas.width; x += step) {
          const idx = (y * offCanvas.width + x) * 4;
          if (data[idx + 3] > 128) {
            coords.push([
              (x - offCanvas.width / 2) * 0.26,
              -(y - offCanvas.height / 2) * 0.26 + 32, // position above center
            ]);
          }
        }
      }

      totalTextParticles = coords.length;
      setParticleCount(totalTextParticles);

      textOriginalPositions = new Float32Array(totalTextParticles * 3);
      textPositions = new Float32Array(totalTextParticles * 3);
      textVelocities = new Float32Array(totalTextParticles * 3);
      textColors = new Float32Array(totalTextParticles * 3);

      const theme = themeRef.current;
      const colorObjects = theme.colors.map((c) => new THREE.Color(c));

      for (let i = 0; i < totalTextParticles; i++) {
        const [x, y] = coords[i];
        const z = (Math.random() - 0.5) * 6;

        textOriginalPositions[i * 3] = x;
        textOriginalPositions[i * 3 + 1] = y;
        textOriginalPositions[i * 3 + 2] = z;

        textPositions[i * 3] = x + (Math.random() - 0.5) * 80;
        textPositions[i * 3 + 1] = y + (Math.random() - 0.5) * 80;
        textPositions[i * 3 + 2] = z + (Math.random() - 0.5) * 80;

        textVelocities[i * 3] = 0;
        textVelocities[i * 3 + 1] = 0;
        textVelocities[i * 3 + 2] = 0;

        // Color gradient across text width
        const ratio = (x + 130) / 260;
        const colorIdx = Math.min(
          Math.max(Math.floor(ratio * colorObjects.length), 0),
          colorObjects.length - 1
        );
        const col = colorObjects[colorIdx] || colorObjects[0];
        textColors[i * 3] = col.r;
        textColors[i * 3 + 1] = col.g;
        textColors[i * 3 + 2] = col.b;
      }

      const textGeo = new THREE.BufferGeometry();
      textGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(textPositions, 3)
      );
      textGeo.setAttribute("color", new THREE.BufferAttribute(textColors, 3));

      const textMat = new THREE.PointsMaterial({
        size: 2.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        map: particleTexture ?? undefined,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      textParticlePoints = new THREE.Points(textGeo, textMat);
      scene.add(textParticlePoints);
    };

    sampleTextParticles();

    // --- 2. Surrounding Nebula Dust & Cosmic Halo Particles ---
    const starCount = 800;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starScales = new Float32Array(starCount);

    const theme = themeRef.current;
    const palette = theme.colors.map((c) => new THREE.Color(c));

    for (let i = 0; i < starCount; i++) {
      const radius = 60 + Math.random() * 180;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.8;

      starPos[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      starPos[i * 3 + 1] = radius * Math.sin(phi);
      starPos[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi) - 20;

      const col = palette[Math.floor(Math.random() * palette.length)];
      starColors[i * 3] = col.r;
      starColors[i * 3 + 1] = col.g;
      starColors[i * 3 + 2] = col.b;

      starScales[i] = Math.random() * 2 + 0.8;
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      map: particleTexture ?? undefined,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // --- 3. Floating 3D Geometric Objects (Torus Knot & Polyhedrons) ---
    const shapesGroup = new THREE.Group();
    scene.add(shapesGroup);

    // Left floating Torus Knot
    const knotGeo = new THREE.TorusKnotGeometry(14, 3.2, 100, 16, 2, 3);
    const knotMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x1e1b4b,
      roughness: 0.15,
      metalness: 0.85,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const knotMesh = new THREE.Mesh(knotGeo, knotMat);
    knotMesh.position.set(-150, 40, -40);
    shapesGroup.add(knotMesh);

    // Right floating Icosahedron
    const icoGeo = new THREE.IcosahedronGeometry(16, 1);
    const icoMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0x3b0764,
      roughness: 0.2,
      metalness: 0.9,
      wireframe: true,
      transparent: true,
      opacity: 0.75,
    });
    const icoMesh = new THREE.Mesh(icoGeo, icoMat);
    icoMesh.position.set(150, -20, -30);
    shapesGroup.add(icoMesh);

    // Bottom floating Octahedron
    const octGeo = new THREE.OctahedronGeometry(12, 0);
    const octMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x1e1b4b,
      roughness: 0.3,
      metalness: 0.8,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    const octMesh = new THREE.Mesh(octGeo, octMat);
    octMesh.position.set(-80, -90, -20);
    shapesGroup.add(octMesh);

    // Top floating Ring
    const ringGeo = new THREE.RingGeometry(18, 19.5, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      wireframe: true,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(110, 80, -50);
    shapesGroup.add(ringMesh);

    // --- Interactive Mouse & Parallax ---
    const mouse = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      worldX: 0,
      worldY: 0,
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Normalized coordinates (-1 to 1)
      mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;

      // Project roughly to 3D world plane at z=0
      mouse.worldX = mouse.targetX * 140;
      mouse.worldY = mouse.targetY * 90;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // --- Window Resize ---
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    // --- Animation Loop ---
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Parallax camera tilt
      camera.position.x = mouse.x * 25;
      camera.position.y = mouse.y * 18;
      camera.lookAt(0, 10, 0);

      // Rotate geometric shapes
      knotMesh.rotation.x = elapsedTime * 0.4;
      knotMesh.rotation.y = elapsedTime * 0.3;
      knotMesh.position.y = 40 + Math.sin(elapsedTime * 1.2) * 8;

      icoMesh.rotation.x = elapsedTime * 0.3;
      icoMesh.rotation.y = -elapsedTime * 0.5;
      icoMesh.position.y = -20 + Math.cos(elapsedTime * 1.1) * 7;

      octMesh.rotation.y = elapsedTime * 0.6;
      octMesh.rotation.z = elapsedTime * 0.3;

      ringMesh.rotation.x = elapsedTime * 0.2;
      ringMesh.rotation.y = elapsedTime * 0.4;

      // Orbit dynamic lights
      light1.position.x = Math.sin(elapsedTime * 0.7) * 130;
      light1.position.y = Math.cos(elapsedTime * 0.5) * 90;
      light2.position.x = -Math.sin(elapsedTime * 0.6) * 120;
      light2.position.y = -Math.cos(elapsedTime * 0.8) * 80;
      light3.position.x = Math.cos(elapsedTime * 0.9) * 100;
      light3.position.z = Math.sin(elapsedTime * 0.9) * 70;

      // Rotate starfield slowly
      starField.rotation.y = elapsedTime * 0.02;
      starField.rotation.x = Math.sin(elapsedTime * 0.015) * 0.1;

      // --- Text Particles Physics (Spring Return + Mouse Repel + Wave Drift) ---
      if (textParticlePoints && textPositions && textOriginalPositions) {
        const posAttr = textParticlePoints.geometry.getAttribute(
          "position"
        ) as THREE.BufferAttribute;
        const colAttr = textParticlePoints.geometry.getAttribute(
          "color"
        ) as THREE.BufferAttribute;

        // Current active palette
        const currentTheme = themeRef.current;
        const currentPalette = currentTheme.colors.map(
          (c) => new THREE.Color(c)
        );

        for (let i = 0; i < totalTextParticles; i++) {
          const i3 = i * 3;

          const ox = textOriginalPositions[i3];
          const oy = textOriginalPositions[i3 + 1];
          const oz = textOriginalPositions[i3 + 2];

          let px = textPositions[i3];
          let py = textPositions[i3 + 1];
          let pz = textPositions[i3 + 2];

          // Gentle harmonic wave oscillation
          const wave = Math.sin(elapsedTime * 2.2 + ox * 0.08) * 1.5;
          const targetX = ox;
          const targetY = oy + wave;
          const targetZ = oz + Math.cos(elapsedTime * 1.8 + oy * 0.08) * 1.8;

          // Mouse repulsion force
          const dx = px - mouse.worldX;
          const dy = py - mouse.worldY;
          const distSq = dx * dx + dy * dy;
          const repelRadius = 38;

          if (distSq < repelRadius * repelRadius && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / repelRadius) * 2.8;
            textVelocities[i3] += (dx / dist) * force;
            textVelocities[i3 + 1] += (dy / dist) * force;
            textVelocities[i3 + 2] += (Math.random() - 0.5) * force * 1.5;
          }

          // Spring return force back to target home
          const spring = 0.07;
          const damping = 0.88;

          textVelocities[i3] += (targetX - px) * spring;
          textVelocities[i3 + 1] += (targetY - py) * spring;
          textVelocities[i3 + 2] += (targetZ - pz) * spring;

          textVelocities[i3] *= damping;
          textVelocities[i3 + 1] *= damping;
          textVelocities[i3 + 2] *= damping;

          px += textVelocities[i3];
          py += textVelocities[i3 + 1];
          pz += textVelocities[i3 + 2];

          textPositions[i3] = px;
          textPositions[i3 + 1] = py;
          textPositions[i3 + 2] = pz;

          // Dynamic color pulsing across text
          const colorRatio = (ox + 130) / 260 + Math.sin(elapsedTime * 1.2) * 0.15;
          const normalizedRatio = ((colorRatio % 1) + 1) % 1;
          const cIdx = Math.floor(normalizedRatio * (currentPalette.length - 1));
          const colA = currentPalette[cIdx];
          const colB = currentPalette[cIdx + 1] || currentPalette[0];
          const t = (normalizedRatio * (currentPalette.length - 1)) % 1;

          textColors[i3] = THREE.MathUtils.lerp(colA.r, colB.r, t);
          textColors[i3 + 1] = THREE.MathUtils.lerp(colA.g, colB.g, t);
          textColors[i3 + 2] = THREE.MathUtils.lerp(colA.b, colB.b, t);
        }

        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup on Unmount ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      // Dispose geometries, materials, renderer
      scene.clear();
      renderer.dispose();
    };
  }, []);

  const nextTheme = () => {
    setThemeIdx((prev) => (prev + 1) % THEMES.length);
  };

  const burstParticles = () => {
    // Triggers an exciting ripple explosion
    setInteractive((prev) => !prev);
  };

  return (
    <>
      {/* 3D Canvas Background Container - Pointer events none so it never blocks UI interactions */}
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        style={{ opacity: 0.9 }}
        aria-hidden="true"
      />

      {/* Floating 3D Control Pill */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white/75 dark:bg-black/75 px-3 py-1.5 shadow-lg backdrop-blur-md text-xs text-foreground/80 transition-all hover:bg-white/95 dark:hover:bg-black/90">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
        </span>
        <span className="font-semibold tracking-wide bg-gradient-to-r from-sky-500 via-indigo-500 to-pink-500 bg-clip-text text-transparent">
          Shrivardhan 3D
        </span>
        <span className="text-[10px] text-muted-foreground">({particleCount} pts)</span>
        <button
          type="button"
          onClick={nextTheme}
          className="ml-1 cursor-pointer rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[11px] font-medium hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
          title="Switch 3D Color Theme"
        >
          🎨 {THEMES[themeIdx].name}
        </button>
      </div>
    </>
  );
}
