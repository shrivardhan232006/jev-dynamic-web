"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function ShrivardhanCosmos() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1500
    );
    camera.position.set(0, 0, 160);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Ambient Stardust Particles
    const starCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const colors = [
      new THREE.Color("#ff007b"),
      new THREE.Color("#00f0ff"),
      new THREE.Color("#ffe600"),
      new THREE.Color("#7000ff"),
      new THREE.Color("#00ff66"),
    ];

    for (let i = 0; i < starCount; i++) {
      const radius = 60 + Math.random() * 150;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.9;

      starPos[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      starPos[i * 3 + 1] = radius * Math.sin(phi);
      starPos[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi) - 30;

      const col = colors[i % colors.length];
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
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Floating Geometric Crystal Wireframes (Perimeter sides only)
    const shapesGroup = new THREE.Group();
    scene.add(shapesGroup);

    const knotMesh = new THREE.Mesh(
      new THREE.TorusKnotGeometry(9, 2, 70, 14, 2, 3),
      new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      })
    );
    shapesGroup.add(knotMesh);

    const icoMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(10, 1),
      new THREE.MeshBasicMaterial({
        color: 0xff007b,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      })
    );
    shapesGroup.add(icoMesh);

    const updateShapePositions = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        knotMesh.position.set(-65, 45, -50);
        icoMesh.position.set(65, -35, -50);
        knotMesh.scale.setScalar(0.6);
        icoMesh.scale.setScalar(0.6);
      } else {
        knotMesh.position.set(-150, 40, -30);
        icoMesh.position.set(150, -25, -30);
        knotMesh.scale.setScalar(1);
        icoMesh.scale.setScalar(1);
      }
    };
    updateShapePositions();

    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      updateShapePositions();
    };

    window.addEventListener("resize", handleResize);

    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      starField.rotation.y = elapsed * 0.015;
      knotMesh.rotation.x = elapsed * 0.25;
      knotMesh.rotation.y = elapsed * 0.2;
      icoMesh.rotation.x = elapsed * 0.2;
      icoMesh.rotation.y = -elapsed * 0.25;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
}
