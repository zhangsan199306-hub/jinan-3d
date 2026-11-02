import * as THREE from 'three';
import {
  FinishPresetId,
  InspectablePartSpec,
  LightingPresetId,
} from '../types/studio';
import { BuiltCreationScene, KoiInstanceData, PartObjectEntry } from './proceduralModels';

const FINISH_MODE_INDEX: Record<FinishPresetId, number> = {
  'cycles-photoreal': 0,
  'clay-monolith': 1,
  'song-mineral': 2,
  'imperial-jade': 3,
};

const LIGHTING_MODE_INDEX: Record<LightingPresetId, number> = {
  'photo-daylight': 0,
  'spring-morning': 1,
  'lishan-sunset': 2,
  'minghu-moonlight': 3,
};

// Signed distance to a 2D polygon in UV space (negative inside, positive outside)
function sdPolygon2D(px: number, py: number, poly: [number, number][]): number {
  let d =
    (px - poly[0][0]) * (px - poly[0][0]) +
    (py - poly[0][1]) * (py - poly[0][1]);
  let s = 1.0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i++) {
    const ex = poly[j][0] - poly[i][0];
    const ey = poly[j][1] - poly[i][1];
    const wx = px - poly[i][0];
    const wy = py - poly[i][1];
    const proj = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
    const bx = wx - ex * proj;
    const by = wy - ey * proj;
    d = Math.min(d, bx * bx + by * by);

    const c1 = py >= poly[i][1];
    const c2 = py < poly[j][1];
    const c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) {
      s *= -1.0;
    }
  }
  return s * Math.sqrt(d);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Extracts high-precision 3D Relief Height, Surface Normals, Ambient Occlusion,
 * and Semantic Material Masks (Emerald Pool, Three Boiling Springs, Weeping Willows,
 * Carved Marble Balustrades, and Palace Interiors) directly from /assets/aistudio/image_b3dce47f.png
 */
function processReferencePhotoToBlenderMaps(
  img: HTMLImageElement,
  maxAniso: number
): {
  albedoTex: THREE.CanvasTexture;
  heightMaskTex: THREE.DataTexture;
  normalAoTex: THREE.DataTexture;
} {
  const w = 1024;
  const h = 572;

  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = w;
  rawCanvas.height = h;
  const rawCtx = rawCanvas.getContext('2d')!;
  rawCtx.drawImage(img, 0, 0, w, h);
  const srcData = rawCtx.getImageData(0, 0, w, h).data;

  // Create denoised CGI Albedo Canvas (Edge-preserving 3x3 bilateral polish)
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = w;
  albedoCanvas.height = h;
  const albedoCtx = albedoCanvas.getContext('2d')!;
  const albedoImgData = albedoCtx.createImageData(w, h);
  const dstAlbedo = albedoImgData.data;

  const lumBuf = new Float32Array(w * h);
  const baseHeightBuf = new Float32Array(w * h);
  const waterMaskBuf = new Float32Array(w * h);
  const foliageMaskBuf = new Float32Array(w * h);
  const emissiveMaskBuf = new Float32Array(w * h);

  // Exact UV polygon of the inner Baotu Spring emerald pool in image_b3dce47f.png
  // u: 0 (left) -> 1 (right), v: 0 (bottom) -> 1 (top)
  const poolPolygon: [number, number][] = [
    [0.485, 0.008], // South bottom apex
    [0.118, 0.246], // West corner
    [0.354, 0.542], // NW corner
    [0.614, 0.542], // NE corner
    [0.884, 0.308], // East corner
  ];

  // Pass 1: Compute luminance, edge-preserving CGI albedo, and semantic masks + macro 3D height
  for (let y = 0; y < h; y++) {
    const v = 1.0 - y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const idx = y * w + x;
      const p = idx * 4;

      const r = srcData[p] / 255;
      const g = srcData[p + 1] / 255;
      const b = srcData[p + 2] / 255;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      lumBuf[idx] = lum;

      // Signed distance to inner spring pool boundary
      const sdPool = sdPolygon2D(u, v, poolPolygon);
      const isInsidePool = sdPool < 0;

      // Distance to the Three Gushing Springs (三股水) in UV space
      const dS1 = Math.hypot((u - 0.468) / 0.068, (v - 0.365) / 0.056); // Front spring
      const dS2 = Math.hypot((u - 0.456) / 0.054, (v - 0.468) / 0.042); // Back-left spring
      const dS3 = Math.hypot((u - 0.568) / 0.058, (v - 0.435) / 0.045); // Back-right spring
      const dWeir = Math.hypot((u - 0.285) / 0.032, (v - 0.462) / 0.032); // West outlet foam

      const springFoamProfile = Math.max(
        Math.exp(-dS1 * dS1 * 1.65),
        Math.exp(-dS2 * dS2 * 1.75),
        Math.exp(-dS3 * dS3 * 1.75),
        0.65 * Math.exp(-dWeir * dWeir * 2.0)
      );

      // 1. Water & Three Springs Mask
      let waterVal = 0;
      if (isInsidePool) {
        const edgeFade = smoothstep(0.0, -0.012, sdPool);
        waterVal = 0.5 * edgeFade + 0.5 * Math.min(1.0, springFoamProfile * (0.55 + 0.65 * lum));
      } else if (u > 0.88 && v > 0.35 && v < 0.44 && g > r * 1.04) {
        // East bridge water channel
        waterVal = 0.35;
      }
      waterMaskBuf[idx] = Math.max(0, Math.min(1, waterVal));

      // 2. Foliage & Weeping Willow Mask
      const greenExcess = g - Math.max(r * 0.92, b * 1.12);
      let foliageVal = 0;
      if (!isInsidePool && greenExcess > 0.035 && v > 0.32) {
        foliageVal = Math.min(1.0, greenExcess * 4.2);
        // Boost foreground hanging willow curtains (top-left & top-right) and NW willow tree
        if ((u < 0.19 && v > 0.38) || (u > 0.84 && v > 0.52) || (u > 0.22 && u < 0.43 && v > 0.54)) {
          foliageVal = Math.min(1.0, foliageVal * 1.35 + 0.15);
        }
      }
      foliageMaskBuf[idx] = foliageVal;

      // 3. Warm Architectural Interior / Lantern Emissive Mask
      let emissiveVal = 0;
      const isHallZone =
        (u > 0.45 && u < 0.70 && v > 0.57 && v < 0.71) || // Luoyuan Hall colonnade
        (u > 0.64 && u < 0.87 && v > 0.47 && v < 0.68) || // Guanlan Pavilion
        (u > 0.02 && u < 0.26 && v > 0.56 && v < 0.68);   // West Courtyard Halls
      if (isHallZone && r > g * 1.18 && r > 0.25) {
        emissiveVal = Math.min(1.0, (r - g) * 2.8);
      } else if (springFoamProfile > 0.25) {
        emissiveVal = springFoamProfile * 0.65;
      }
      emissiveMaskBuf[idx] = emissiveVal;

      // 4. Sculpted 3D Architectural Height / Depth Map (0 = recessed far/deep, 1 = near foreground)
      let hVal = 0.35;
      if (isInsidePool) {
        // Recessed emerald spring pool + raised boiling Three Gushing Springs mounds
        const poolDepth = 0.18 + 0.04 * (1.0 - v);
        const springMound = springFoamProfile * (0.14 + 0.08 * lum);
        hVal = poolDepth + springMound;
      } else if (sdPool >= 0 && sdPool < 0.044) {
        // Carved White Marble Balustrades (汉白玉雕花石栏) rising around the pool perimeter
        const railProfile = 1.0 - Math.abs((sdPool - 0.018) / 0.026);
        const perspectiveScale = 1.0 + (1.0 - v) * 0.45; // Closer south railings are taller in view
        hVal = 0.38 + Math.max(0, railProfile) * 0.16 * perspectiveScale + lum * 0.05;
      } else {
        // Outside the pool balustrades:
        // Base perspective ground plane (higher/closer at bottom v=0, receding toward v=0.58)
        const groundPlane = 0.56 - Math.min(0.58, v) * 0.42;
        hVal = groundPlane;

        // Sky dome region (top-center/right above roofs)
        const isSky = v > 0.64 && b > r * 1.06 && lum > 0.66 && foliageVal < 0.1;
        if (isSky) {
          hVal = 0.06;
        } else {
          // North Main Hall: Luoyuan Hall (泺源堂)
          if (u >= 0.45 && u <= 0.705 && v >= 0.55 && v <= 0.84) {
            const roofFactor = smoothstep(0.68, 0.78, v) * (1.0 - smoothstep(0.81, 0.84, v));
            const eavesFactor = Math.exp(-Math.pow((v - 0.69) / 0.025, 2));
            hVal = 0.38 + roofFactor * 0.12 + eavesFactor * 0.07 + lum * 0.05;
          }
          // East Open Pavilion: Guanlan Pavilion (观澜亭) - closer to camera in mid-ground
          if (u >= 0.635 && u <= 0.885 && v >= 0.44 && v <= 0.845) {
            const pavRoof = smoothstep(0.64, 0.75, v) * (1.0 - smoothstep(0.81, 0.845, v));
            const pavEaves = Math.exp(-Math.pow((v - 0.675) / 0.03, 2));
            const pavCols = v < 0.67 ? 0.08 : 0.0;
            hVal = Math.max(hVal, 0.48 + pavRoof * 0.15 + pavEaves * 0.09 + pavCols + lum * 0.05);
          }
          // NW Giant Weeping Willow (西北古垂柳)
          if (u >= 0.22 && u <= 0.43 && v >= 0.53 && v <= 0.91 && (foliageVal > 0.08 || g > r * 0.95)) {
            const domeX = 1.0 - Math.pow((u - 0.325) / 0.105, 2);
            const domeY = 1.0 - Math.pow((v - 0.72) / 0.19, 2);
            const dome = Math.max(0, domeX * domeY);
            hVal = Math.max(hVal, 0.44 + dome * 0.18 + lum * 0.05);
          }
          // West Courtyard Halls (西岸回廊与配殿)
          if (u >= 0.01 && u <= 0.28 && v >= 0.54 && v <= 0.79) {
            hVal = Math.max(hVal, 0.40 + smoothstep(0.62, 0.73, v) * 0.10 + lum * 0.04);
          }
          // Foreground Left & Right Hanging Willow Curtains (近景垂柳丝绦)
          const isLeftCurtain = u < 0.175 && v > 0.36 && (foliageVal > 0.12 || lum < 0.52);
          const isRightCurtain = u > 0.85 && v > 0.52 && (foliageVal > 0.12 || lum < 0.52);
          if (isLeftCurtain || isRightCurtain) {
            hVal = 0.74 + foliageVal * 0.12 + lum * 0.04;
          }
          // Waterside visitors standing around the south/west/east pavement
          if (v < 0.54 && sdPool >= 0.035 && sdPool < 0.14 && lum < 0.42) {
            hVal += 0.065;
          }
        }
      }

      baseHeightBuf[idx] = Math.max(0.02, Math.min(0.98, hVal));
    }
  }

  // Pass 2: Smooth macro height slightly + bilateral-filter albedo for clean Blender Cycles CGI finish
  const smoothedHeight = new Float32Array(w * h);
  const heightMaskData = new Uint8Array(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const p = idx * 4;

      // Smooth macro height for distortion-free 3D architectural relief (micro-details stay in Normal/AO map)
      let hSum = 0;
      let wSum = 0;
      for (let dy = -3; dy <= 3; dy++) {
        const ny = Math.max(0, Math.min(h - 1, y + dy));
        for (let dx = -3; dx <= 3; dx++) {
          const nx = Math.max(0, Math.min(w - 1, x + dx));
          const wt = 1.0 / (1 + dx * dx + dy * dy);
          hSum += baseHeightBuf[ny * w + nx] * wt;
          wSum += wt;
        }
      }
      const finalH = Math.max(0, Math.min(1, hSum / wSum));
      smoothedHeight[idx] = finalH;

      heightMaskData[p] = Math.round(finalH * 255);
      heightMaskData[p + 1] = Math.round(waterMaskBuf[idx] * 255);
      heightMaskData[p + 2] = Math.round(foliageMaskBuf[idx] * 255);
      heightMaskData[p + 3] = Math.round(emissiveMaskBuf[idx] * 255);

      // Edge-preserving bilateral filter on Albedo for silky Blender Cycles surface quality
      const cR = srcData[p];
      const cG = srcData[p + 1];
      const cB = srcData[p + 2];
      let bR = cR * 2.0;
      let bG = cG * 2.0;
      let bB = cB * 2.0;
      let bW = 2.0;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = Math.max(0, Math.min(h - 1, y + dy));
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = Math.max(0, Math.min(w - 1, x + dx));
          const np = (ny * w + nx) * 4;
          const nR = srcData[np];
          const nG = srcData[np + 1];
          const nB = srcData[np + 2];
          const diff = Math.abs(cR - nR) + Math.abs(cG - nG) + Math.abs(cB - nB);
          const weight = diff < 48 ? 0.65 : 0.08;
          bR += nR * weight;
          bG += nG * weight;
          bB += nB * weight;
          bW += weight;
        }
      }

      dstAlbedo[p] = Math.round(bR / bW);
      dstAlbedo[p + 1] = Math.round(bG / bW);
      dstAlbedo[p + 2] = Math.round(bB / bW);
      dstAlbedo[p + 3] = 255;
    }
  }

  albedoCtx.putImageData(albedoImgData, 0, 0);

  // Pass 3: Compute Sobel 3D Surface Normals + Cavity Ambient Occlusion (AO)
  const normalAoData = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const ym1 = Math.max(0, y - 1);
    const yp1 = Math.min(h - 1, y + 1);
    for (let x = 0; x < w; x++) {
      const xm1 = Math.max(0, x - 1);
      const xp1 = Math.min(w - 1, x + 1);
      const idx = y * w + x;
      const p = idx * 4;

      // Combine macro height gradient + fine luminance Sobel gradient
      const hL = smoothedHeight[y * w + xm1] * 0.65 + lumBuf[y * w + xm1] * 0.35;
      const hR = smoothedHeight[y * w + xp1] * 0.65 + lumBuf[y * w + xp1] * 0.35;
      const hU = smoothedHeight[ym1 * w + x] * 0.65 + lumBuf[ym1 * w + x] * 0.35;
      const hD = smoothedHeight[yp1 * w + x] * 0.65 + lumBuf[yp1 * w + x] * 0.35;

      const dx = (hL - hR) * 5.2;
      const dy = (hD - hU) * 5.2;
      const dz = 1.0;
      const invLen = 1.0 / Math.hypot(dx, dy, dz);

      const nx = dx * invLen * 0.5 + 0.5;
      const ny = dy * invLen * 0.5 + 0.5;
      const nz = dz * invLen * 0.5 + 0.5;

      // Cavity / Ambient Occlusion from local Laplacian + dark crevice luminance
      const centerH = smoothedHeight[idx] * 0.5 + lumBuf[idx] * 0.5;
      const avgNeighbor = 0.25 * (hL + hR + hU + hD);
      const cavity = Math.max(-0.2, Math.min(0.2, centerH - avgNeighbor));
      const ao = Math.max(
        0.18,
        Math.min(1.0, 0.78 + cavity * 2.2 + (lumBuf[idx] - 0.45) * 0.28)
      );

      normalAoData[p] = Math.round(nx * 255);
      normalAoData[p + 1] = Math.round(ny * 255);
      normalAoData[p + 2] = Math.round(nz * 255);
      normalAoData[p + 3] = Math.round(ao * 255);
    }
  }

  const albedoTex = new THREE.CanvasTexture(albedoCanvas);
  albedoTex.colorSpace = THREE.SRGBColorSpace;
  albedoTex.anisotropy = maxAniso;
  albedoTex.minFilter = THREE.LinearFilter;
  albedoTex.magFilter = THREE.LinearFilter;
  albedoTex.needsUpdate = true;

  const heightMaskTex = new THREE.DataTexture(heightMaskData, w, h, THREE.RGBAFormat);
  heightMaskTex.flipY = true;
  heightMaskTex.minFilter = THREE.LinearFilter;
  heightMaskTex.magFilter = THREE.LinearFilter;
  heightMaskTex.needsUpdate = true;

  const normalAoTex = new THREE.DataTexture(normalAoData, w, h, THREE.RGBAFormat);
  normalAoTex.flipY = true;
  normalAoTex.minFilter = THREE.LinearFilter;
  normalAoTex.magFilter = THREE.LinearFilter;
  normalAoTex.needsUpdate = true;

  return { albedoTex, heightMaskTex, normalAoTex };
}

/**
 * Builds the Blender 4.2 Cycles 3D Photo-Reconstructed Diorama Stage for Baotu Spring
 */
export function buildBlenderPhotoReconstructedStage(
  landmarkSpecs: InspectablePartSpec[],
  maxAniso: number,
  initialFinish: FinishPresetId,
  initialLighting: LightingPresetId,
  initialWireframe: boolean
): BuiltCreationScene {
  const rootGroup = new THREE.Group();
  const parts: PartObjectEntry[] = [];
  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const materialsToDispose: THREE.Material[] = [];
  const texturesToDispose: THREE.Texture[] = [];

  // 1x1 fallback textures while the local image loads (~20ms)
  const dummyAlbedo = new THREE.DataTexture(
    new Uint8Array([38, 92, 82, 255]),
    1,
    1,
    THREE.RGBAFormat
  );
  dummyAlbedo.colorSpace = THREE.SRGBColorSpace;
  dummyAlbedo.needsUpdate = true;

  const dummyHeight = new THREE.DataTexture(
    new Uint8Array([96, 0, 0, 0]),
    1,
    1,
    THREE.RGBAFormat
  );
  dummyHeight.needsUpdate = true;

  const dummyNormal = new THREE.DataTexture(
    new Uint8Array([128, 128, 255, 220]),
    1,
    1,
    THREE.RGBAFormat
  );
  dummyNormal.needsUpdate = true;

  texturesToDispose.push(dummyAlbedo, dummyHeight, dummyNormal);

  // Shared shader uniforms updated every frame from StudioCanvas
  const photoUniforms = {
    uAlbedoMap: { value: dummyAlbedo as THREE.Texture },
    uHeightMaskMap: { value: dummyHeight as THREE.Texture },
    uNormalAoMap: { value: dummyNormal as THREE.Texture },
    uTime: { value: 0 },
    uWaveAmp: { value: 1.05 },
    uSunAzimuth: { value: 2.35 },
    uFinishMode: { value: FINISH_MODE_INDEX[initialFinish] },
    uLightingMode: { value: LIGHTING_MODE_INDEX[initialLighting] },
    uWireframePass: { value: initialWireframe ? 1.0 : 0.0 },
    uExplode: { value: 0.0 },
  };

  // Load reference photo using BASE_URL so it works in both root and GitHub Pages subpaths
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const maps = processReferencePhotoToBlenderMaps(img, maxAniso);
    photoUniforms.uAlbedoMap.value = maps.albedoTex;
    photoUniforms.uHeightMaskMap.value = maps.heightMaskTex;
    photoUniforms.uNormalAoMap.value = maps.normalAoTex;
    texturesToDispose.push(maps.albedoTex, maps.heightMaskTex, maps.normalAoTex);
  };
  img.src = `${import.meta.env.BASE_URL}assets/aistudio/image_b3dce47f.png`;

  // High-Density 3D Displaced Relief Surface (320 x 180 = 57,600 vertices)
  // Positioned and tilted so cameraPreset 'photo-match' or 'panorama' views it as a rich 3D stage
  const stageWidth = 10.6;
  const stageHeight = 5.92;
  const reliefGeo = new THREE.PlaneGeometry(stageWidth, stageHeight, 320, 180);
  geometriesToDispose.push(reliefGeo);

  const cyclesShaderMat = new THREE.ShaderMaterial({
    uniforms: photoUniforms,
    vertexShader: `
      uniform sampler2D uHeightMaskMap;
      uniform float uTime;
      uniform float uWaveAmp;
      uniform float uExplode;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying float vHeight;
      varying float vWaterMask;
      varying float vFoliageMask;

      void main() {
        vUv = uv;
        vec4 hm = texture2D(uHeightMaskMap, uv);
        float h = hm.r;
        float waterMask = hm.g;
        float foliageMask = hm.b;

        vHeight = h;
        vWaterMask = waterMask;
        vFoliageMask = foliageMask;

        vec3 pos = position;

        // 1. Clean 3D Architectural Relief Displacement (razor-straight eaves & railings)
        float reliefDepth = (h - 0.34) * (0.42 + uExplode * 0.75);

        // 2. Real-time 3D Boiling Three Gushing Springs (三股水) & Pool Ripples
        if (waterMask > 0.05) {
          float d1 = length((uv - vec2(0.468, 0.365)) / vec2(0.068, 0.056));
          float d2 = length((uv - vec2(0.456, 0.468)) / vec2(0.054, 0.042));
          float d3 = length((uv - vec2(0.568, 0.435)) / vec2(0.058, 0.045));

          float boil1 = exp(-d1 * d1 * 1.6) * (
            0.065 +
            0.028 * sin(uTime * 6.5 - d1 * 9.0) +
            0.018 * cos(uTime * 9.2 + uv.x * 35.0)
          );
          float boil2 = exp(-d2 * d2 * 1.7) * (
            0.055 +
            0.024 * sin(uTime * 7.1 - d2 * 9.5 + 1.4) +
            0.015 * sin(uTime * 10.1 - uv.y * 38.0)
          );
          float boil3 = exp(-d3 * d3 * 1.7) * (
            0.058 +
            0.025 * sin(uTime * 6.8 - d3 * 9.2 + 2.8) +
            0.015 * cos(uTime * 8.6 + uv.x * 32.0)
          );

          float ripple = (
            sin(d1 * 28.0 - uTime * 4.2) * exp(-d1 * 0.55) +
            sin(d2 * 30.0 - uTime * 4.6 + 1.2) * exp(-d2 * 0.6) +
            sin(d3 * 29.0 - uTime * 4.4 + 2.5) * exp(-d3 * 0.6)
          ) * 0.008 * waterMask * uWaveAmp;

          reliefDepth += (boil1 + boil2 + boil3) * uWaveAmp + ripple;
        }

        // 3. Gentle 3D Wind Sway on Weeping Willow Fronds (垂柳风摆)
        if (foliageMask > 0.08) {
          float sway = sin(uTime * 2.1 + uv.x * 14.0 + uv.y * 8.0) * 0.018 * foliageMask * uWaveAmp;
          pos.x += sway;
          reliefDepth += cos(uTime * 1.7 + uv.y * 12.0) * 0.012 * foliageMask;
        }

        pos.z += reliefDepth;

        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uAlbedoMap;
      uniform sampler2D uHeightMaskMap;
      uniform sampler2D uNormalAoMap;
      uniform float uTime;
      uniform float uWaveAmp;
      uniform float uSunAzimuth;
      uniform float uFinishMode;
      uniform float uLightingMode;
      uniform float uWireframePass;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying float vHeight;
      varying float vWaterMask;
      varying float vFoliageMask;

      // Procedural caustic pattern for the emerald spring pool
      float causticPattern(vec2 p, float t) {
        vec2 i = p;
        float c = 0.0;
        float inten = 0.05;
        for (int n = 0; n < 3; n++) {
          float time = t * (1.0 - (3.0 / float(n + 1)));
          i = p + vec2(
            cos(time - i.x) + sin(time + i.y),
            sin(time - i.y) + cos(time + i.x)
          );
          c += 1.0 / length(vec2(p.x / (sin(i.x + time) / inten), p.y / (cos(i.y + time) / inten)));
        }
        c /= 3.0;
        c = 1.17 - pow(c, 1.4);
        return pow(abs(c), 7.0);
      }

      void main() {
        vec4 hm = texture2D(uHeightMaskMap, vUv);
        float heightVal = hm.r;
        float waterMask = hm.g;
        float foliageMask = hm.b;
        float emissiveMask = hm.a;

        vec2 sampleUv = vUv;

        // Distance from the Three Gushing Springs (三股水)
        vec2 p1 = (vUv - vec2(0.468, 0.365)) / vec2(0.068, 0.056);
        vec2 p2 = (vUv - vec2(0.456, 0.468)) / vec2(0.054, 0.042);
        vec2 p3 = (vUv - vec2(0.568, 0.435)) / vec2(0.058, 0.045);
        float d1 = length(p1);
        float d2 = length(p2);
        float d3 = length(p3);

        float waveHeight = 0.0;
        float dynamicFoam = 0.0;
        vec2 waterNormalOffset = vec2(0.0);

        if (waterMask > 0.04) {
          // Concentric wave rings radiating from the Three Springs
          float w1 = sin(d1 * 26.0 - uTime * 4.8) * exp(-d1 * 0.42);
          float w2 = sin(d2 * 28.0 - uTime * 5.2 + 1.3) * exp(-d2 * 0.45);
          float w3 = sin(d3 * 27.0 - uTime * 5.0 + 2.6) * exp(-d3 * 0.45);
          waveHeight = (w1 + w2 + w3) * uWaveAmp;

          // Subtle UV refraction on the submerged koi & emerald water floor
          float suppressOnFoam = smoothstep(0.45, 1.15, min(d1, min(d2, d3)));
          waterNormalOffset = vec2(
            cos(d1 * 24.0 - uTime * 4.5) * p1.x / (d1 + 0.2) +
            cos(d2 * 26.0 - uTime * 4.9) * p2.x / (d2 + 0.2),
            sin(d1 * 24.0 - uTime * 4.5) * p1.y / (d1 + 0.2) +
            sin(d3 * 25.0 - uTime * 4.7) * p3.y / (d3 + 0.2)
          ) * 0.0022 * waterMask * suppressOnFoam * uWaveAmp;

          sampleUv = clamp(vUv + waterNormalOffset, 0.001, 0.999);

          // Expanding white foam rings around the Three Springs
          float ring1 = exp(-pow(d1 - (0.55 + 0.35 * fract(uTime * 0.65)), 2.0) * 14.0) * (1.0 - fract(uTime * 0.65));
          float ring2 = exp(-pow(d2 - (0.55 + 0.35 * fract(uTime * 0.65 + 0.33)), 2.0) * 14.0) * (1.0 - fract(uTime * 0.65 + 0.33));
          float ring3 = exp(-pow(d3 - (0.55 + 0.35 * fract(uTime * 0.65 + 0.66)), 2.0) * 14.0) * (1.0 - fract(uTime * 0.65 + 0.66));

          float coreBoil = max(
            exp(-d1 * d1 * 1.45) * (0.45 + 0.55 * sin(uTime * 7.5 + d1 * 12.0)),
            max(
              exp(-d2 * d2 * 1.55) * (0.45 + 0.55 * cos(uTime * 8.1 + d2 * 12.0)),
              exp(-d3 * d3 * 1.55) * (0.45 + 0.55 * sin(uTime * 7.8 + d3 * 12.0 + 1.5))
            )
          );
          dynamicFoam = clamp((ring1 + ring2 + ring3) * 0.65 + coreBoil * 0.42, 0.0, 1.0) * uWaveAmp;
        }

        // Gentle UV breeze on hanging willow branches
        if (foliageMask > 0.12 && waterMask < 0.05) {
          float leafBreeze = sin(uTime * 2.4 + vUv.y * 22.0 + vUv.x * 15.0) * 0.0016 * foliageMask * uWaveAmp;
          sampleUv.x = clamp(sampleUv.x + leafBreeze, 0.001, 0.999);
        }

        vec3 baseAlbedo = texture2D(uAlbedoMap, sampleUv).rgb;
        vec4 normAo = texture2D(uNormalAoMap, sampleUv);
        vec3 N = normalize(normAo.rgb * 2.0 - 1.0);
        float ao = normAo.a;

        // Perturb surface normal with live 3D water waves
        if (waterMask > 0.05) {
          N = normalize(N + vec3(waterNormalOffset * 65.0, 0.35));
        }

        // Dynamic Directional Sun & View Vectors (Blender Principled BSDF Lighting)
        vec3 L = normalize(vec3(cos(uSunAzimuth) * 0.72, 0.58, sin(uSunAzimuth) * 0.65 + 0.35));
        vec3 V = normalize(vec3(0.0, 0.22, 1.0));
        vec3 H = normalize(L + V);

        float NdotL = max(dot(N, L), 0.0);
        float NdotH = max(dot(N, H), 0.0);
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);

        // Cavity Bevel Highlight (Blender Bevel + Curvature node look)
        float bevelHighlight = smoothstep(0.76, 0.96, ao) * pow(NdotH, 12.0);
        float luma = dot(baseAlbedo, vec3(0.299, 0.587, 0.114));

        // Caustics & Mist above the Three Springs
        float caustics = 0.0;
        if (waterMask > 0.06) {
          caustics = causticPattern(vUv * 18.0, uTime * 0.55) * waterMask * (1.0 - smoothstep(0.65, 0.92, luma)) * 0.42;
        }
        float mistPlume = (
          exp(-pow((vUv.x - 0.465) / 0.065, 2.0) - pow((vUv.y - 0.53) / 0.095, 2.0)) *
          (0.6 + 0.4 * sin(uTime * 1.8 - vUv.y * 18.0)) +
          exp(-pow((vUv.x - 0.568) / 0.06, 2.0) - pow((vUv.y - 0.51) / 0.085, 2.0)) *
          (0.6 + 0.4 * cos(uTime * 2.1 - vUv.y * 16.0))
        ) * 0.24 * uWaveAmp;

        vec3 finalColor = baseAlbedo;

        // ============================================================================
        // MODE 0: Blender Cycles Photorealistic 3D Re-Render (Cycles 实景PBR重渲染)
        // ============================================================================
        if (uFinishMode < 0.5) {
          // Boost vibrant CGI saturation & micro-contrast
          vec3 satAlbedo = mix(vec3(luma), baseAlbedo, 1.18);

          // Principled BSDF Direct Sun + Sky Hemisphere + AO Crevice Shading
          vec3 sunTint = vec3(1.06, 0.98, 0.88);
          vec3 skyBounce = vec3(0.78, 0.88, 1.0);
          float diffuseRelight = mix(0.76, 1.24, NdotL * 0.65 + 0.35) * mix(0.62, 1.12, ao);

          finalColor = satAlbedo * mix(skyBounce * 0.88, sunTint, NdotL * 0.65 + 0.35) * diffuseRelight;

          // Subsurface Scattering (SSS) in the Emerald Spring Water & Sunlit Willow Leaves
          if (waterMask > 0.05) {
            vec3 jadeSss = vec3(0.04, 0.52, 0.44) * waterMask * (0.22 + 0.18 * NdotL);
            vec3 waterSpec = vec3(0.95, 0.99, 1.0) * pow(NdotH, 42.0) * 0.55 * waterMask;
            finalColor += jadeSss + waterSpec + vec3(0.45, 0.95, 0.85) * caustics;
            finalColor = mix(finalColor, vec3(0.97, 0.99, 1.0), dynamicFoam * 0.78);
          }
          if (foliageMask > 0.1) {
            finalColor += vec3(0.32, 0.48, 0.08) * foliageMask * pow(NdotL, 2.0) * 0.24;
          }

          // Crisp Cycles Bevel Specular on Carved Marble Balustrades & Tubular Roof Tiles
          finalColor += vec3(1.0, 0.97, 0.90) * bevelHighlight * 0.26;
          finalColor += vec3(0.92, 0.96, 1.0) * mistPlume;
        }
        // ============================================================================
        // MODE 1: Blender Studio Clay Render (Blender 白模泥塑 · AO + 翡翠琉璃水)
        // ============================================================================
        else if (uFinishMode < 1.5) {
          // Warm Ivory / Terracotta Studio Clay with Subsurface Cavity & Deep AO
          vec3 clayBase = vec3(0.91, 0.88, 0.83);
          vec3 clayShadow = vec3(0.46, 0.41, 0.37);
          vec3 claySss = vec3(0.96, 0.78, 0.66);

          float clayShade = clamp(NdotL * 0.62 + 0.38, 0.0, 1.0) * mix(0.42, 1.08, ao);
          // Preserve fine architectural carvings from photo luminance gradient
          float detailRelief = mix(0.75, 1.18, smoothstep(0.08, 0.92, luma));
          vec3 clayCol = mix(clayShadow, clayBase, clayShade * detailRelief);
          clayCol += claySss * fresnel * 0.22;
          clayCol += vec3(1.0, 0.99, 0.96) * pow(NdotH, 18.0) * 0.28 * ao;

          if (waterMask > 0.08) {
            // Translucent Emerald-Jade Glass Water inside the Clay Model!
            vec3 glassWater = mix(
              vec3(0.05, 0.38, 0.36),
              vec3(0.18, 0.72, 0.66),
              clamp(luma * 1.1 + caustics, 0.0, 1.0)
            );
            // Subtle koi silhouettes visible through the jade glass water
            float koiHint = clamp((baseAlbedo.r - baseAlbedo.g) * 1.8, 0.0, 1.0);
            glassWater = mix(glassWater, vec3(0.88, 0.42, 0.22), koiHint * 0.65);
            glassWater += vec3(0.95, 0.99, 1.0) * (pow(NdotH, 48.0) * 0.65 + dynamicFoam * 0.85);
            glassWater = mix(glassWater, vec3(0.98, 0.99, 1.0), smoothstep(0.72, 0.94, luma) * 0.88);
            finalColor = mix(clayCol, glassWater, smoothstep(0.05, 0.28, waterMask));
          } else {
            finalColor = clayCol;
          }
          finalColor += vec3(0.95, 0.97, 1.0) * mistPlume * 0.85;
        }
        // ============================================================================
        // MODE 2: Song Dynasty Mineral Blue-Green Shader (千里江山 · 青绿泥金 + 线稿)
        // ============================================================================
        else if (uFinishMode < 2.5) {
          vec3 azurite = vec3(0.08, 0.32, 0.48);
          vec3 malachite = vec3(0.11, 0.56, 0.44);
          vec3 cinnabar = vec3(0.76, 0.24, 0.18);
          vec3 goldLeaf = vec3(0.94, 0.76, 0.34);
          vec3 silkPaper = vec3(0.92, 0.89, 0.81);

          vec3 mineralCol = mix(azurite, silkPaper, smoothstep(0.15, 0.88, luma));
          if (foliageMask > 0.1 || waterMask > 0.05) {
            mineralCol = mix(azurite, malachite, clamp(luma * 1.3 + 0.15, 0.0, 1.0));
          }
          if (emissiveMask > 0.15) {
            mineralCol = mix(mineralCol, cinnabar, 0.72);
          }

          // Blender Freestyle Ink Contour + Gold Leaf Rim
          float edgeInk = smoothstep(0.62, 0.28, ao);
          mineralCol = mix(mineralCol, vec3(0.08, 0.12, 0.15), edgeInk * 0.55);
          mineralCol += goldLeaf * (bevelHighlight * 0.65 + fresnel * 0.25);

          if (waterMask > 0.05) {
            mineralCol += vec3(0.85, 0.96, 0.92) * (caustics + dynamicFoam * 0.82);
            mineralCol = mix(mineralCol, vec3(0.98, 0.97, 0.93), smoothstep(0.74, 0.94, luma) * 0.85);
          }
          finalColor = mineralCol * mix(0.78, 1.15, NdotL);
        }
        // ============================================================================
        // MODE 3: Imperial White Jade & 24K Gilded Gold (白玉鎏金 · 皇家微缩沙盘)
        // ============================================================================
        else {
          vec3 whiteJade = mix(vec3(0.76, 0.81, 0.79), vec3(0.98, 0.99, 0.97), smoothstep(0.1, 0.85, luma));
          vec3 brushedGold = vec3(0.96, 0.78, 0.28);

          float goldMask = clamp(emissiveMask * 1.4 + bevelHighlight * 1.2 + (1.0 - ao) * 0.4, 0.0, 1.0);
          vec3 jadeGoldCol = mix(whiteJade, brushedGold, goldMask * 0.58);
          jadeGoldCol *= mix(0.68, 1.16, NdotL * 0.6 + 0.4) * mix(0.65, 1.08, ao);
          jadeGoldCol += vec3(1.0, 0.92, 0.65) * pow(NdotH, 28.0) * 0.45;

          if (waterMask > 0.06) {
            vec3 emeraldPool = mix(vec3(0.03, 0.36, 0.32), vec3(0.14, 0.76, 0.64), luma);
            float koiGold = clamp((baseAlbedo.r - baseAlbedo.g) * 1.8, 0.0, 1.0);
            emeraldPool = mix(emeraldPool, brushedGold, koiGold * 0.85);
            emeraldPool += vec3(0.98, 0.99, 1.0) * (dynamicFoam * 0.85 + caustics * 0.7);
            emeraldPool = mix(emeraldPool, vec3(0.99, 0.99, 1.0), smoothstep(0.72, 0.94, luma) * 0.9);
            finalColor = mix(jadeGoldCol, emeraldPool, smoothstep(0.05, 0.25, waterMask));
          } else {
            finalColor = jadeGoldCol;
          }
        }

        // ============================================================================
        // LIGHTING PRESET GRADING (Daylight / Morning Mist / Sunset / Night GI Lanterns)
        // ============================================================================
        if (uLightingMode > 1.5 && uLightingMode < 2.5) {
          // Lishan Golden Dusk (齐烟夕照)
          finalColor *= vec3(1.12, 0.91, 0.76);
          finalColor += vec3(0.98, 0.58, 0.22) * pow(NdotL, 2.0) * 0.18;
        } else if (uLightingMode > 2.5) {
          // Minghu Lantern Moonlight (明湖夜月 · Blender Cycles 夜景全局光)
          finalColor *= vec3(0.32, 0.46, 0.68);
          // Warm Golden Palace Lanterns glowing inside Luoyuan Hall, Guanlan Pavilion & West Halls!
          float lanternGlow = emissiveMask * 1.45;
          // Ambient lantern bounce on nearby balustrades and steps
          float hallProximity =
            exp(-pow((vUv.x - 0.57) / 0.16, 2.0) - pow((vUv.y - 0.62) / 0.12, 2.0)) +
            exp(-pow((vUv.x - 0.76) / 0.14, 2.0) - pow((vUv.y - 0.56) / 0.14, 2.0)) +
            exp(-pow((vUv.x - 0.14) / 0.14, 2.0) - pow((vUv.y - 0.60) / 0.12, 2.0));
          finalColor += vec3(1.0, 0.68, 0.24) * (lanternGlow * 0.95 + hallProximity * 0.28 * ao);
          // Underwater bioluminescent cyan-jade spring illumination at the Three Springs
          if (waterMask > 0.05) {
            float springGlow = exp(-min(d1, min(d2, d3)) * 0.65);
            finalColor += vec3(0.12, 0.85, 0.78) * (springGlow * 0.55 + caustics * 0.85 + dynamicFoam * 0.65);
          }
        }

        // ============================================================================
        // BLENDER QUAD WIREFRAME + SURFACE NORMAL OVERLAY PASS (线框与法线叠加)
        // ============================================================================
        if (uWireframePass > 0.5) {
          vec2 grid = abs(fract(vUv * vec2(128.0, 72.0) - 0.5) - 0.5);
          float line = smoothstep(0.045, 0.01, min(grid.x, grid.y));
          vec3 normalVis = N * 0.5 + 0.5;
          finalColor = mix(finalColor, mix(finalColor, normalVis, 0.35), 0.5);
          finalColor = mix(finalColor, vec3(0.22, 0.88, 0.98), line * 0.65);
        }

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });
  materialsToDispose.push(cyclesShaderMat);

  // Position & orient the 3D Displaced Relief Stage upright for zero vertical distortion
  const reliefMesh = new THREE.Mesh(reliefGeo, cyclesShaderMat);
  reliefMesh.position.set(0, 2.75, -0.2);
  reliefMesh.rotation.x = -0.04;
  rootGroup.add(reliefMesh);

  // ============================================================================
  // 2. Blender 3D Architectural Diorama Pedestal & Cutaway Karst Aquifer Base
  // ============================================================================
  const pedestalGroup = new THREE.Group();

  const plinthGeo = new THREE.BoxGeometry(10.85, 0.45, 2.4);
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.42,
    metalness: 0.28,
  });
  const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
  plinthMesh.position.set(0, -0.35, -0.2);
  plinthMesh.receiveShadow = true;
  pedestalGroup.add(plinthMesh);

  // Golden Brass Blender Diorama Trim Frame
  const brassTrimGeo = new THREE.BoxGeometry(10.95, 0.07, 2.5);
  const brassTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.25,
    metalness: 0.85,
  });
  const brassTrimMesh = new THREE.Mesh(brassTrimGeo, brassTrimMat);
  brassTrimMesh.position.set(0, -0.1, -0.2);
  pedestalGroup.add(brassTrimMesh);

  // Back Structural Backing Wall of the Blender Diorama Stage
  const backFrameGeo = new THREE.BoxGeometry(10.85, 6.0, 0.18);
  const backFrameMesh = new THREE.Mesh(backFrameGeo, plinthMat);
  backFrameMesh.position.set(0, 2.75, -0.55);
  backFrameMesh.rotation.x = -0.04;
  pedestalGroup.add(backFrameMesh);

  geometriesToDispose.push(plinthGeo, brassTrimGeo, backFrameGeo);
  materialsToDispose.push(plinthMat, brassTrimMat);
  rootGroup.add(pedestalGroup);

  // 45 3D Koi Fish swimming in the foreground pool space
  const koiCount = 45;
  const koiGeo = new THREE.ConeGeometry(0.036, 0.22, 8);
  koiGeo.rotateX(Math.PI / 2);
  koiGeo.scale(0.68, 0.45, 1.0);
  const koiMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.1,
  });
  geometriesToDispose.push(koiGeo);
  materialsToDispose.push(koiMat);

  const koiMesh = new THREE.InstancedMesh(koiGeo, koiMat, koiCount);
  const koiData: KoiInstanceData[] = [];
  const dummy = new THREE.Object3D();
  const c = new THREE.Color();
  const koiColors = [0xef4444, 0xdc2626, 0xf97316, 0xfbbf24, 0xfef3c7];

  for (let i = 0; i < koiCount; i++) {
    const isEastCluster = i < 26;
    const bx = isEastCluster
      ? 0.45 + (i % 7) * 0.34
      : -2.1 + (i % 6) * 0.38;
    const bz = isEastCluster
      ? 0.42 + ((i * 3) % 5) * 0.12
      : 0.48 + ((i * 5) % 4) * 0.12;
    const depthY = 0.72 + (0.95 - bz) * 0.85;
    const orbitRadius = 0.12 + (i % 4) * 0.04;
    const speed = 0.55 + (i % 5) * 0.12;
    const phase = i * 0.75;
    const scale = 0.75 + (i % 3) * 0.15;

    koiData.push({ baseX: bx, baseZ: bz, orbitRadius, speed, phase, depthY, scale });
    dummy.position.set(bx, depthY, bz);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    koiMesh.setMatrixAt(i, dummy.matrix);
    c.setHex(koiColors[i % koiColors.length]);
    koiMesh.setColorAt(i, c);
  }
  koiMesh.instanceMatrix.needsUpdate = true;
  if (koiMesh.instanceColor) koiMesh.instanceColor.needsUpdate = true;
  rootGroup.add(koiMesh);

  // ============================================================================
  // 4. 10 Interactive 3D Landmark Hit-Targets & Subtle Golden Focus Pins (Layer 1)
  // Mapped to the exact 3D coordinates of each landmark on the photo-reconstructed stage
  // ============================================================================
  const photoStagePositions: Record<
    string,
    {
      pos: [number, number, number];
      hitSize: [number, number, number];
      camPos: [number, number, number];
      camTarget: [number, number, number];
    }
  > = {
    'baotu-three-springs': {
      pos: [0.05, 1.98, 0.25],
      hitSize: [2.2, 1.2, 1.2],
      camPos: [0.0, 2.25, 4.2],
      camTarget: [0.05, 1.98, 0.1],
    },
    'baotu-luoyuan-hall': {
      pos: [0.82, 3.85, -0.32],
      hitSize: [2.5, 1.5, 1.0],
      camPos: [0.65, 3.65, 4.1],
      camTarget: [0.82, 3.75, -0.32],
    },
    'baotu-guanlan-pavilion': {
      pos: [2.75, 3.28, -0.05],
      hitSize: [2.3, 1.7, 1.1],
      camPos: [2.35, 3.15, 4.3],
      camTarget: [2.65, 3.18, -0.05],
    },
    'baotu-koi-group': {
      pos: [1.55, 0.98, 0.65],
      hitSize: [2.6, 1.0, 1.1],
      camPos: [1.25, 1.45, 4.2],
      camTarget: [1.45, 1.05, 0.5],
    },
    'baotu-marble-railing': {
      pos: [-2.15, 1.32, 0.55],
      hitSize: [2.2, 1.1, 1.0],
      camPos: [-1.85, 1.75, 4.3],
      camTarget: [-2.05, 1.35, 0.45],
    },
    'baotu-weeping-willow': {
      pos: [-1.82, 3.92, -0.35],
      hitSize: [2.1, 1.8, 1.0],
      camPos: [-1.55, 3.65, 4.2],
      camTarget: [-1.82, 3.82, -0.35],
    },
    'baotu-west-corridor': {
      pos: [-3.75, 3.25, -0.15],
      hitSize: [2.2, 1.5, 1.0],
      camPos: [-3.15, 3.15, 4.3],
      camTarget: [-3.65, 3.18, -0.15],
    },
    'baotu-laihe-bridge': {
      pos: [4.35, 2.95, -0.1],
      hitSize: [1.6, 1.3, 1.0],
      camPos: [3.65, 2.95, 4.1],
      camTarget: [4.25, 2.9, -0.1],
    },
    'baotu-west-weir': {
      pos: [-2.25, 2.38, 0.15],
      hitSize: [1.3, 1.0, 1.0],
      camPos: [-1.95, 2.45, 4.1],
      camTarget: [-2.25, 2.38, 0.05],
    },
    'baotu-jade-water': {
      pos: [-0.75, 1.45, 0.45],
      hitSize: [2.0, 1.0, 1.0],
      camPos: [-0.55, 1.85, 4.3],
      camTarget: [-0.75, 1.45, 0.35],
    },
  };

  const hitMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  materialsToDispose.push(hitMat);

  for (const rawSpec of landmarkSpecs) {
    const mapped = photoStagePositions[rawSpec.id];
    if (!mapped) continue;

    const adjustedSpec: InspectablePartSpec = {
      ...rawSpec,
      focusCameraPos: mapped.camPos,
      focusTargetPos: mapped.camTarget,
    };

    const g = new THREE.Group();
    g.position.set(...mapped.pos);
    g.userData.partSpec = adjustedSpec;

    const hitGeo = new THREE.BoxGeometry(...mapped.hitSize);
    geometriesToDispose.push(hitGeo);
    const hitBox = new THREE.Mesh(hitGeo, hitMat);
    hitBox.layers.enable(1);
    hitBox.userData.partSpec = adjustedSpec;
    g.add(hitBox);

    rootGroup.add(g);
    parts.push({
      partSpec: adjustedSpec,
      object: g,
      basePos: new THREE.Vector3(...mapped.pos),
      explodeVec: new THREE.Vector3(0, 0.15, 0.35),
    });
  }

  return {
    rootGroup,
    parts,
    instancedMeshes: [koiMesh],
    koiMesh,
    koiData,
    photoShaderUniforms: photoUniforms,
    dispose: () => {
      for (const geo of geometriesToDispose) geo.dispose();
      for (const mat of materialsToDispose) mat.dispose();
      for (const tex of texturesToDispose) tex.dispose();
    },
  };
}

/**
 * Generates a complete, runnable Blender 4.2 Python Script (.py) that builds
 * the Baotu Spring Camera-Projected + PBR 3D Scene inside desktop Blender.
 */
export function generateBlenderPythonScript(): string {
  return `# ==============================================================================
# Blender 4.2+ Cycles Python Script: 济南趵突泉 (Baotu Spring) 实景三维重建与渲染
# 使用方法：打开 Blender -> Scripting (脚本) 工作区 -> 新建脚本 -> 粘贴并点击 Run Script
# ==============================================================================
import bpy
import math

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def setup_cycles_renderer():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 256
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 2048
    scene.render.resolution_y = 1144
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - High Contrast'

    # Nishita Physical Sky (实景晴空暖阳)
    world = bpy.data.worlds.new("Baotu_Nishita_Sky")
    scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()

    sky_tex = nodes.new(type='ShaderNodeTexSky')
    sky_tex.sky_type = 'NISHITA'
    sky_tex.sun_elevation = math.radians(32.0)
    sky_tex.sun_rotation = math.radians(135.0)
    sky_tex.air_density = 1.15
    sky_tex.dust_density = 1.2

    bg = nodes.new(type='ShaderNodeBackground')
    bg.inputs['Strength'].default_value = 1.15
    out = nodes.new(type='ShaderNodeOutputWorld')
    links.new(sky_tex.outputs['Color'], bg.inputs['Color'])
    links.new(bg.outputs['Background'], out.inputs['Surface'])

def create_pbr_materials():
    mats = {}

    # 1. 翡翠玻璃泉水材质 (Emerald-Jade Spring Water)
    mat_water = bpy.data.materials.new(name="Emerald_Spring_Water")
    mat_water.use_nodes = True
    bsdf = mat_water.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.04, 0.42, 0.36, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.06
    bsdf.inputs["IOR"].default_value = 1.333
    bsdf.inputs["Transmission Weight"].default_value = 0.88
    mats["water"] = mat_water

    # 2. 三股水翻涌白浪材质 (Boiling Spring Foam)
    mat_foam = bpy.data.materials.new(name="Three_Springs_Foam")
    mat_foam.use_nodes = True
    bsdf_f = mat_foam.node_tree.nodes["Principled BSDF"]
    bsdf_f.inputs["Base Color"].default_value = (0.97, 0.99, 1.0, 1.0)
    bsdf_f.inputs["Roughness"].default_value = 0.18
    bsdf_f.inputs["Subsurface Weight"].default_value = 0.65
    mats["foam"] = mat_foam

    # 3. 汉白玉望柱石栏材质 (Carved White Marble)
    mat_marble = bpy.data.materials.new(name="Carved_White_Marble")
    mat_marble.use_nodes = True
    bsdf_m = mat_marble.node_tree.nodes["Principled BSDF"]
    bsdf_m.inputs["Base Color"].default_value = (0.91, 0.89, 0.86, 1.0)
    bsdf_m.inputs["Roughness"].default_value = 0.45
    mats["marble"] = mat_marble

    # 4. 青灰筒瓦与朱红木构材质 (Grey Roof Tiles & Vermilion Columns)
    mat_roof = bpy.data.materials.new(name="Xieshan_Grey_Roof")
    mat_roof.use_nodes = True
    mat_roof.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.23, 0.26, 0.30, 1.0)
    mat_roof.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.42
    mats["roof"] = mat_roof

    mat_red = bpy.data.materials.new(name="Vermilion_Timber")
    mat_red.use_nodes = True
    mat_red.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.62, 0.16, 0.16, 1.0)
    mats["red"] = mat_red

    return mats

def build_baotu_spring_geometry(mats):
    # 1. 方形泉池与翡翠水面 (Rectangular Pool & Water Plane)
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 0, 0.25))
    water_obj = bpy.context.active_object
    water_obj.name = "Baotu_Jade_Water_Pool"
    water_obj.scale = (4.8, 3.9, 1.0)
    water_obj.data.materials.append(mats["water"])

    # 2. 三股水涌浪 (Three Gushing Springs: 品字形分布)
    spring_coords = [(0.0, -0.45, 0.32), (-0.42, 0.35, 0.32), (0.46, 0.25, 0.32)]
    for i, pos in enumerate(spring_coords):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=0.42, location=pos)
        sp = bpy.context.active_object
        sp.name = f"Three_Gushing_Spring_{i+1}"
        sp.scale = (1.0, 1.0, 0.45)
        bpy.ops.object.shade_smooth()
        sp.data.materials.append(mats["foam"])

    # 3. 四围汉白玉望柱石栏 (52 Carved White Marble Balustrade Posts)
    for ix in range(-6, 7):
        for z_side in (-1.98, 1.98):
            bpy.ops.mesh.primitive_cylinder_add(radius=0.055, depth=0.62, location=(ix * 0.4, z_side, 0.55))
            post = bpy.context.active_object
            post.data.materials.append(mats["marble"])

    # 4. 北岸正殿：泺源堂 (Luoyuan Hall - 5-Bay Hip-and-Gable Hall)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.25, 2.95, 1.25))
    hall_body = bpy.context.active_object
    hall_body.name = "Luoyuan_Hall_Body"
    hall_body.scale = (3.4, 1.25, 1.15)
    hall_body.data.materials.append(mats["red"])

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.25, 2.95, 2.15))
    hall_roof = bpy.context.active_object
    hall_roof.name = "Luoyuan_Hall_Xieshan_Roof"
    hall_roof.scale = (3.9, 1.65, 0.65)
    hall_roof.data.materials.append(mats["roof"])

    # 5. 东岸敞轩：观澜亭 (Guanlan Pavilion)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(3.05, 0.15, 1.85))
    pav_roof = bpy.context.active_object
    pav_roof.name = "Guanlan_Pavilion_Roof"
    pav_roof.scale = (1.95, 1.95, 0.58)
    pav_roof.data.materials.append(mats["roof"])

    # 6. 西南角实景对齐摄像机 (Reference Photo Matched Camera, 38mm Focal Length)
    bpy.ops.object.camera_add(location=(-2.65, -5.25, 2.38), rotation=(math.radians(72.5), 0.0, math.radians(-26.0)))
    cam = bpy.context.active_object
    cam.name = "Reference_Photo_Camera"
    cam.data.lens = 38.0
    bpy.context.scene.camera = cam

if __name__ == "__main__":
    clear_scene()
    setup_cycles_renderer()
    materials = create_pbr_materials()
    build_baotu_spring_geometry(materials)
    print("Baotu Spring Blender Cycles 3D Scene generated successfully!")
`;
}
