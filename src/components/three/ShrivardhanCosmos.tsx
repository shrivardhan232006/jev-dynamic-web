"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

interface ColorTheme {
  name: string;
  frontColor: number;
  sideColor: number;
  emissive: number;
  particles: string[];
  lights: [number, number, number];
}

const THEMES: ColorTheme[] = [
  {
    name: "Cosmic Cyber",
    frontColor: 0x38bdf8,
    sideColor: 0x6366f1,
    emissive: 0x1e1b4b,
    particles: ["#38bdf8", "#818cf8", "#c084fc", "#f43f5e", "#34d399"],
    lights: [0x38bdf8, 0xf43f5e, 0xa855f7],
  },
  {
    name: "Prismatic Gold",
    frontColor: 0xfbbf24,
    sideColor: 0xf97316,
    emissive: 0x451a03,
    particles: ["#f59e0b", "#fb923c", "#ef4444", "#ec4899", "#8b5cf6"],
    lights: [0xf59e0b, 0xec4899, 0x06b6d4],
  },
  {
    name: "Electric Aurora",
    frontColor: 0x34d399,
    sideColor: 0x06b6d4,
    emissive: 0x064e3b,
    particles: ["#10b981", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"],
    lights: [0x10b981, 0x06b6d4, 0x8b5cf6],
  },
  {
    name: "Neon Sunset",
    frontColor: 0xf43f5e,
    sideColor: 0x8b5cf6,
    emissive: 0x3b0764,
    particles: ["#f43f5e", "#ec4899", "#d946ef", "#8b5cf6", "#38bdf8"],
    lights: [0xf43f5e, 0x8b5cf6, 0xfacc15],
  },
];

export function ShrivardhanCosmos() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [themeIdx, setThemeIdx] = useState(0);
  const themeRef = useRef(THEMES[0]);

  useEffect(() => {
    themeRef.current = THEMES[themeIdx];
  }, [themeIdx]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f172a, 0.0014);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1500
    );
    // Position camera
    camera.position.set(0, 5, 175);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // --- Volumetric Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(0, 80, 100);
    scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(themeRef.current.lights[0], 4, 350);
    pointLight1.position.set(90, 60, 60);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(themeRef.current.lights[1], 4, 350);
    pointLight2.position.set(-90, -40, 60);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(themeRef.current.lights[2], 3.5, 300);
    pointLight3.position.set(0, 90, -20);
    scene.add(pointLight3);

    // --- Particle Texture Generator ---
    const createParticleTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255, 255, 255, 1)");
      grad.addColorStop(0.3, "rgba(255, 255, 255, 0.8)");
      grad.addColorStop(0.65, "rgba(255, 255, 255, 0.2)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.fill();

      return new THREE.CanvasTexture(canvas);
    };
    const particleTexture = createParticleTexture();

    // --- 1. SOLID BOLD 3D LETTERS "SHRIVARDHAN" ---
    const textGroup = new THREE.Group();
    scene.add(textGroup);

    let textMesh: THREE.Mesh | null = null;
    let frontMat: THREE.MeshStandardMaterial;
    let sideMat: THREE.MeshStandardMaterial;

    const fontLoader = new FontLoader();
    fontLoader.load(
      "/helvetiker_bold.typeface.json",
      (font) => {
        // Base size for 3D text
        const textGeo = new TextGeometry("SHRIVARDHAN", {
          font: font,
          size: 11,
          depth: 3.5,
          curveSegments: 12,
          bevelEnabled: true,
          bevelThickness: 0.9,
          bevelSize: 0.5,
          bevelOffset: 0,
          bevelSegments: 5,
        });

        textGeo.computeVertexNormals();
        textGeo.center(); // Center horizontally & vertically

        const currentTheme = themeRef.current;

        frontMat = new THREE.MeshStandardMaterial({
          color: currentTheme.frontColor,
          metalness: 0.85,
          roughness: 0.18,
          emissive: currentTheme.emissive,
          emissiveIntensity: 0.4,
        });

        sideMat = new THREE.MeshStandardMaterial({
          color: currentTheme.sideColor,
          metalness: 0.75,
          roughness: 0.3,
          emissive: currentTheme.emissive,
          emissiveIntensity: 0.6,
        });

        textMesh = new THREE.Mesh(textGeo, [frontMat, sideMat]);
        textMesh.castShadow = true;
        textMesh.receiveShadow = true;

        textGroup.add(textMesh);
        adjustTextScale();
      },
      undefined,
      (err) => {
        console.warn("Could not load 3D font, falling back to particle typography", err);
      }
    );

    // Calculate scale and position so SHRIVARDHAN fits beautifully on both mobile and desktop
    const adjustTextScale = () => {
      const w = window.innerWidth;
      const isMobile = w < 768;

      if (textMesh) {
        // Base width of "SHRIVARDHAN" is approx 115 world units
        // On mobile (e.g. 390px), world width is approx 75 units, so scale = 0.52
        // On desktop, scale = 0.95
        const targetScale = isMobile
          ? Math.max(Math.min((w / 768) * 0.75, 0.65), 0.42)
          : Math.min(Math.max((w / 1440) * 1.0, 0.8), 1.15);

        textMesh.scale.setScalar(targetScale);

        // Position above the input container
        // On mobile, position slightly higher (y = 48), on desktop y = 44
        textGroup.position.set(0, isMobile ? 48 : 44, 0);
      }
    };

    // --- 2. Surrounding Nebula & Stardust Particles ---
    const starCount = 650;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const palette = themeRef.current.particles.map((c) => new THREE.Color(c));

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 160;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.85;

      starPos[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      starPos[i * 3 + 1] = radius * Math.sin(phi);
      starPos[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi) - 25;

      const col = palette[Math.floor(Math.random() * palette.length)];
      starColors[i * 3] = col.r;
      starColors[i * 3 + 1] = col.g;
      starColors[i * 3 + 2] = col.b;
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      map: particleTexture ?? undefined,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // --- 3. Floating 3D Geometric Gem Shapes ---
    const shapesGroup = new THREE.Group();
    scene.add(shapesGroup);

    // Left floating Torus Knot
    const knotGeo = new THREE.TorusKnotGeometry(12, 2.8, 90, 16, 2, 3);
    const knotMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.2,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const knotMesh = new THREE.Mesh(knotGeo, knotMat);
    shapesGroup.add(knotMesh);

    // Right floating Icosahedron
    const icoGeo = new THREE.IcosahedronGeometry(14, 1);
    const icoMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      metalness: 0.9,
      roughness: 0.2,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    const icoMesh = new THREE.Mesh(icoGeo, icoMat);
    shapesGroup.add(icoMesh);

    // Bottom floating Octahedron
    const octGeo = new THREE.OctahedronGeometry(11, 0);
    const octMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.8,
      roughness: 0.25,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const octMesh = new THREE.Mesh(octGeo, octMat);
    shapesGroup.add(octMesh);

    const positionShapes = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        // Move geometries wider / further back so they frame phone screen without blocking cards
        knotMesh.position.set(-65, 30, -50);
        icoMesh.position.set(65, -10, -50);
        octMesh.position.set(0, -75, -40);
        knotMesh.scale.setScalar(0.7);
        icoMesh.scale.setScalar(0.7);
        octMesh.scale.setScalar(0.7);
      } else {
        knotMesh.position.set(-145, 35, -30);
        icoMesh.position.set(145, -20, -30);
        octMesh.position.set(-70, -80, -20);
        knotMesh.scale.setScalar(1);
        icoMesh.scale.setScalar(1);
        octMesh.scale.setScalar(1);
      }
    };
    positionShapes();

    // --- Interactive Mouse & Mobile Touch Controls ---
    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
    };

    const handleMouseMove = (e: MouseEvent) => {
      pointer.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        pointer.targetX = (touch.clientX / window.innerWidth) * 2 - 1;
        pointer.targetY = -(touch.clientY / window.innerHeight) * 2 + 1;
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    // --- Resize Handler ---
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      adjustTextScale();
      positionShapes();
    };

    window.addEventListener("resize", handleResize);

    // --- Animation Loop ---
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth pointer interpolation
      pointer.x += (pointer.targetX - pointer.x) * 0.05;
      pointer.y += (pointer.targetY - pointer.y) * 0.05;

      // Camera parallax tilt
      camera.position.x = pointer.x * 18;
      camera.position.y = 5 + pointer.y * 12;
      camera.lookAt(0, 15, 0);

      // 3D Solid Text dynamic float & subtle tilt
      if (textMesh) {
        textMesh.rotation.y = Math.sin(elapsed * 1.1) * 0.08 + pointer.x * 0.15;
        textMesh.rotation.x = Math.cos(elapsed * 0.9) * 0.05 - pointer.y * 0.12;
        textMesh.position.y = Math.sin(elapsed * 1.5) * 1.8;

        // Smooth color transition on theme change
        const currentTheme = themeRef.current;
        frontMat.color.lerp(new THREE.Color(currentTheme.frontColor), 0.06);
        sideMat.color.lerp(new THREE.Color(currentTheme.sideColor), 0.06);
        frontMat.emissive.lerp(new THREE.Color(currentTheme.emissive), 0.06);
        sideMat.emissive.lerp(new THREE.Color(currentTheme.emissive), 0.06);

        // Update lights
        pointLight1.color.lerp(new THREE.Color(currentTheme.lights[0]), 0.05);
        pointLight2.color.lerp(new THREE.Color(currentTheme.lights[1]), 0.05);
        pointLight3.color.lerp(new THREE.Color(currentTheme.lights[2]), 0.05);
      }

      // Rotate geometric shapes
      knotMesh.rotation.x = elapsed * 0.35;
      knotMesh.rotation.y = elapsed * 0.25;

      icoMesh.rotation.x = elapsed * 0.25;
      icoMesh.rotation.y = -elapsed * 0.4;

      octMesh.rotation.y = elapsed * 0.5;
      octMesh.rotation.z = elapsed * 0.25;

      // Orbit dynamic lights to create shifting bevel highlights
      pointLight1.position.x = Math.sin(elapsed * 0.8) * 110;
      pointLight1.position.y = 50 + Math.cos(elapsed * 0.6) * 50;
      pointLight2.position.x = -Math.sin(elapsed * 0.7) * 110;
      pointLight2.position.y = -20 + Math.cos(elapsed * 0.9) * 40;
      pointLight3.position.x = Math.cos(elapsed * 1.0) * 80;
      pointLight3.position.z = Math.sin(elapsed * 1.0) * 60;

      // Slow galaxy rotation
      starField.rotation.y = elapsed * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("resize", handleResize);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      scene.clear();
      renderer.dispose();
    };
  }, []);

  const nextTheme = () => {
    setThemeIdx((prev) => (prev + 1) % THEMES.length);
  };

  return (
    <>
      {/* Three.js 3D Canvas Background (non-blocking for clicks/typing) */}
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      />

      {/* Floating 3D Control Pill - Responsive & Mobile friendly */}
      <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-40 flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 px-3 py-1.5 shadow-lg backdrop-blur-md text-xs text-foreground transition-all hover:bg-white/95 dark:hover:bg-zinc-900/95">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-bold tracking-wider bg-gradient-to-r from-sky-500 via-indigo-500 to-pink-500 bg-clip-text text-transparent">
          3D SHRIVARDHAN
        </span>
        <button
          type="button"
          onClick={nextTheme}
          className="ml-1 cursor-pointer rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-0.5 text-[11px] font-medium hover:bg-black/10 dark:hover:bg-white/20 transition-colors active:scale-95"
          title="Switch 3D Color Palette"
        >
          🎨 {THEMES[themeIdx].name}
        </button>
      </div>
    </>
  );
}
