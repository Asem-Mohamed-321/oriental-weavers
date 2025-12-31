/**
 * @file Carpet3D.js
 * Updated to support Hover Detection on the 3D Mesh
 */

import React, { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { Geo } from "./geoMath"; 

// ADDED: onHover prop
export const Carpet3D = ({ imgUrl, points, pos, rotation, scale, canvasSize, onHover }) => {
  const texture = useLoader(THREE.TextureLoader, imgUrl);
  const meshRef = useRef();
  const SEGMENTS = 60; 
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, SEGMENTS, SEGMENTS), []);

  useFrame(() => {
    if (!meshRef.current || points.length < 4) return;

    // ... (All Math Logic stays the same) ...
    const [tl, tr, br, bl] = points;
    const floorW = (Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(br.x - bl.x, br.y - bl.y)) / 2;
    const floorH = (Math.hypot(bl.x - tl.x, bl.y - tl.y) + Math.hypot(br.x - tr.x, br.y - tr.y)) / 2;
    const floorAspect = floorW / floorH;
    const imgAspect = texture.image.width / texture.image.height;
    
    const carpetW_UV = scale; 
    const carpetH_UV = (scale * floorAspect) / imgAspect; 
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad); const sin = Math.sin(rad);

    const positions = meshRef.current.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const ix = (i % (SEGMENTS + 1)) / SEGMENTS - 0.5;
        const iy = 0.5 - Math.floor(i / (SEGMENTS + 1)) / SEGMENTS; 
        let sx = ix * carpetW_UV;
        let sy = iy * carpetH_UV;
        sy /= floorAspect; 
        const rx = sx * cos - sy * sin;
        const ry = sx * sin + sy * cos;
        const u = pos.u + rx;
        const v = pos.v + ry * floorAspect; 
        const screenPt = Geo.project(u, v, points);
        const worldX = screenPt.x - canvasSize.width / 2;
        const worldY = -(screenPt.y - canvasSize.height / 2);
        positions.setXYZ(i, worldX, worldY, 0);
    }
    positions.needsUpdate = true;
  });

  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  return (
    <mesh 
      ref={meshRef} 
      geometry={geometry}
      // --- NEW HOVER EVENTS ---
      onPointerOver={() => onHover(true)} 
      onPointerOut={() => onHover(false)}
    >
      <meshBasicMaterial map={texture} transparent={true} side={THREE.DoubleSide} />
    </mesh>
  );
};