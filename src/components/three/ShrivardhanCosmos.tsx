"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

// Vibrant color spectrum palettes
const PALETTES = [
  {
    name: "Prismatic Rainbow",
    stops: [
      "#ff1361", // Hot Rose
      "#ff5e3a", // Orange Neon
      "#ffb300", // Amber Gold
      "#00e676", // Electric Green
      "#00e5ff", // Bright Cyan
      "#2979ff", // Electric Blue
      "#7c4dff", // Deep Purple
      "#d500f9", // Magenta Fuchsia
      "#ff1744", // Crimson Rose
    ],
    lights: [0x00e5ff, 0xff1361, 0xffb300, 0x7c4dff],
  },
  {
    name: "Cyber Neon",
    stops: [
      "#00f0ff", // Cyber Cyan
      "#7000ff", // Electric Violet
      "#ff007b", // Neon Pink
      "#ffe600", // Acid Yellow
      "#00ff66", // Cyber Lime
    ],
    lights: [0x00f0ff, 0xff007b, 0x7000ff, 0x00ff66],
  },
  {
    name: "Sunset Nebula",
    stops: [
      "#ff4b1f", // Sunset Red
      "#ff9068", // Coral
      "#fdbb2d", // Warm Gold
      "#b224ef", // Deep Violet
      "#7579ff", // Lavender Blue
    ],
    lights: [0xff4b1f, 0xfdbb2d, 0xb224ef, 0x7579ff],
  },
  {
    name: "Emerald Aurora",
    stops: [
      "#0575e6", // Ocean Blue
      "#00f260", // Bright Green
      "#38ef7d", // Mint
      "#11998e", // Teal
      "#8e2de2", // Royal Purple
    ],
    lights: [0x00f260, 0x0575e6, 0x38ef7d, 0x8e2de2],
  },
];

export function ShrivardhanCosmos() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const paletteRef = useRef(PALETTES[0]);

  useEffect(() => {
    paletteRef.current = PALETTES[paletteIdx];
  }, [paletteIdx]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1500
    );
    camera.position.set(0, 0, 160);
    camera.lookAt(0, 0, 0);

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

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(0, 50, 100);
    scene.add(dirLight);

    // 4 Orbiting colorful specular lights
    const currentLights = paletteRef.current.lights;
    const pLight1 = new THREE.PointLight(currentLights[0], 5, 250);
    const pLight2 = new THREE.PointLight(currentLights[1], 5, 250);
    const pLight3 = new THREE.PointLight(currentLights[2], 4, 250);
    const pLight4 = new THREE.PointLight(currentLights[3], 4, 250);
    scene.add(pLight1, pLight2, pLight3, pLight4);

    // --- Helper to sample color along palette stops ---
    const samplePaletteColor = (t: number, palette: typeof PALETTES[0], target: THREE.Color) => {
      const stops = palette.stops;
      const count = stops.length;
      const normT = ((t % 1) + 1) % 1;
      const index = normT * (count - 1);
      const i0 = Math.floor(index);
      const i1 = Math.min(i0 + 1, count - 1);
      const frac = index - i0;

      const c0 = new THREE.Color(stops[i0]);
      const c1 = new THREE.Color(stops[i1]);
      target.copy(c0).lerp(c1, frac);
    };

    // --- 1. SOLID BOLD COLORFUL 3D LETTERS "SHRIVARDHAN" ---
    const textGroup = new THREE.Group();
    scene.add(textGroup);

    let textMesh: THREE.Mesh | null = null;
    let textGeo: TextGeometry | null = null;
    let basePositions: Float32Array | null = null;
    let colorAttr: THREE.BufferAttribute | null = null;
    let minX = 0;
    let rangeX = 1;

    const fontLoader = new FontLoader();
    fontLoader.load(
      "/helvetiker_bold.typeface.json",
      (font) => {
        textGeo = new TextGeometry("SHRIVARDHAN", {
          font: font,
          size: 10,
          depth: 3.2,
          curveSegments: 12,
          bevelEnabled: true,
          bevelThickness: 0.8,
          bevelSize: 0.4,
          bevelOffset: 0,
          bevelSegments: 4,
        });

        textGeo.computeBoundingBox();
        textGeo.computeVertexNormals();
        textGeo.center(); // Perfect center at local (0, 0, 0)

        if (textGeo.boundingBox) {
          minX = textGeo.boundingBox.min.x;
          rangeX = textGeo.boundingBox.max.x - minX;
        }

        const posAttr = textGeo.getAttribute("position");
        const vertexCount = posAttr.count;
        basePositions = new Float32Array(posAttr.array);

        const colors = new Float32Array(vertexCount * 3);
        const tempColor = new THREE.Color();

        for (let i = 0; i < vertexCount; i++) {
          const x = posAttr.getX(i);
          const t = rangeX > 0 ? (x - minX) / rangeX : 0.5;
          samplePaletteColor(t, paletteRef.current, tempColor);

          colors[i * 3] = tempColor.r;
          colors[i * 3 + 1] = tempColor.g;
          colors[i * 3 + 2] = tempColor.b;
        }

        colorAttr = new THREE.BufferAttribute(colors, 3);
        textGeo.setAttribute("color", colorAttr);

        // Glossy metallic finish reflecting vibrant colors
        const textMat = new THREE.MeshPhysicalMaterial({
          vertexColors: true,
          metalness: 0.7,
          roughness: 0.16,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          reflectivity: 0.9,
          emissive: 0x111122,
          emissiveIntensity: 0.35,
        });

        textMesh = new THREE.Mesh(textGeo, textMat);
        textGroup.add(textMesh);

        updateTextPositionAndScale();
      },
      undefined,
      (err) => {
        console.warn("Could not load 3D font:", err);
      }
    );

    // Exact projection to align directly into #shrivardhan-anchor DOM element
    const updateTextPositionAndScale = () => {
      const vFOV = THREE.MathUtils.degToRad(camera.fov);
      const visibleHeight = 2 * Math.tan(vFOV / 2) * camera.position.z;
      const visibleWidth = visibleHeight * (window.innerWidth / window.innerHeight);

      const anchor = document.getElementById("shrivardhan-anchor");
      if (anchor && textMesh) {
        const rect = anchor.getBoundingClientRect();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Mathematical projection from screen pixels to 3D world units
        const anchorCenterPixelX = rect.left + rect.width / 2;
        const anchorCenterPixelY = rect.top + rect.height / 2;

        const worldX = (anchorCenterPixelX - centerX) * (visibleWidth / window.innerWidth);
        const worldY = -(anchorCenterPixelY - centerY) * (visibleHeight / window.innerHeight);

        textGroup.position.set(worldX, worldY, 0);

        // Scale to fit naturally inside the anchor width
        // Base width of "SHRIVARDHAN" bounding box is ~104 world units
        const isMobile = window.innerWidth < 768;
        const maxAllowedPixelWidth = isMobile
          ? Math.min(window.innerWidth * 0.88, 380)
          : Math.min(rect.width * 0.85, 480);

        const desiredWorldWidth = (maxAllowedPixelWidth / window.innerWidth) * visibleWidth;
        const scale = desiredWorldWidth / 104;

        textMesh.scale.setScalar(scale);
      }
    };

    // --- 2. Surrounding Nebula Particle Glow ---
    const starCount = 450;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 60 + Math.random() * 140;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.9;

      starPos[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      starPos[i * 3 + 1] = radius * Math.sin(phi);
      starPos[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi) - 30;

      const t = Math.random();
      const col = new THREE.Color();
      samplePaletteColor(t, paletteRef.current, col);

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
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // --- 3. Geometric Perimeter Accents (Sides only) ---
    const shapesGroup = new THREE.Group();
    scene.add(shapesGroup);

    // Left floating Torus Knot
    const knotMesh = new THREE.Mesh(
      new THREE.TorusKnotGeometry(10, 2.2, 80, 16, 2, 3),
      new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        metalness: 0.85,
        roughness: 0.2,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
      })
    );
    shapesGroup.add(knotMesh);

    // Right floating Icosahedron
    const icoMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(11, 1),
      new THREE.MeshStandardMaterial({
        color: 0xff007b,
        metalness: 0.85,
        roughness: 0.2,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      })
    );
    shapesGroup.add(icoMesh);

    const positionPerimeterShapes = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        knotMesh.position.set(-65, 40, -45);
        icoMesh.position.set(65, 20, -45);
        knotMesh.scale.setScalar(0.6);
        icoMesh.scale.setScalar(0.6);
      } else {
        knotMesh.position.set(-155, 30, -30);
        icoMesh.position.set(155, -10, -30);
        knotMesh.scale.setScalar(0.95);
        icoMesh.scale.setScalar(0.95);
      }
    };
    positionPerimeterShapes();

    // --- Mouse & Touch Controls ---
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

    // --- Resize & Scroll Handler ---
    const handleResizeOrScroll = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);

      updateTextPositionAndScale();
      positionPerimeterShapes();
    };

    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, { passive: true });

    // --- Animation Loop ---
    let animId: number;
    const clock = new THREE.Clock();
    const tempCol = new THREE.Color();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth pointer interpolation
      pointer.x += (pointer.targetX - pointer.x) * 0.05;
      pointer.y += (pointer.targetY - pointer.y) * 0.05;

      // Subtle parallax camera angle (keep horizon straight for crisp text readability)
      camera.position.x = pointer.x * 12;
      camera.position.y = pointer.y * 8;
      camera.lookAt(0, textGroup.position.y, 0);

      // --- Dynamic Rainbow Color Flow across 3D Letters ---
      if (textMesh && textGeo && colorAttr && basePositions) {
        const pos = textGeo.getAttribute("position") as THREE.BufferAttribute;
        const count = pos.count;
        const activePalette = paletteRef.current;
        const colorArray = colorAttr.array as Float32Array;

        // Flow speed
        const shiftOffset = elapsed * 0.12;

        for (let i = 0; i < count; i++) {
          const x = basePositions[i * 3];
          const t = rangeX > 0 ? (x - minX) / rangeX : 0.5;

          // Shimmer wave across letters
          const animatedT = t - shiftOffset;
          samplePaletteColor(animatedT, activePalette, tempCol);

          colorArray[i * 3] = tempCol.r;
          colorArray[i * 3 + 1] = tempCol.g;
          colorArray[i * 3 + 2] = tempCol.b;
        }

        colorAttr.needsUpdate = true;

        // Gentle 3D floating & breathing tilt
        textMesh.rotation.y = Math.sin(elapsed * 1.2) * 0.05 + pointer.x * 0.1;
        textMesh.rotation.x = Math.cos(elapsed * 0.9) * 0.03 - pointer.y * 0.08;
      }

      // Orbit dynamic specular lights around the 3D text
      const ty = textGroup.position.y;
      pLight1.position.set(Math.sin(elapsed * 1.1) * 90, ty + 25 + Math.cos(elapsed * 0.7) * 20, 50);
      pLight2.position.set(-Math.sin(elapsed * 0.9) * 90, ty - 15 + Math.cos(elapsed * 0.8) * 20, 45);
      pLight3.position.set(Math.cos(elapsed * 1.3) * 70, ty + 10, 60);
      pLight4.position.set(-Math.cos(elapsed * 1.0) * 80, ty - 20, 40);

      // Update light colors smoothly to match active palette
      const curL = paletteRef.current.lights;
      pLight1.color.lerp(new THREE.Color(curL[0]), 0.05);
      pLight2.color.lerp(new THREE.Color(curL[1]), 0.05);
      pLight3.color.lerp(new THREE.Color(curL[2]), 0.05);
      pLight4.color.lerp(new THREE.Color(curL[3]), 0.05);

      // Orbit perimeter shapes
      knotMesh.rotation.x = elapsed * 0.3;
      knotMesh.rotation.y = elapsed * 0.2;
      icoMesh.rotation.x = elapsed * 0.2;
      icoMesh.rotation.y = -elapsed * 0.3;

      starField.rotation.y = elapsed * 0.015;

      renderer.render(scene, camera);
    };

    animate();

    // Trigger initial positioning
    setTimeout(updateTextPositionAndScale, 50);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      scene.clear();
      renderer.dispose();
    };
  }, []);

  const nextPalette = () => {
    setPaletteIdx((prev) => (prev + 1) % PALETTES.length);
  };

  return (
    <>
      {/* 3D Canvas Background */}
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      />

      {/* Floating 3D Control Pill */}
      <div className="fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-40 flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white/85 dark:bg-zinc-900/85 px-3 py-1.5 shadow-lg backdrop-blur-md text-xs text-foreground transition-all hover:bg-white/95 dark:hover:bg-zinc-900/95">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
        </span>
        <span className="font-extrabold tracking-wider bg-gradient-to-r from-pink-500 via-amber-500 to-cyan-500 bg-clip-text text-transparent">
          3D SHRIVARDHAN
        </span>
        <button
          type="button"
          onClick={nextPalette}
          className="ml-1 cursor-pointer rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-0.5 text-[11px] font-medium hover:bg-black/10 dark:hover:bg-white/20 transition-colors active:scale-95"
          title="Switch 3D Rainbow Palette"
        >
          🎨 {PALETTES[paletteIdx].name}
        </button>
      </div>
    </>
  );
}
