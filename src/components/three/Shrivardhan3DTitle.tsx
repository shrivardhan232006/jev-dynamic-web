"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

// Vibrant, ultra-saturated color palettes
const COLOR_PALETTES = [
  {
    name: "Vibrant Rainbow",
    stops: [
      "#ff0055", // S - Vivid Crimson Pink
      "#ff5500", // H - Radiant Orange
      "#ffaa00", // R - Bright Amber Gold
      "#00e676", // I - Electric Lime
      "#00e5ff", // V - Bright Aqua Cyan
      "#2979ff", // A - Vivid Royal Blue
      "#7c4dff", // R - Deep Purple
      "#d500f9", // D - Neon Fuchsia
      "#ff1744", // H - Bright Ruby
      "#ff9100", // A - Solar Tangerine
      "#00e5ff", // N - Cyan Glow
    ],
    ambient: 0xffffff,
  },
  {
    name: "Cyberpunk Neon",
    stops: ["#00f0ff", "#ff007b", "#ffe600", "#7000ff", "#00ff66"],
    ambient: 0xffffff,
  },
  {
    name: "Golden Sunset",
    stops: ["#ff4500", "#ff8c00", "#ffd700", "#ff1493", "#8a2be2"],
    ambient: 0xffffff,
  },
  {
    name: "Emerald Prism",
    stops: ["#00f260", "#0575e6", "#00e5ff", "#a855f7", "#ec4899"],
    ambient: 0xffffff,
  },
];

export function Shrivardhan3DTitle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const paletteRef = useRef(COLOR_PALETTES[0]);

  useEffect(() => {
    paletteRef.current = COLOR_PALETTES[paletteIndex];
  }, [paletteIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // --- Scene, Camera, Renderer ---
    const scene = new THREE.Scene();

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 85;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0, 80);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;

    // --- High-Visibility Lights ---
    // Strong ambient light ensures colors are NEVER dark navy/black on light background
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 1.6);
    frontLight.position.set(0, 20, 50);
    scene.add(frontLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 1.2);
    topLight.position.set(0, 40, 20);
    scene.add(topLight);

    const pointLight1 = new THREE.PointLight(0x00e5ff, 3.5, 120);
    pointLight1.position.set(30, 20, 30);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff0055, 3.5, 120);
    pointLight2.position.set(-30, -10, 30);
    scene.add(pointLight2);

    // --- Helper to sample colors ---
    const sampleColor = (t: number, palette: typeof COLOR_PALETTES[0], target: THREE.Color) => {
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

    // --- Text Mesh Setup ---
    const textGroup = new THREE.Group();
    scene.add(textGroup);

    let textMesh: THREE.Mesh | null = null;
    let textGeo: TextGeometry | null = null;
    let basePositions: Float32Array | null = null;
    let colorAttr: THREE.BufferAttribute | null = null;
    let minX = 0;
    let rangeX = 1;

    const fontLoader = new FontLoader();
    fontLoader.load("/helvetiker_bold.typeface.json", (font) => {
      textGeo = new TextGeometry("SHRIVARDHAN", {
        font: font,
        size: 9,
        depth: 2.8,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.7,
        bevelSize: 0.35,
        bevelOffset: 0,
        bevelSegments: 4,
      });

      textGeo.computeBoundingBox();
      textGeo.computeVertexNormals();
      textGeo.center(); // Center at (0, 0, 0)

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
        sampleColor(t, paletteRef.current, tempColor);

        colors[i * 3] = tempColor.r;
        colors[i * 3 + 1] = tempColor.g;
        colors[i * 3 + 2] = tempColor.b;
      }

      colorAttr = new THREE.BufferAttribute(colors, 3);
      textGeo.setAttribute("color", colorAttr);

      // Saturated, vibrant material that remains bright on light backgrounds
      const textMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.25,
        roughness: 0.25,
        emissive: 0x222222,
        emissiveIntensity: 0.3,
      });

      textMesh = new THREE.Mesh(textGeo, textMat);
      textGroup.add(textMesh);

      adjustScale();
    });

    // Automatically fit the text inside the canvas container width
    const adjustScale = () => {
      if (!textMesh || !container) return;
      const w = container.clientWidth || 360;

      // Base width of "SHRIVARDHAN" bounding box is ~96 units
      // Calculate target world width visible at z=80
      const vFOV = THREE.MathUtils.degToRad(camera.fov);
      const visibleHeight = 2 * Math.tan(vFOV / 2) * camera.position.z;
      const visibleWidth = visibleHeight * (w / (container.clientHeight || 85));

      // Leave a comfortable 8% padding on left/right
      const maxAllowedWorldWidth = visibleWidth * 0.9;
      const scale = Math.min(maxAllowedWorldWidth / 96, 0.72);

      textMesh.scale.setScalar(scale);
    };

    // --- Interactive Mouse & Touch Drag Controls ---
    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
    };

    const handlePointerMove = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      pointer.targetX = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.targetY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    };

    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onPointerLeave = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onPointerLeave);
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onPointerLeave);

    // --- Resize Observer ---
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          adjustScale();
        }
      }
    });
    resizeObserver.observe(container);

    // --- Animation Loop ---
    let animId: number;
    const clock = new THREE.Clock();
    const tempCol = new THREE.Color();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth pointer interpolation
      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;

      // 3D Breathing Tilt & Interactive Tilt
      if (textMesh) {
        textMesh.rotation.y = Math.sin(elapsed * 1.5) * 0.07 + pointer.x * 0.25;
        textMesh.rotation.x = Math.cos(elapsed * 1.2) * 0.04 - pointer.y * 0.2;
        textMesh.position.y = Math.sin(elapsed * 2.0) * 0.8;

        // Flowing Rainbow Color Shift across the 11 letters
        if (textGeo && colorAttr && basePositions) {
          const count = basePositions.length / 3;
          const activePalette = paletteRef.current;
          const colorArray = colorAttr.array as Float32Array;
          const shiftOffset = elapsed * 0.14;

          for (let i = 0; i < count; i++) {
            const x = basePositions[i * 3];
            const t = rangeX > 0 ? (x - minX) / rangeX : 0.5;
            const animatedT = t - shiftOffset;
            sampleColor(animatedT, activePalette, tempCol);

            colorArray[i * 3] = tempCol.r;
            colorArray[i * 3 + 1] = tempCol.g;
            colorArray[i * 3 + 2] = tempCol.b;
          }

          colorAttr.needsUpdate = true;
        }
      }

      // Orbit point lights for dynamic surface gleam
      pointLight1.position.x = Math.sin(elapsed * 1.8) * 45;
      pointLight1.position.y = Math.cos(elapsed * 1.2) * 20;
      pointLight2.position.x = -Math.sin(elapsed * 1.6) * 45;
      pointLight2.position.y = -Math.cos(elapsed * 1.4) * 20;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onPointerLeave);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onPointerLeave);

      scene.clear();
      renderer.dispose();
    };
  }, []);

  const nextPalette = () => {
    setPaletteIndex((prev) => (prev + 1) % COLOR_PALETTES.length);
  };

  return (
    <div
      ref={containerRef}
      onClick={nextPalette}
      className="relative w-full max-w-[540px] h-18 sm:h-22 flex items-center justify-center cursor-pointer select-none group"
      title="Click or tap to change 3D color theme"
      role="banner"
      aria-label="3D Shrivardhan Title"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      <span className="sr-only">SHRIVARDHAN</span>
    </div>
  );
}
