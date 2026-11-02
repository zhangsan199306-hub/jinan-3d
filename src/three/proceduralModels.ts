import * as THREE from 'three';
import {
  FinishPalette,
  InspectablePartSpec,
  ScenePresetId,
} from '../types/studio';
import { createPlaqueTexture } from './proceduralTextures';

export interface MaterialBundle {
  primaryRoof: THREE.MeshPhysicalMaterial;
  secondaryTimber: THREE.MeshStandardMaterial;
  stonePlinth: THREE.MeshPhysicalMaterial;
  waterCrystal: THREE.MeshPhysicalMaterial;
  whiteFoam: THREE.MeshStandardMaterial;
  mistVolume: THREE.MeshBasicMaterial;
  paintedBeam: THREE.MeshStandardMaterial;
  whiteWall: THREE.MeshStandardMaterial;
  yellowScroll: THREE.MeshStandardMaterial;
  springBasinPlate: THREE.MeshStandardMaterial;
  gildedAccent: THREE.MeshStandardMaterial;
  foliageInstanced: THREE.MeshStandardMaterial;
  willowStrandMat: THREE.MeshStandardMaterial;
  koiInstancedMat: THREE.MeshStandardMaterial;
  stoneTerrain: THREE.MeshStandardMaterial;
  luoyuanPlaqueMat: THREE.MeshStandardMaterial;
  pavilionPlaqueMat: THREE.MeshStandardMaterial;
  shaderUniforms: { uTime: { value: number }; uWaveAmp: { value: number } };
}

export interface AnimatedSubAssembly {
  object: THREE.Object3D;
  basePos: THREE.Vector3;
  explodeVec: THREE.Vector3;
  spinAxis?: 'x' | 'y' | 'z';
  spinSpeed?: number;
  bobAmp?: number;
  bobFreq?: number;
  partSpec: InspectablePartSpec;
}

export interface KoiInstanceData {
  baseX: number;
  baseZ: number;
  depthY: number;
  orbitRadius: number;
  speed: number;
  phase: number;
  scale: number;
}

export type PartObjectEntry = AnimatedSubAssembly;

export interface PhotoStageShaderUniforms {
  uAlbedoMap: { value: THREE.Texture };
  uHeightMaskMap: { value: THREE.Texture };
  uNormalAoMap: { value: THREE.Texture };
  uTime: { value: number };
  uWaveAmp: { value: number };
  uSunAzimuth: { value: number };
  uFinishMode: { value: number };
  uLightingMode: { value: number };
  uWireframePass: { value: number };
  uExplode: { value: number };
}

export interface BuiltCreationScene {
  rootGroup: THREE.Group;
  parts: AnimatedSubAssembly[];
  instancedMeshes: THREE.InstancedMesh[];
  koiMesh?: THREE.InstancedMesh;
  koiData?: KoiInstanceData[];
  photoShaderUniforms?: PhotoStageShaderUniforms;
  dispose: () => void;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function createStudioMaterials(
  palette: FinishPalette,
  waterTex: THREE.CanvasTexture,
  tileBumpTex: THREE.CanvasTexture,
  flagstoneTex: THREE.CanvasTexture,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): MaterialBundle {
  const shaderUniforms = {
    uTime: { value: 0 },
    uWaveAmp: { value: 1.0 },
  };

  const primaryRoof = new THREE.MeshPhysicalMaterial({
    color: palette.primaryRoof.color,
    metalness: palette.primaryRoof.metalness,
    roughness: palette.primaryRoof.roughness,
    roughnessMap: tileBumpTex,
    bumpMap: tileBumpTex,
    bumpScale: 0.018,
    anisotropy: isSoftwareGl ? 0 : palette.primaryRoof.anisotropy,
    clearcoat: 0.25,
    clearcoatRoughness: 0.28,
  });

  const secondaryTimber = new THREE.MeshStandardMaterial({
    color: palette.secondaryTimber.color,
    metalness: palette.secondaryTimber.metalness,
    roughness: Math.min(1, palette.primaryRoof.roughness + 0.26),
    bumpMap: tileBumpTex,
    bumpScale: 0.006,
  });

  const stonePlinth = new THREE.MeshPhysicalMaterial({
    color: palette.stonePlinth.color,
    metalness: palette.stonePlinth.metalness,
    roughness: palette.stonePlinth.roughness,
    clearcoat: palette.stonePlinth.clearcoat,
    clearcoatRoughness: 0.2,
  });

  const waterCrystal = new THREE.MeshPhysicalMaterial({
    color: palette.waterCrystal.color,
    metalness: 0.05,
    roughness: 0.08,
    transmission: isSoftwareGl ? 0 : 0.85,
    transparent: true,
    opacity: isSoftwareGl ? 0.65 : 0.94,
    ior: palette.waterCrystal.ior,
    thickness: 1.2,
    attenuationColor: new THREE.Color(palette.waterCrystal.attenuationColor),
    attenuationDistance: 2.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  // Boiling snow-white spring foam material with custom vertex displacement
  const whiteFoam = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe2e8f0,
    emissiveIntensity: 0.22,
    roughness: 0.18,
    metalness: 0.02,
  });

  whiteFoam.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shaderUniforms.uTime;
    shader.uniforms.uWaveAmp = shaderUniforms.uWaveAmp;
    shader.vertexShader =
      `uniform float uTime;\nuniform float uWaveAmp;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float boil = (sin(position.x * 9.0 + uTime * 6.5) * cos(position.z * 9.0 - uTime * 5.8) + sin(position.y * 12.0 + uTime * 8.0) * 0.5) * 0.048 * uWaveAmp;
        transformed += normal * boil;
        `
      );
  };

  const mistVolume = new THREE.MeshBasicMaterial({
    color: 0xf8fafc,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });

  // Traditional Chinese Xuanzi Blue-Green Painted Architrave Beam (青绿彩绘额枋)
  const paintedBeam = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    roughness: 0.42,
    metalness: 0.25,
  });

  const whiteWall = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.72,
    metalness: 0.05,
  });

  const yellowScroll = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    roughness: 0.5,
    metalness: 0.1,
  });

  const springBasinPlate = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: waterTex,
    metalness: 0.25,
    roughness: 0.14,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const gildedAccent = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xb45309,
    emissiveIntensity: 0.25,
    roughness: 0.24,
    metalness: 0.85,
  });

  const foliageInstanced = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0.06,
  });

  const willowStrandMat = new THREE.MeshStandardMaterial({
    color: 0x65a30d,
    roughness: 0.55,
    metalness: 0.05,
  });

  const koiInstancedMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.15,
  });

  const stoneTerrain = new THREE.MeshStandardMaterial({
    color: palette.terrainColor,
    map: flagstoneTex,
    roughness: 0.76,
    metalness: 0.08,
  });

  const luoyuanPlaqueMat = new THREE.MeshStandardMaterial({
    map: createPlaqueTexture('泺 源 堂', maxAnisotropy),
    roughness: 0.3,
    metalness: 0.4,
  });

  const pavilionPlaqueMat = new THREE.MeshStandardMaterial({
    map: createPlaqueTexture('观 澜 亭', maxAnisotropy),
    roughness: 0.3,
    metalness: 0.4,
  });

  return {
    primaryRoof,
    secondaryTimber,
    stonePlinth,
    waterCrystal,
    whiteFoam,
    mistVolume,
    paintedBeam,
    whiteWall,
    yellowScroll,
    springBasinPlate,
    gildedAccent,
    foliageInstanced,
    willowStrandMat,
    koiInstancedMat,
    stoneTerrain,
    luoyuanPlaqueMat,
    pavilionPlaqueMat,
    shaderUniforms,
  };
}

export function applyPaletteToMaterials(
  mats: MaterialBundle,
  palette: FinishPalette,
  wireframe: boolean
) {
  mats.primaryRoof.color.setHex(palette.primaryRoof.color);
  mats.primaryRoof.metalness = palette.primaryRoof.metalness;
  mats.primaryRoof.roughness = palette.primaryRoof.roughness;
  mats.primaryRoof.wireframe = wireframe;

  mats.secondaryTimber.color.setHex(palette.secondaryTimber.color);
  mats.secondaryTimber.metalness = palette.secondaryTimber.metalness;
  mats.secondaryTimber.roughness = Math.min(1, palette.primaryRoof.roughness + 0.26);
  mats.secondaryTimber.wireframe = wireframe;

  mats.stonePlinth.color.setHex(palette.stonePlinth.color);
  mats.stonePlinth.metalness = palette.stonePlinth.metalness;
  mats.stonePlinth.roughness = palette.stonePlinth.roughness;
  mats.stonePlinth.wireframe = wireframe;

  mats.waterCrystal.color.setHex(palette.waterCrystal.color);
  mats.waterCrystal.attenuationColor.setHex(palette.waterCrystal.attenuationColor);
  mats.waterCrystal.ior = palette.waterCrystal.ior;
  mats.waterCrystal.wireframe = wireframe;

  mats.whiteFoam.wireframe = wireframe;
  mats.stoneTerrain.color.setHex(palette.terrainColor);
  mats.stoneTerrain.wireframe = wireframe;
  mats.springBasinPlate.wireframe = wireframe;
}

export function groundHeightAt(preset: ScenePresetId, x: number, z: number): number {
  const dist = Math.sqrt(x * x + z * z);
  if (preset === 'baotu') {
    // Sunken rectangular pool in the center, flat flagstone courtyard around it
    if (Math.abs(x) < 2.35 && Math.abs(z) < 1.95) {
      return 0.14;
    }
    return 0.36;
  }
  if (preset === 'daming') {
    if (dist < 1.25) return 0.38;
    if (x > 2.1 && Math.abs(z) < 2.2) return 0.45;
    if (dist > 4.2) return 0.36 + Math.sin(x * 0.7 + z * 0.7) * 0.1;
    return 0.16;
  }
  if (preset === 'qianfo') {
    const peakDist = Math.sqrt(x * x + (z + 0.8) * (z + 0.8));
    const mountain = Math.max(0, 2.85 - peakDist * 0.58);
    const ridge = Math.sin(x * 0.8) * Math.cos(z * 0.8) * 0.22;
    return Math.max(0.2, 0.28 + mountain + ridge);
  }
  const valley = 0.28 + Math.max(0, (x - 1.2) * 0.35 - Math.abs(z) * 0.12);
  const undulations = Math.sin(x * 0.6) * Math.cos(z * 0.6) * 0.14;
  return Math.max(0.22, valley + undulations);
}

/**
 * Helper: Build a sweeping upturned eave via LatheGeometry
 */
function createSweepingEaveGeometry(
  baseRadius: number,
  height: number,
  sides = 4,
  rotationOffset = Math.PI / 4
): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(baseRadius * 0.14, height),
    new THREE.Vector2(baseRadius * 0.54, height * 0.65),
    new THREE.Vector2(baseRadius * 0.86, height * 0.25),
    new THREE.Vector2(baseRadius * 1.08, height * 0.07),
    new THREE.Vector2(baseRadius * 1.0, 0),
    new THREE.Vector2(baseRadius * 0.1, 0),
  ];
  const geo = new THREE.LatheGeometry(pts, sides);
  if (rotationOffset !== 0) {
    geo.rotateY(rotationOffset);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Helper: Build a high-detail Xieshan (歇山顶 Hip-and-Gable) Hall or Open Pavilion
 * accurately matching Luoyuan Hall and the East Pavilion in the reference photo!
 */
function createXieshanArchitectureGroup(
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  mats: MaterialBundle,
  opts: {
    width: number;
    depth: number;
    plinthH: number;
    colH: number;
    colsX: number;
    colsZ: number;
    isOpenPavilion?: boolean;
    hasBeautyRail?: boolean;
    hasYellowScrolls?: boolean;
    plaqueMat?: THREE.Material;
    hasThreeFlightStairs?: boolean;
  }
): THREE.Group {
  const group = new THREE.Group();

  // 1. Stone Sumeru Plinth
  const plinthGeo = trackGeo(
    new THREE.BoxGeometry(opts.width * 1.08, opts.plinthH, opts.depth * 1.08)
  );
  plinthGeo.translate(0, opts.plinthH / 2, 0);
  group.add(new THREE.Mesh(plinthGeo, mats.stonePlinth));

  // Optional 3-flight white marble approach stairs (三出陛台阶 for Luoyuan Hall)
  if (opts.hasThreeFlightStairs) {
    const stairW = opts.width * 0.46;
    const stairD = 0.55;
    const stairRampGeo = trackGeo(new THREE.BoxGeometry(stairW, opts.plinthH * 0.85, stairD));
    stairRampGeo.translate(0, opts.plinthH * 0.42, opts.depth * 0.54 + stairD * 0.45);
    group.add(new THREE.Mesh(stairRampGeo, mats.stonePlinth));

    // Four carved white marble stair balustrades (丹墀石栏)
    [-stairW * 0.48, -stairW * 0.16, stairW * 0.16, stairW * 0.48].forEach((sx) => {
      const railGeo = trackGeo(new THREE.BoxGeometry(0.06, opts.plinthH + 0.18, stairD + 0.1));
      railGeo.translate(sx, (opts.plinthH + 0.18) / 2, opts.depth * 0.54 + stairD * 0.45);
      group.add(new THREE.Mesh(railGeo, mats.stonePlinth));
    });
  }

  const baseY = opts.plinthH;

  // 2. Interior Chamber or Open Pavilion Floor
  if (!opts.isOpenPavilion) {
    const wallGeo = trackGeo(
      new THREE.BoxGeometry(opts.width * 0.86, opts.colH, opts.depth * 0.78)
    );
    wallGeo.translate(0, baseY + opts.colH / 2, -opts.depth * 0.04);
    group.add(new THREE.Mesh(wallGeo, mats.secondaryTimber));
  }

  // 3. Vermilion Columns (朱红廊柱)
  const colGeo = trackGeo(new THREE.CylinderGeometry(0.052, 0.056, opts.colH, 14));
  colGeo.translate(0, baseY + opts.colH / 2, 0);

  for (let ix = 0; ix < opts.colsX; ix++) {
    const px =
      opts.colsX === 1
        ? 0
        : -opts.width * 0.46 + (ix / (opts.colsX - 1)) * (opts.width * 0.92);
    for (let iz = 0; iz < opts.colsZ; iz++) {
      // Only place perimeter columns
      if (ix > 0 && ix < opts.colsX - 1 && iz > 0 && iz < opts.colsZ - 1) continue;
      const pz =
        opts.colsZ === 1
          ? 0
          : -opts.depth * 0.44 + (iz / (opts.colsZ - 1)) * (opts.depth * 0.88);
      const colMesh = new THREE.Mesh(colGeo, mats.secondaryTimber);
      colMesh.position.set(px, 0, pz);
      group.add(colMesh);
    }
  }

  // Optional Red "Beauty Backrest" Perimeter Benches (朱红美人靠)
  if (opts.hasBeautyRail) {
    const railH = 0.24;
    const fRail = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(opts.width * 0.92, railH, 0.05)),
      mats.secondaryTimber
    );
    fRail.position.set(0, baseY + railH / 2, opts.depth * 0.44);
    const bRail = fRail.clone();
    bRail.position.set(0, baseY + railH / 2, -opts.depth * 0.44);
    group.add(fRail, bRail);
  }

  // Optional Yellow Vertical Couplet Banners (明黄楹联挂轴 as seen in East Pavilion)
  if (opts.hasYellowScrolls) {
    const scrollGeo = trackGeo(new THREE.BoxGeometry(0.11, opts.colH * 0.62, 0.02));
    [-opts.width * 0.22, opts.width * 0.22].forEach((sx) => {
      const scroll = new THREE.Mesh(scrollGeo, mats.yellowScroll);
      scroll.position.set(sx, baseY + opts.colH * 0.48, opts.depth * 0.45);
      group.add(scroll);
    });
  }

  // 4. Blue-Green Xuanzi Painted Architrave Beam Frieze (青绿彩绘额枋)
  const beamH = 0.16;
  const beamGeo = trackGeo(
    new THREE.BoxGeometry(opts.width * 0.95, beamH, opts.depth * 0.91)
  );
  beamGeo.translate(0, baseY + opts.colH - beamH / 2, 0);
  group.add(new THREE.Mesh(beamGeo, mats.paintedBeam));

  // 5. Traditional Black & Gold Calligraphy Plaque (匾额)
  if (opts.plaqueMat) {
    const plaqueGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.24, 0.05));
    const plaqueMesh = new THREE.Mesh(plaqueGeo, opts.plaqueMat);
    plaqueMesh.position.set(0, baseY + opts.colH - 0.04, opts.depth * 0.48);
    group.add(plaqueMesh);
  }

  // 6. Authentic Xieshan (歇山顶) Grey-Tile Roof with Main Ridge, Chiwen Finials & Gable Board
  const roofY = baseY + opts.colH;
  const roofH = Math.min(opts.width, opts.depth) * 0.52;
  const lowerEaveGeo = trackGeo(
    createSweepingEaveGeometry(1.0, roofH * 0.65, 4, Math.PI / 4)
  );
  lowerEaveGeo.scale(opts.width * 0.88, 1, opts.depth * 0.88);
  lowerEaveGeo.translate(0, roofY - 0.02, 0);
  group.add(new THREE.Mesh(lowerEaveGeo, mats.primaryRoof));

  // Upper Gable Roof Prism (歇山顶上半部人字山花与正脊坡面)
  const ridgeSpan = opts.width * 0.62;
  const gableDepth = opts.depth * 0.56;
  const upperRoofShape = new THREE.Shape();
  upperRoofShape.moveTo(-gableDepth / 2, 0);
  upperRoofShape.lineTo(gableDepth / 2, 0);
  upperRoofShape.lineTo(0, roofH * 0.58);
  upperRoofShape.closePath();

  const upperRoofGeo = trackGeo(
    new THREE.ExtrudeGeometry(upperRoofShape, {
      steps: 1,
      depth: ridgeSpan,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    })
  );
  upperRoofGeo.rotateY(Math.PI / 2);
  upperRoofGeo.translate(-ridgeSpan / 2, roofY + roofH * 0.35, 0);
  group.add(new THREE.Mesh(upperRoofGeo, mats.primaryRoof));

  // Red triangular Gable Board (山花板, clearly visible on the East Pavilion in the photo!)
  const gableBoardGeo = trackGeo(
    new THREE.ExtrudeGeometry(upperRoofShape, {
      steps: 1,
      depth: ridgeSpan * 1.02,
      bevelEnabled: false,
    })
  );
  gableBoardGeo.scale(0.82, 0.82, 1);
  gableBoardGeo.rotateY(Math.PI / 2);
  gableBoardGeo.translate(-ridgeSpan * 0.51, roofY + roofH * 0.36, 0);
  group.add(new THREE.Mesh(gableBoardGeo, mats.secondaryTimber));

  // Main Roof Ridge (正脊) & Twin Chiwen Dragon Ridge Finials (正吻兽)
  const ridgeBarGeo = trackGeo(new THREE.BoxGeometry(ridgeSpan * 1.06, 0.1, 0.09));
  ridgeBarGeo.translate(0, roofY + roofH * 0.93, 0);
  group.add(new THREE.Mesh(ridgeBarGeo, mats.primaryRoof));

  [-ridgeSpan * 0.52, ridgeSpan * 0.52].forEach((rx) => {
    const chiwenGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.22, 0.12));
    chiwenGeo.translate(rx, roofY + roofH * 1.0, 0);
    group.add(new THREE.Mesh(chiwenGeo, mats.primaryRoof));
  });

  return group;
}

/**
 * Helper: Build a Classical Pavilion or Multi-Tier Hall for Daming Lake / Qianfo / Lingyan
 */
function createClassicalHallGroup(
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  mats: MaterialBundle,
  options: {
    width: number;
    depth: number;
    plinthH: number;
    colH: number;
    tiers: number;
    sides?: number;
  }
): THREE.Group {
  const group = new THREE.Group();
  const sides = options.sides || 4;
  const radius = Math.max(options.width, options.depth) * 0.65;

  const plinthGeo = trackGeo(
    sides === 4
      ? new THREE.BoxGeometry(options.width * 1.15, options.plinthH, options.depth * 1.15)
      : new THREE.CylinderGeometry(radius * 1.08, radius * 1.16, options.plinthH, sides)
  );
  plinthGeo.translate(0, options.plinthH / 2, 0);
  group.add(new THREE.Mesh(plinthGeo, mats.stonePlinth));

  let currentY = options.plinthH;

  for (let t = 0; t < options.tiers; t++) {
    const scale = Math.pow(0.78, t);
    const tierW = options.width * scale;
    const tierD = options.depth * scale;
    const tierH = options.colH * Math.pow(0.82, t);
    const tierR = radius * scale;

    const coreGeo = trackGeo(
      sides === 4
        ? new THREE.BoxGeometry(tierW * 0.78, tierH, tierD * 0.78)
        : new THREE.CylinderGeometry(tierR * 0.72, tierR * 0.75, tierH, sides)
    );
    coreGeo.translate(0, currentY + tierH / 2, 0);
    group.add(new THREE.Mesh(coreGeo, mats.secondaryTimber));

    const colGeo = trackGeo(new THREE.CylinderGeometry(0.045 * scale, 0.05 * scale, tierH, 12));
    colGeo.translate(0, currentY + tierH / 2, 0);
    const colCount = sides === 4 ? 4 : sides;
    for (let c = 0; c < colCount; c++) {
      const a = (c * Math.PI * 2) / colCount + (sides === 4 ? Math.PI / 4 : 0);
      const col = new THREE.Mesh(colGeo, mats.secondaryTimber);
      const rCol = sides === 4 ? tierR * 0.92 : tierR * 0.88;
      col.position.set(
        Math.cos(a) * rCol * (options.width / Math.max(options.width, options.depth)),
        0,
        Math.sin(a) * rCol * (options.depth / Math.max(options.width, options.depth))
      );
      group.add(col);
    }

    const eaveH = 0.42 * scale;
    const eaveGeo = trackGeo(
      createSweepingEaveGeometry(tierR * 1.28, eaveH, sides, sides === 4 ? Math.PI / 4 : 0)
    );
    if (sides === 4 && Math.abs(options.width - options.depth) > 0.05) {
      eaveGeo.scale(
        options.width / Math.max(options.width, options.depth),
        1,
        options.depth / Math.max(options.width, options.depth)
      );
    }
    eaveGeo.translate(0, currentY + tierH - 0.03, 0);
    group.add(new THREE.Mesh(eaveGeo, mats.primaryRoof));

    currentY += tierH + eaveH * 0.68;
  }

  const finialGeo = trackGeo(new THREE.ConeGeometry(0.09, 0.32, 12));
  finialGeo.translate(0, currentY + 0.14, 0);
  group.add(new THREE.Mesh(finialGeo, mats.gildedAccent));

  return group;
}

function createArchedBridgeGroup(
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  mats: MaterialBundle,
  span: number,
  archHeight: number,
  width: number
): THREE.Group {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  const r = (span * span) / (8 * archHeight) + archHeight / 2;
  const cy = archHeight - r;
  const halfAngle = Math.asin(Math.min(0.98, span / (2 * r)));

  shape.absarc(0, cy, r + 0.14, Math.PI / 2 - halfAngle, Math.PI / 2 + halfAngle, false);
  shape.absarc(0, cy, r, Math.PI / 2 + halfAngle, Math.PI / 2 - halfAngle, true);
  shape.closePath();

  const bridgeGeo = trackGeo(
    new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: width,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 2,
    })
  );
  bridgeGeo.translate(0, 0, -width / 2);
  group.add(new THREE.Mesh(bridgeGeo, mats.stonePlinth));

  const postGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.22, 0.05));
  for (let i = -3; i <= 3; i++) {
    const px = (i / 3.5) * (span * 0.45);
    const py = cy + Math.sqrt(Math.max(0.01, (r + 0.14) * (r + 0.14) - px * px)) + 0.06;
    [-width * 0.44, width * 0.44].forEach((pz) => {
      const post = new THREE.Mesh(postGeo, mats.stonePlinth);
      post.position.set(px, py, pz);
      group.add(post);
    });
  }

  return group;
}

function registerLandmark(
  parts: AnimatedSubAssembly[],
  rootGroup: THREE.Group,
  object: THREE.Object3D,
  basePos: THREE.Vector3,
  explodeVec: THREE.Vector3,
  spec: InspectablePartSpec,
  anim?: {
    spinAxis?: 'x' | 'y' | 'z';
    spinSpeed?: number;
    bobAmp?: number;
    bobFreq?: number;
  }
) {
  object.position.copy(basePos);
  object.userData.partSpec = spec;
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      m.castShadow = true;
      m.receiveShadow = true;
      m.layers.enable(1);
      m.userData.partSpec = spec;
    }
  });
  rootGroup.add(object);
  parts.push({
    object,
    basePos: basePos.clone(),
    explodeVec: explodeVec.clone(),
    partSpec: spec,
    ...anim,
  });
}

export function buildCreationScene(
  preset: ScenePresetId,
  mats: MaterialBundle
): BuiltCreationScene {
  const rootGroup = new THREE.Group();
  const parts: AnimatedSubAssembly[] = [];
  const instancedMeshes: THREE.InstancedMesh[] = [];
  const geometriesToDispose: THREE.BufferGeometry[] = [];
  let koiMesh: THREE.InstancedMesh | undefined;
  let koiData: KoiInstanceData[] | undefined;

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometriesToDispose.push(g);
    return g;
  };

  // Base Landform Terrain / Flagstone Square
  const terrainGeo = trackGeo(new THREE.CylinderGeometry(6.8, 7.1, 0.45, 72, 20));
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    if (vy > 0) {
      posAttr.setY(i, groundHeightAt(preset, vx, vz));
    } else {
      posAttr.setY(i, 0);
    }
  }
  terrainGeo.computeVertexNormals();
  const terrainMesh = new THREE.Mesh(terrainGeo, mats.stoneTerrain);
  terrainMesh.receiveShadow = true;
  rootGroup.add(terrainMesh);

  if (preset === 'baotu') {
    // =========================================================================
    // 1. 趵突泉 · 1:1 实景照片级 Blender 3D 复刻 (10 Landmarks + Animated Koi)
    // =========================================================================

    // Landmark 1: 三股水翻涌白浪、水雾与翡翠主泉池 (Three Gushing Springs, Mist & Pool)
    const springPoolGroup = new THREE.Group();
    const poolW = 4.6;
    const poolD = 3.8;
    const poolWaterGeo = trackGeo(new THREE.BoxGeometry(poolW, 0.08, poolD));
    poolWaterGeo.translate(0, 0.04, 0);
    const poolWater = new THREE.Mesh(poolWaterGeo, mats.springBasinPlate);
    springPoolGroup.add(poolWater);

    // Sunken Grey Stone Pool Coping Walls (青石池壁与西侧吐水口)
    const copingH = 0.24;
    const copingN = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(poolW + 0.2, copingH, 0.16)),
      mats.stoneTerrain
    );
    copingN.position.set(0, copingH / 2, -poolD / 2);
    const copingS = copingN.clone();
    copingS.position.set(0, copingH / 2, poolD / 2);
    const copingW = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.16, copingH, poolD + 0.2)),
      mats.stoneTerrain
    );
    copingW.position.set(-poolW / 2, copingH / 2, 0);
    const copingE = copingW.clone();
    copingE.position.set(poolW / 2, copingH / 2, 0);
    springPoolGroup.add(copingN, copingS, copingW, copingE);

    // Western Stone Wall Waterfall Spout (照片左侧池壁石隙出水口白沫)
    const spoutFoamGeo = trackGeo(new THREE.ConeGeometry(0.18, 0.28, 12));
    spoutFoamGeo.translate(-poolW / 2 + 0.14, 0.14, -0.35);
    springPoolGroup.add(new THREE.Mesh(spoutFoamGeo, mats.whiteFoam));

    // Exact Triangular Formation of the Three Gushing Springs (三股水雪白水花与水雾)
    const threeSpringsCoords: [number, number, number][] = [
      [-0.18, 0.42, 1.15], // Foreground main spring head
      [-0.28, -0.34, 0.92], // Rear-left spring head
      [0.52, -0.22, 0.98], // Rear-right spring head
    ];

    threeSpringsCoords.forEach(([sx, sz, scale]) => {
      // Multi-tiered boiling white water foam mound
      const moundCoreGeo = trackGeo(new THREE.SphereGeometry(0.34 * scale, 24, 18));
      moundCoreGeo.scale(1.25, 0.72, 1.25);
      moundCoreGeo.translate(sx, 0.12, sz);
      springPoolGroup.add(new THREE.Mesh(moundCoreGeo, mats.whiteFoam));

      const moundCrownGeo = trackGeo(new THREE.DodecahedronGeometry(0.24 * scale, 2));
      moundCrownGeo.scale(1.15, 0.95, 1.15);
      moundCrownGeo.translate(sx, 0.24, sz);
      springPoolGroup.add(new THREE.Mesh(moundCrownGeo, mats.whiteFoam));

      // Concentric churning white foam skirts
      const skirtGeo = trackGeo(new THREE.RingGeometry(0.28 * scale, 0.58 * scale, 32));
      skirtGeo.rotateX(-Math.PI / 2);
      skirtGeo.translate(sx, 0.09, sz);
      springPoolGroup.add(new THREE.Mesh(skirtGeo, mats.whiteFoam));

      // Rising white mist / vapor column ("云雾润蒸" as seen in the photo)
      const mistGeo = trackGeo(new THREE.CylinderGeometry(0.42 * scale, 0.22 * scale, 1.15, 16, 1, true));
      mistGeo.translate(sx, 0.65, sz);
      springPoolGroup.add(new THREE.Mesh(mistGeo, mats.mistVolume));
    });

    registerLandmark(
      parts,
      rootGroup,
      springPoolGroup,
      new THREE.Vector3(0, 0.16, 0.2),
      new THREE.Vector3(0, 0.25, 0),
      {
        id: 'baotu-three-springs',
        nameZh: '01. 三股水翻涌白浪与翡翠泉池',
        nameEn: 'Three Gushing Springs, Boiling Foam & Mist',
        role: '山水名胜 (Scenic Feature)',
        eraSpec: '实景 1:1 三角分布 · 云雾润蒸水气与西壁出水口',
        focusCameraPos: [-1.4, 1.75, 3.3],
        focusTargetPos: [0, 0.35, 0.2],
        aspects: {
          architecture:
            '严格按照实景照片复刻：泉池内三股水呈“品”字形三角分布，前景主泉眼水花最为高耸壮观，雪白泡沫层层叠叠向外扩散，泉心上方升腾起缕缕白雾，西侧池壁下方亦复刻了石隙跌水白沫。',
          history:
            '古称“泺”，《春秋》鲁桓公十八年（前694年）即有记载。北宋曾巩定名“趵突泉”，清乾隆皇帝南巡封为“天下第一泉”。',
          poetry:
            '元·赵孟頫《趵突泉》：“泺水发源天下无，平地涌出白玉壶。谷虚久恐元气泄，岁旱不愁东海枯。云雾润蒸华不注，波涛声震大明湖。”',
          guide:
            '在“实景照片机位”下可观赏三股雪白水花在翡翠色池水中实时翻滚律动，并伴有水气蒸腾效果。',
        },
        metrics: [
          { label: '泉眼布局', value: '品字形三股水涌轮' },
          { label: '常年水温', value: '18.0 ℃ 恒温润蒸' },
          { label: '水色特征', value: '翡翠碧透 · 白浪如雪' },
        ],
      },
      { bobAmp: 0.025, bobFreq: 4.5 }
    );

    // Landmark 2: 汉白玉透雕望柱石栏 (Carved White Marble Balustrade Ring around Pool)
    const balustradeGroup = new THREE.Group();
    const bW = 2.34;
    const bD = 1.94;
    const postH = 0.44;
    const postGeo = trackGeo(new THREE.BoxGeometry(0.085, postH, 0.085));
    postGeo.translate(0, postH / 2, 0);
    const finialCapGeo = trackGeo(new THREE.SphereGeometry(0.055, 10, 10));
    finialCapGeo.translate(0, postH + 0.04, 0);

    // Build posts & pierced rail panels around all 4 sides
    const addBalustradeRun = (
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      segments: number
    ) => {
      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        const px = THREE.MathUtils.lerp(x1, x2, t);
        const pz = THREE.MathUtils.lerp(z1, z2, t);
        const post = new THREE.Mesh(postGeo, mats.stonePlinth);
        post.position.set(px, 0, pz);
        const cap = new THREE.Mesh(finialCapGeo, mats.stonePlinth);
        cap.position.set(px, 0, pz);
        balustradeGroup.add(post, cap);

        if (s < segments) {
          const nx = THREE.MathUtils.lerp(x1, x2, (s + 0.5) / segments);
          const nz = THREE.MathUtils.lerp(z1, z2, (s + 0.5) / segments);
          const segLen = Math.hypot(x2 - x1, z2 - z1) / segments;
          const isHoriz = Math.abs(x2 - x1) > Math.abs(z2 - z1);

          // Top handrail (寻杖) & pierced middle slab (透雕栏板)
          const topBar = new THREE.Mesh(
            trackGeo(
              new THREE.BoxGeometry(
                isHoriz ? segLen : 0.055,
                0.05,
                isHoriz ? 0.055 : segLen
              )
            ),
            mats.stonePlinth
          );
          topBar.position.set(nx, postH - 0.05, nz);

          const midPanel = new THREE.Mesh(
            trackGeo(
              new THREE.BoxGeometry(
                isHoriz ? segLen * 0.86 : 0.035,
                0.22,
                isHoriz ? 0.035 : segLen * 0.86
              )
            ),
            mats.stonePlinth
          );
          midPanel.position.set(nx, postH * 0.45, nz);
          balustradeGroup.add(topBar, midPanel);
        }
      }
    };

    addBalustradeRun(-bW, bD, bW, bD, 14); // South foreground balustrade
    addBalustradeRun(-bW, -bD, bW, -bD, 14); // North balustrade
    addBalustradeRun(-bW, -bD, -bW, bD, 12); // West balustrade
    addBalustradeRun(bW, -bD, bW, bD, 12); // East balustrade

    registerLandmark(
      parts,
      rootGroup,
      balustradeGroup,
      new THREE.Vector3(0, 0.36, 0.2),
      new THREE.Vector3(0, 0.65, 0),
      {
        id: 'baotu-marble-balustrade',
        nameZh: '02. 环池雕花汉白玉望柱石栏',
        nameEn: 'Carved White Marble Pool Balustrades',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '52根云头莲花望柱 · 透雕海棠纹栏板',
        focusCameraPos: [-2.1, 1.5, 4.3],
        focusTargetPos: [-1.2, 0.55, 1.8],
        aspects: {
          architecture:
            '复刻实景照片前景与四周的汉白玉石栏：由云头望柱、寻杖扶手、透雕海棠开光栏板与抱鼓石地栿组成，质感温润洁白，与池内碧水红鱼形成鲜明映衬。',
          history:
            '明清以来多次修葺加固，石栏围合出长30米、宽18米的规整长方形泉池，既护卫名泉又供游人凭栏俯视。',
          poetry:
            '清人词云：“白玉栏杆围碧水，红鱼队队戏清波。”',
          guide:
            '西南转角望柱（即实景照片机位处）是纵览整个趵突泉池、泺源堂与东侧敞轩亭的黄金视角。',
        },
        metrics: [
          { label: '望柱数量', value: '52 根云纹莲花柱头' },
          { label: '石材工艺', value: '房山/莱州汉白玉透雕' },
          { label: '围合周长', value: '约 96 米环池步道' },
        ],
      }
    );

    // Landmark 3: 泺源堂 · 五开间歇山顶正殿与三出陛石阶 (Luoyuan Hall on North Side)
    const luoyuanGroup = createXieshanArchitectureGroup(trackGeo, mats, {
      width: 3.15,
      depth: 1.55,
      plinthH: 0.42,
      colH: 1.02,
      colsX: 6, // 5 bays (五开间)
      colsZ: 3,
      plaqueMat: mats.luoyuanPlaqueMat,
      hasThreeFlightStairs: true,
    });

    registerLandmark(
      parts,
      rootGroup,
      luoyuanGroup,
      new THREE.Vector3(0.05, 0.36, -2.85),
      new THREE.Vector3(0, 1.55, -1.5),
      {
        id: 'baotu-luoyuan-hall',
        nameZh: '03. 泺源堂 · 五开间歇山顶正殿',
        nameEn: 'Luoyuan Hall & Three-Flight Marble Stairs',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '北宋曾巩始建 · 悬黑底金字“泺源堂”匾额',
        focusCameraPos: [-0.4, 2.2, 1.2],
        focusTargetPos: [0.05, 1.25, -2.85],
        aspects: {
          architecture:
            '1:1 还原照片正后方的主体大殿：五开间单檐歇山顶，青灰筒瓦屋面配两端高耸正吻，檐下施青绿旋子彩绘额枋，正中悬黑底金字“泺源堂”巨匾，殿前设三出陛汉白玉丹墀石阶直抵泉池北岸。',
          history:
            '宋代曾巩任齐州知州时建“泺源堂”，取趵突泉为古泺水之源。堂后依次递进为娥英祠与三圣殿。',
          poetry:
            '楹联镌刻元代赵孟頫千古名句：“云雾润蒸华不注，波涛声震大明湖。”',
          guide:
            '点击此殿可近距离观赏“泺源堂”金字匾额、青绿彩绘额枋、朱红隔扇门及殿前三出陛汉白玉石栏。',
        },
        metrics: [
          { label: '面阔规制', value: '五开间单檐歇山顶' },
          { label: '台基形制', value: '三出陛汉白玉丹墀' },
          { label: '核心匾额', value: '黑底描金“泺源堂”' },
        ],
      }
    );

    // Landmark 4: 东岸敞轩水榭亭 · 朱柱美人靠与黄轴楹联 (East Waterside Open Pavilion)
    const eastPavilionGroup = createXieshanArchitectureGroup(trackGeo, mats, {
      width: 1.55,
      depth: 2.05,
      plinthH: 0.26,
      colH: 0.88,
      colsX: 3,
      colsZ: 4,
      isOpenPavilion: true,
      hasBeautyRail: true,
      hasYellowScrolls: true,
      plaqueMat: mats.pavilionPlaqueMat,
    });
    // Rotate so the gable front & plaque face West toward the spring pool just like in the photo!
    eastPavilionGroup.rotation.y = -Math.PI / 2;

    registerLandmark(
      parts,
      rootGroup,
      eastPavilionGroup,
      new THREE.Vector3(2.95, 0.36, -0.35),
      new THREE.Vector3(1.6, 1.1, 0),
      {
        id: 'baotu-wanghe-pavilion',
        nameZh: '04. 东岸敞轩水榭亭 (朱柱美人靠)',
        nameEn: 'East Waterside Open Xieshan Pavilion',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '照片右侧核心敞亭 · 歇山山花、黄轴楹联与美人靠',
        focusCameraPos: [-0.6, 1.85, 2.2],
        focusTargetPos: [2.6, 1.1, -0.35],
        aspects: {
          architecture:
            '精准复刻实景照片右侧临水敞亭：歇山顶青灰瓦面露出朱红三角形山花板，八根朱红圆柱通透敞朗，柱间悬挂明黄色竖幅书法楹联，四周设朱漆“美人靠”坐槛。',
          history:
            '此亭紧依趵突泉东岸石栏，与北侧泺源堂成曲尺形围合，是历代文人雅士临泉听涛、品茗赋诗之所。',
          poetry:
            '柱间楹联云：“三尺不消平地雪，四时尝吼半空雷。”',
          guide:
            '亭内四面通透，坐于美人靠上可平视三股水翻涌，向东南侧望去可见来鹤桥与白石牌坊。',
        },
        metrics: [
          { label: '屋顶特征', value: '歇山顶露朱红山花板' },
          { label: '柱廊装饰', value: '明黄竖轴楹联 · 美人靠' },
          { label: '方位坐落', value: '主泉池东岸临水平台' },
        ],
      }
    );

    // Landmark 5: 西岸厢房大殿与抄手游廊 (West Wing Hall & Connecting Corridor on Left of Photo)
    const westComplexGroup = new THREE.Group();
    const mainWestHall = createXieshanArchitectureGroup(trackGeo, mats, {
      width: 2.1,
      depth: 1.35,
      plinthH: 0.32,
      colH: 0.86,
      colsX: 4,
      colsZ: 2,
    });
    mainWestHall.rotation.y = Math.PI / 2;
    mainWestHall.position.set(-0.35, 0, 0.45);

    const northWingPav = createXieshanArchitectureGroup(trackGeo, mats, {
      width: 1.35,
      depth: 1.1,
      plinthH: 0.26,
      colH: 0.76,
      colsX: 3,
      colsZ: 2,
    });
    northWingPav.position.set(0.45, 0, -1.25);

    // White-walled connecting gallery corridor (白墙黛瓦连廊)
    const corridorWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.85, 0.65, 0.95)),
      mats.whiteWall
    );
    corridorWall.position.set(-0.1, 0.325, -0.65);
    westComplexGroup.add(mainWestHall, northWingPav, corridorWall);

    registerLandmark(
      parts,
      rootGroup,
      westComplexGroup,
      new THREE.Vector3(-3.95, 0.36, -0.85),
      new THREE.Vector3(-1.8, 1.1, -0.5),
      {
        id: 'baotu-guanlan-pavilion',
        nameZh: '05. 西岸观澜院落与白墙碑廊',
        nameEn: 'West Courtyard Hall, Gallery & Flagstone Square',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '照片左侧古建群 · 歇山厢殿、白墙游廊与宽阔石坪',
        focusCameraPos: [0.5, 2.1, 3.2],
        focusTargetPos: [-3.8, 1.0, -0.85],
        aspects: {
          architecture:
            '复刻实景照片左侧建筑群：前设宽敞平整的青石板广场，主殿采用单檐歇山卷棚与青绿彩绘，北接白墙黛瓦游廊与配殿，殿前设多层条石台阶与护栏。',
          history:
            '西岸自明代起建有观澜亭与历代名泉碑廊，嵌有明清两代咏泉诗碣数十方，文化底蕴深厚。',
          poetry:
            '明代胡缵宗书“第一泉”及“观澜”石刻皆汇聚于西岸胜境。',
          guide:
            '西侧宽阔的青石板广场是游人驻足凭栏、合影留念的主要集散空间。',
        },
        metrics: [
          { label: '院落组合', value: '西厢正殿 + 白墙抄手廊' },
          { label: '地面铺装', value: '鲁灰青石板错缝铺装' },
          { label: '景观过渡', value: '大垂柳掩映东西两院' },
        ],
      }
    );

    // Landmark 6: 西北隅百年垂柳与太湖石花坛 (Towering Weeping Willow & Scholar Rock Garden)
    const willowGardenGroup = new THREE.Group();
    // Multi-stemmed ancient willow trunk
    const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.28, 1.85, 12));
    trunkGeo.translate(0, 0.925, 0);
    willowGardenGroup.add(new THREE.Mesh(trunkGeo, mats.secondaryTimber));

    // Lush golden-green cascading willow canopy & hanging frond curtains (垂柳万缕丝绦)
    const canopyPositions: [number, number, number, number][] = [
      [0, 2.35, 0, 1.15],
      [-0.55, 2.05, 0.35, 0.88],
      [0.58, 2.1, 0.28, 0.92],
      [0.15, 1.95, -0.45, 0.85],
      [-0.35, 1.75, -0.35, 0.78],
    ];
    canopyPositions.forEach(([cx, cy, cz, cr]) => {
      const domeGeo = trackGeo(new THREE.SphereGeometry(cr, 16, 14));
      domeGeo.scale(0.95, 1.35, 0.95);
      domeGeo.translate(cx, cy, cz);
      willowGardenGroup.add(new THREE.Mesh(domeGeo, mats.willowStrandMat));
    });

    // Hanging curtain strands around the canopy perimeter
    for (let s = 0; s < 24; s++) {
      const a = (s * Math.PI * 2) / 24;
      const r = 0.65 + (s % 3) * 0.22;
      const strandH = 1.35 + (s % 4) * 0.25;
      const strandGeo = trackGeo(new THREE.CylinderGeometry(0.03, 0.08, strandH, 6));
      strandGeo.translate(Math.cos(a) * r, 1.65 - strandH * 0.3, Math.sin(a) * r);
      willowGardenGroup.add(new THREE.Mesh(strandGeo, mats.willowStrandMat));
    }

    // Trimmed dark-green shrub mounds & scholar rocks at the base
    for (let b = 0; b < 5; b++) {
      const bushGeo = trackGeo(new THREE.DodecahedronGeometry(0.38, 1));
      bushGeo.scale(1.2, 0.75, 1.1);
      bushGeo.translate((b - 2) * 0.55, 0.25, 0.65 + (b % 2) * 0.25);
      willowGardenGroup.add(new THREE.Mesh(bushGeo, mats.willowStrandMat));
    }

    registerLandmark(
      parts,
      rootGroup,
      willowGardenGroup,
      new THREE.Vector3(-2.15, 0.36, -2.25),
      new THREE.Vector3(-1.2, 1.6, -1.2),
      {
        id: 'baotu-weeping-willows',
        nameZh: '06. 临池百年垂柳与假山花木',
        nameEn: 'Ancient Weeping Willows & Scholar Rock Shrubs',
        role: '山水名胜 (Scenic Feature)',
        eraSpec: '照片左后方视觉焦点 · 万条垂下绿丝绦',
        focusCameraPos: [-0.8, 2.2, 1.8],
        focusTargetPos: [-2.15, 1.6, -2.25],
        aspects: {
          architecture:
            '复刻照片西北角（西殿与泺源堂之间）那株高大繁茂的垂柳与池角灌木假山：采用多层椭球树冠与24束下垂柳丝模型构建，在暖阳下呈现明快的黄绿层次感。',
          history:
            '垂柳与泉水并称济南两大灵物，自古便有“家家泉水，户户垂杨”之誉，趵突泉畔垂柳随风摇曳，倒映碧池。',
          poetry:
            '清·刘凤诰：“四面荷花三面柳，一城山色半城湖。”',
          guide:
            '除西北角主柳外，主泉池东北角与东南角亦配有太湖石假山、铁树与常绿灌木丛。',
        },
        metrics: [
          { label: '树冠高度', value: '约 12 米高大垂柳' },
          { label: '色彩还原', value: '暖阳嫩黄绿与深翠叠层' },
          { label: '园林作用', value: '柔化古建天际线轮廓' },
        ],
      }
    );

    // Landmark 7: 东岸来鹤桥与白石雕花牌坊 (Laihe Bridge & White Stone Archway on Far Right of Photo)
    const eastBackgroundGroup = new THREE.Group();
    const laiheBridge = createArchedBridgeGroup(trackGeo, mats, 1.85, 0.38, 0.68);
    laiheBridge.rotation.y = Math.PI / 6;
    eastBackgroundGroup.add(laiheBridge);

    // Carved White Stone Ornamental Archway (照片最右侧背景中的白石雕花圆券牌坊)
    const paiFangGroup = new THREE.Group();
    const pfPillarL = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.18, 1.35, 0.18)),
      mats.stonePlinth
    );
    pfPillarL.position.set(-0.55, 0.675, 0);
    const pfPillarR = pfPillarL.clone();
    pfPillarR.position.set(0.55, 0.675, 0);
    const pfBeam = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.45, 0.28, 0.22)),
      mats.stonePlinth
    );
    pfBeam.position.set(0, 1.22, 0);
    const pfArchRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.38, 0.08, 12, 24, Math.PI)),
      mats.stonePlinth
    );
    pfArchRing.position.set(0, 0.72, 0);
    paiFangGroup.add(pfPillarL, pfPillarR, pfBeam, pfArchRing);
    paiFangGroup.position.set(1.35, 0.0, -0.85);
    paiFangGroup.rotation.y = -Math.PI / 5;
    eastBackgroundGroup.add(paiFangGroup);

    registerLandmark(
      parts,
      rootGroup,
      eastBackgroundGroup,
      new THREE.Vector3(4.25, 0.28, -0.85),
      new THREE.Vector3(2.2, 0.85, -0.5),
      {
        id: 'baotu-laihe-bridge',
        nameZh: '07. 来鹤桥与白石雕花牌坊 (东景)',
        nameEn: 'Laihe Marble Bridge & Carved Stone Archway',
        role: '人文古迹 (Cultural Relic)',
        eraSpec: '照片右侧远景复刻 · 单孔石拱桥与圆券石坊',
        focusCameraPos: [2.2, 1.85, 2.2],
        focusTargetPos: [4.25, 0.75, -0.85],
        aspects: {
          architecture:
            '复刻实景照片右侧中远景：穿过东岸敞轩亭柱间，可见一座洁白圆润的汉白玉单孔拱桥（来鹤桥）横跨水湾，其后方矗立着精雕细琢的白石圆券牌坊。',
          history:
            '来鹤桥始建于明万历年间，与东岸望鹤亭成对景；桥下泉水自池东流出，汇入济南护城河。',
          poetry:
            '古诗赞曰：“石梁飞跨碧波东，白玉牌坊映晴空。”',
          guide:
            '从西南照片机位向东侧远眺，敞亭、石桥、白石牌坊形成极具纵深感的三重空间序列。',
        },
        metrics: [
          { label: '空间层次', value: '敞亭 → 石拱桥 → 白石坊' },
          { label: '桥体材质', value: '汉白玉栏板单孔拱桥' },
          { label: '牌坊形制', value: '中西合璧圆券石雕坊' },
        ],
      }
    );

    // Landmark 8: 泉池锦鲤群 · 85尾动态游弋红黄锦鲤 (85 Animated Swimming Koi Fish)
    const koiProxyGroup = new THREE.Group();
    // Invisible clickable proxy ring in the southeast corner where koi gather
    const koiProxyGeo = trackGeo(new THREE.CylinderGeometry(1.1, 1.1, 0.15, 16));
    const koiProxyMat = new THREE.MeshBasicMaterial({
      visible: false,
    });
    const koiProxyMesh = new THREE.Mesh(koiProxyGeo, koiProxyMat);
    koiProxyGroup.add(koiProxyMesh);

    registerLandmark(
      parts,
      rootGroup,
      koiProxyGroup,
      new THREE.Vector3(0.85, 0.22, 1.25),
      new THREE.Vector3(0, 0.4, 0.6),
      {
        id: 'baotu-koi-school',
        nameZh: '08. 泉池锦鲤群 · 八十五尾红鲤戏水',
        nameEn: 'School of 85 Swimming Red & Gold Koi',
        role: '山水名胜 (Scenic Feature)',
        eraSpec: '照片前景池内看点 · 红、橙、金、白四色锦鲤实时游弋',
        focusCameraPos: [0.4, 1.65, 3.6],
        focusTargetPos: [0.65, 0.2, 1.15],
        aspects: {
          architecture:
            '采用 InstancedMesh 与实时正弦摆尾运动算法，在清澈见底的东南池畔与南栏下还原了 85 尾体态丰腴的朱红、金黄、橙白锦鲤，随水流自在穿梭。',
          history:
            '趵突泉恒温18℃的活水富含溶解氧，池内锦鲤长年繁衍生息，体态硕大灵动，“趵突观鱼”已成为泉城极具代表性的生态景观。',
          poetry:
            '宋·苏轼句意：“知鱼乐处水如天，锦鳞游泳碧波间。”',
          guide:
            '靠近南岸与东岸汉白玉栏杆俯视，可见成群红鲤围绕三股水涌流欢快游动。',
        },
        metrics: [
          { label: '实时实例', value: '85 尾动态游弋锦鲤' },
          { label: '鱼群配色', value: '朱红 · 鎏金 · 橙白 · 乌鲤' },
          { label: '聚集区域', value: '南岸与东岸浅水石栏旁' },
        ],
      }
    );

    // Create the actual 85 Instanced Koi Fish in the pool!
    const fishGeo = trackGeo(new THREE.ConeGeometry(0.045, 0.24, 8));
    fishGeo.rotateX(Math.PI / 2);
    fishGeo.scale(0.85, 0.55, 1.0);
    koiMesh = new THREE.InstancedMesh(fishGeo, mats.koiInstancedMat, 85);
    koiData = [];
    for (let i = 0; i < 85; i++) {
      // Cluster heavily along the South and East edges just like in the reference photo!
      const isSouthCluster = i < 55;
      const bx = isSouthCluster
        ? -1.6 + ((i * 37) % 340) * 0.01
        : 0.8 + ((i * 23) % 130) * 0.01;
      const bz = isSouthCluster
        ? 0.85 + ((i * 19) % 105) * 0.01
        : -1.1 + ((i * 29) % 260) * 0.01;
      const item: KoiInstanceData = {
        baseX: bx,
        baseZ: bz,
        depthY: 0.2 + (i % 3) * 0.012,
        orbitRadius: 0.14 + (i % 5) * 0.045,
        speed: 0.65 + (i % 6) * 0.18,
        phase: i * 0.75,
        scale: 0.85 + (i % 5) * 0.12,
      };
      koiData.push(item);

      _dummy.position.set(bx, item.depthY, bz);
      _dummy.scale.setScalar(item.scale);
      _dummy.updateMatrix();
      koiMesh.setMatrixAt(i, _dummy.matrix);

      // Authentic Koi colors: 65% crimson/orange-red, 20% golden-yellow, 15% calico white-orange
      if (i % 5 === 0) {
        _color.setHex(0xfacc15); // Golden Koi
      } else if (i % 7 === 0) {
        _color.setHex(0xfff1f2); // White-red Kohaku Koi
      } else {
        _color.setHSL(0.02 + (i % 3) * 0.015, 0.9, 0.52); // Vibrant Crimson/Orange Koi
      }
      koiMesh.setColorAt(i, _color);
    }
    koiMesh.instanceMatrix.needsUpdate = true;
    if (koiMesh.instanceColor) koiMesh.instanceColor.needsUpdate = true;
    koiMesh.computeBoundingSphere();
    rootGroup.add(koiMesh);
    instancedMeshes.push(koiMesh);

    // Landmark 9: 凭栏观泉游人与前景垂柳框景 (Visitors & Foreground Willow Framing)
    const visitorsAndFrameGroup = new THREE.Group();
    const visitorPositions: [number, number, number][] = [
      [-1.85, 2.32, 0xe11d48],
      [-1.55, 2.34, 0x0284c7],
      [1.15, 2.32, 0x3f3f46],
      [1.52, 2.28, 0xe2e8f0],
      [2.15, 1.85, 0x2563eb],
      [2.52, 1.35, 0xdb2777],
      [-2.55, 0.85, 0x1e293b],
      [-2.55, 0.25, 0xd6d3d1],
      [-2.55, -0.55, 0x334155],
      [-1.65, -1.85, 0xdc2626],
      [-0.75, -1.85, 0x2563eb],
      [0.45, -1.85, 0x475569],
    ];
    const bodyGeo = trackGeo(new THREE.CapsuleGeometry(0.055, 0.22, 6, 8));
    bodyGeo.translate(0, 0.18, 0);
    const headGeo = trackGeo(new THREE.SphereGeometry(0.045, 10, 10));
    headGeo.translate(0, 0.36, 0);

    visitorPositions.forEach(([vx, vz, JacketHex]) => {
      const person = new THREE.Group();
      const jMat = new THREE.MeshStandardMaterial({
        color: JacketHex,
        roughness: 0.7,
      });
      person.add(
        new THREE.Mesh(bodyGeo, jMat),
        new THREE.Mesh(headGeo, mats.stonePlinth)
      );
      person.position.set(vx, 0, vz);
      visitorsAndFrameGroup.add(person);
    });

    registerLandmark(
      parts,
      rootGroup,
      visitorsAndFrameGroup,
      new THREE.Vector3(0, 0.36, 0),
      new THREE.Vector3(0, 0.9, 0.8),
      {
        id: 'baotu-visitors',
        nameZh: '09. 环池凭栏观泉游人',
        nameEn: 'Waterside Visitors Admiring the Springs',
        role: '人文古迹 (Cultural Relic)',
        eraSpec: '实景氛围还原 · 凭栏摄影与赏泉游人',
        focusCameraPos: [-2.65, 2.38, 5.25],
        focusTargetPos: [0.35, 0.95, -0.65],
        aspects: {
          architecture:
            '在泉池南岸、西岸、东岸及北岸汉白玉栏杆外侧，按实景照片比例布置了驻足赏泉、举机拍摄的建筑尺度人物模型，赋予三维场景真实的尺度感与烟火气。',
          history:
            '千百年来，无论帝王将相、文人墨客还是寻常百姓，皆慕名来此凭栏观澜，感叹大自然造化之神奇。',
          poetry:
            '清·蒲松龄《趵突泉赋》：“游人如织，凭栏忘归。”',
          guide:
            '点击此项可一键回到与实景照片完全一致的西南角黄金观赏机位。',
        },
        metrics: [
          { label: '人体比例', value: '1:1 真实建筑人体尺度' },
          { label: '分布动线', value: '环池四岸青石步道' },
          { label: '摄影机位', value: '西南角俯视全景机位' },
        ],
      }
    );

    // Landmark 10: 泰山奥陶系岩溶承压水脉层 (Subterranean Karst Aquifer Cutaway)
    const karstGroup = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.58, 3.8),
      new THREE.Vector3(-0.3, -0.45, 2.0),
      new THREE.Vector3(0, -0.35, 0.2),
      new THREE.Vector3(0, 0.1, 0.2),
    ]);
    const conduitGeo = trackGeo(new THREE.TubeGeometry(curve, 48, 0.22, 12, false));
    const strataGeo = trackGeo(new THREE.CylinderGeometry(3.5, 3.9, 0.32, 32));
    strataGeo.translate(0, -0.48, 0);
    karstGroup.add(
      new THREE.Mesh(conduitGeo, mats.waterCrystal),
      new THREE.Mesh(strataGeo, mats.stonePlinth)
    );

    registerLandmark(
      parts,
      rootGroup,
      karstGroup,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -1.65, 0),
      {
        id: 'baotu-karst-aquifer',
        nameZh: '10. 泰山奥陶系岩溶承压水脉层 (地下剖视)',
        nameEn: 'Subterranean Karst Artesian Aquifer Strata',
        role: '山水名胜 (Scenic Feature)',
        eraSpec: '拖动底部“空间分层剖视”滑块即可检视地下构造',
        focusCameraPos: [4.6, 1.2, 5.0],
        focusTargetPos: [0, -0.5, 0],
        aspects: {
          architecture:
            '拖动底部“空间分层剖视”滑块，地面古建与地下岩层将平滑分离，直观展示南部泰山灰岩溶洞潜流受火成岩阻挡、承压喷涌出三股水的地质奇观。',
          history:
            '北宋沈括《梦溪笔谈》及北魏郦道元《水经注》均对济南诸泉“伏流潜通、受阻怒跃”的水文机理做过精辟论述。',
          poetry:
            '王安石诗云：“千里来龙此聚首，万派奔流化玉泉。”',
          guide:
            '将底部拆解度调至 60%–100%，可透视地下承压水脉如何自南向北直贯三股水泉眼。',
        },
        metrics: [
          { label: '含水岩系', value: '寒武-奥陶系碳酸盐岩' },
          { label: '隔水屏障', value: '燕山期侵入辉长岩体' },
          { label: '成泉类型', value: '岩溶裂隙上升承压泉' },
        ],
      }
    );

    // Instanced Perimeter Trees & Background Grove (64 Lush Courtyard Trees matching photo skyline)
    const treeGeo = trackGeo(new THREE.SphereGeometry(0.45, 12, 10));
    treeGeo.scale(1.0, 1.28, 1.0);
    treeGeo.translate(0, 0.55, 0);
    const treeInst = new THREE.InstancedMesh(treeGeo, mats.foliageInstanced, 64);
    treeInst.castShadow = true;
    treeInst.receiveShadow = true;
    for (let i = 0; i < 64; i++) {
      // Concentrate lush trees along the North, West, and East backdrops (leave South foreground camera view open!)
      const angle = -Math.PI * 0.15 + (i / 64) * Math.PI * 1.3;
      const r = 4.65 + (i % 5) * 0.42;
      const x = Math.cos(angle) * r;
      const z = -Math.sin(angle) * r;
      const gy = groundHeightAt('baotu', x, z);
      _dummy.position.set(x, gy, z);
      _dummy.rotation.set(0, angle, 0);
      const s = 0.9 + ((i * 17) % 35) * 0.015;
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();
      treeInst.setMatrixAt(i, _dummy.matrix);

      _color.setHSL(0.28 + (i % 5) * 0.025, 0.52, 0.32 + (i % 4) * 0.05);
      treeInst.setColorAt(i, _color);
    }
    treeInst.instanceMatrix.needsUpdate = true;
    if (treeInst.instanceColor) treeInst.instanceColor.needsUpdate = true;
    treeInst.computeBoundingSphere();
    rootGroup.add(treeInst);
    instancedMeshes.push(treeInst);
  } else if (preset === 'daming') {
    // =========================================================================
    // 2. 大明湖 · 泉城明珠 (Daming Lake & Chaoran Lou — 9 Landmarks)
    // =========================================================================
    const chaoranGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 1.85,
      depth: 1.85,
      plinthH: 0.62,
      colH: 0.62,
      tiers: 4,
      sides: 4,
    });
    registerLandmark(
      parts,
      rootGroup,
      chaoranGroup,
      new THREE.Vector3(3.15, 0.42, 0.0),
      new THREE.Vector3(1.8, 1.85, 0),
      {
        id: 'daming-chaoran-tower',
        nameZh: '01. 超然楼 · 江北第一楼',
        nameEn: 'Chaoran Lou (Transcendence Tower)',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '元代李泂始建 · 宋元博古铜瓦重楼',
        focusCameraPos: [6.4, 3.6, 4.2],
        focusTargetPos: [3.15, 1.9, 0.0],
        aspects: {
          architecture:
            '通高51.7米，上下共分七层，基座采用汉白玉须弥座与多层石雕栏杆，主体为宋元风格重檐十字脊木构与铜瓦、铜柱、铜栏工艺，气势雄伟，号称“江北第一楼”。',
          history:
            '始建于元代至治年间，由翰林学士李泂取苏轼“超然物外”之意建造。历代名士在此登高雅集。',
          poetry:
            '明·杨衍嗣《登超然楼》：“近水亭台草木欣，朱楼百尺回人群。窗前帆影摇空翠，槛外荷香入暮云。”',
          guide:
            '每当暮色降临，超然楼华灯齐明，金碧辉煌的楼影倒映在大明湖波心，是泉城最具人气的视觉地标。',
        },
        metrics: [
          { label: '楼体总高', value: '51.7 米（七层）' },
          { label: '建筑工艺', value: '铜瓦铜栏宋式楼阁' },
          { label: '文化盛誉', value: '江北第一木构名楼' },
        ],
      }
    );

    const lixiaGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 1.45,
      depth: 1.45,
      plinthH: 0.32,
      colH: 0.78,
      tiers: 2,
      sides: 8,
    });
    registerLandmark(
      parts,
      rootGroup,
      lixiaGroup,
      new THREE.Vector3(0, 0.38, 0),
      new THREE.Vector3(0, 1.45, 0),
      {
        id: 'daming-lixia-pavilion',
        nameZh: '02. 历下亭 · 海右此亭古',
        nameEn: 'Lixia Pavilion on Central Lake Island',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '北魏至唐代名胜 · 杜甫李邕宴饮赋诗处',
        focusCameraPos: [0.4, 2.5, 3.8],
        focusTargetPos: [0, 1.1, 0],
        aspects: {
          architecture:
            '坐落于大明湖中心最大的湖心岛上，八角重檐攒尖顶，红柱青瓦，四面环水，绿柳掩映。',
          history:
            '唐天宝四载（745年），北海太守李邕在历下亭设宴款待诗圣杜甫及济南名士，杜甫即席赋诗使此亭名扬天下。',
          poetry:
            '唐·杜甫《陪李北海宴历下亭》：“海右此亭古，济南名士多。云山已发兴，玉佩仍当歌。”',
          guide:
            '登岛可赏乾隆御碑、名士轩与蔚蓝天光水色，体会“四面荷花三面柳，一城山色半城湖”的意境。',
        },
        metrics: [
          { label: '建筑形制', value: '八角重檐琉璃攒尖亭' },
          { label: '千古名联', value: '海右此亭古，济南名士多' },
          { label: '地理位置', value: '大明湖湖心岛正中' },
        ],
      }
    );

    const lakePlateGeo = trackGeo(new THREE.CylinderGeometry(4.2, 4.2, 0.06, 64));
    const lakePlate = new THREE.Mesh(lakePlateGeo, mats.springBasinPlate);
    registerLandmark(
      parts,
      rootGroup,
      lakePlate,
      new THREE.Vector3(0, 0.19, 0),
      new THREE.Vector3(0, -0.75, 0),
      {
        id: 'daming-lotus-basin',
        nameZh: '03. 明湖烟波与百顷红荷',
        nameEn: 'Daming Spring-Fed Lake & Lotus Expanse',
        role: '山水名胜 (Scenic Feature)',
        eraSpec: '珍珠泉、趵突泉、五龙潭众泉汇流而成',
        focusCameraPos: [0, 5.2, 6.8],
        focusTargetPos: [0, 0.25, 0],
        aspects: {
          architecture:
            '大明湖是由城内诸泉水汇流而成的天然湖泊，水面面积达58公顷，具有“恒雨不涨，久旱不涸”的奇特性质。',
          history:
            '北魏郦道元《水经注》称“历水陂”，金代元好问《济南行记》始称“大明湖”。',
          poetry:
            '清·铁保撰、刘凤诰书名联：“四面荷花三面柳，一城山色半城湖。”',
          guide:
            '盛夏时节湖上十余处荷田红荷竞放，乘船穿行荷柳之间，南望千佛山倒影入湖。',
        },
        metrics: [
          { label: '水域面积', value: '约 58 公顷' },
          { label: '水文特征', value: '众泉汇流 · 久旱不涸' },
          { label: '代表花卉', value: '明湖红莲（济南市花）' },
        ],
      }
    );

    const bridgeGroup = createArchedBridgeGroup(trackGeo, mats, 2.45, 0.42, 0.62);
    registerLandmark(
      parts,
      rootGroup,
      bridgeGroup,
      new THREE.Vector3(-1.85, 0.22, 1.45),
      new THREE.Vector3(-1.3, 0.65, 1.1),
      {
        id: 'daming-jiuqu-bridge',
        nameZh: '04. 翠柳长堤与湖上曲桥',
        nameEn: 'Willow Dike & Arched Lotus Bridge',
        role: '山水名胜 (Scenic Feature)',
        eraSpec: '连通南岸柳堤与翠柳屏岛',
        focusCameraPos: [-4.6, 2.2, 4.4],
        focusTargetPos: [-1.85, 0.5, 1.45],
        aspects: {
          architecture:
            '汉白玉石栏拱桥横跨碧波之上，与六岛相连，桥拱圆润如新月，水中倒影合成满月。',
          history:
            '明清以来大明湖形成“长堤柳浪”胜景，岸边垂柳万株，柳丝轻拂水面与石桥栏杆。',
          poetry: '元好问词云：“看山水底山更佳，一堆苍烟收不起。”',
          guide: '漫步石桥之上，近观桥下荷叶田田、锦鲤游弋，远眺超然楼与历下亭。',
        },
        metrics: [
          { label: '造园手法', value: '长堤联岛 · 步移景异' },
          { label: '通航净空', value: '可容双层画舫穿行' },
          { label: '沿岸植被', value: '三面垂柳四面荷' },
        ],
      }
    );

    const tiegongGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 1.75,
      depth: 1.25,
      plinthH: 0.3,
      colH: 0.78,
      tiers: 1,
      sides: 4,
    });
    registerLandmark(
      parts,
      rootGroup,
      tiegongGroup,
      new THREE.Vector3(-2.35, 0.36, -2.1),
      new THREE.Vector3(-1.6, 1.1, -1.4),
      {
        id: 'daming-tiegong-shrine',
        nameZh: '05. 铁公祠与小沧浪亭',
        nameEn: 'Tiegong Shrine & Xiaocanglang Pavilion',
        role: '人文古迹 (Cultural Relic)',
        eraSpec: '清乾隆五十七年 (1792年) 建 · 纪念明代兵部尚书铁铉',
        focusCameraPos: [-5.0, 2.6, 0.2],
        focusTargetPos: [-2.35, 0.9, -2.1],
        aspects: {
          architecture:
            '位于大明湖北岸偏西，由铁公祠正殿、小沧浪亭、得月亭及半壁长廊组成，是观赏“佛山倒影”的最佳处。',
          history:
            '为纪念明代坚守济南城的兵部尚书铁铉而建。《老残游记》中老残游大明湖即在此观赏千佛山倒影。',
          poetry:
            '“四面荷花三面柳，一城山色半城湖”原石刻即嵌于小沧浪亭长廊壁间。',
          guide: '春秋晴朗无风之日，立于小沧浪水榭低头俯视，可见城南千佛山清晰倒映湖中。',
        },
        metrics: [
          { label: '纪念人物', value: '明代兵部尚书铁铉' },
          { label: '济南八景', value: '佛山倒影最佳观赏点' },
          { label: '始建年份', value: '清乾隆五十七年 (1792)' },
        ],
      }
    );

    const beijiGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 1.5,
      depth: 1.3,
      plinthH: 0.58,
      colH: 0.75,
      tiers: 2,
      sides: 4,
    });
    registerLandmark(
      parts,
      rootGroup,
      beijiGroup,
      new THREE.Vector3(0.45, 0.36, -3.05),
      new THREE.Vector3(0.3, 1.4, -1.8),
      {
        id: 'daming-beiji-temple',
        nameZh: '06. 北极阁 · 高台道院',
        nameEn: 'Beiji Ge (North Pole Taoist Temple)',
        role: '人文古迹 (Cultural Relic)',
        eraSpec: '元代至元十七年 (1280年) 始建',
        focusCameraPos: [1.2, 2.8, 0.4],
        focusTargetPos: [0.45, 1.2, -3.05],
        aspects: {
          architecture:
            '筑于大明湖北岸高7米余的青石高台之上，前有三十六级石阶直通水面，高耸临湖。',
          history:
            '始建于元代，供奉真武大帝，殿内保存有珍贵的元明时期水陆壁画与泥塑。',
          poetry: '古人咏北极阁：“高阁凌虚俯碧波，钟声摇落满湖荷。”',
          guide: '登临北极阁前平台可南望历下亭与千佛山。',
        },
        metrics: [
          { label: '台基高度', value: '7.0米青石高台（36级石阶）' },
          { label: '始建年代', value: '元代至元十七年 (1280)' },
          { label: '文物保护', value: '元明真武像与壁画' },
        ],
      }
    );

    const jiaxuanGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 1.5,
      depth: 1.15,
      plinthH: 0.28,
      colH: 0.72,
      tiers: 1,
      sides: 4,
    });
    registerLandmark(
      parts,
      rootGroup,
      jiaxuanGroup,
      new THREE.Vector3(-2.7, 0.36, 0.1),
      new THREE.Vector3(-1.9, 0.9, 0.1),
      {
        id: 'daming-jiaxuan-shrine',
        nameZh: '07. 稼轩祠 · 辛弃疾纪念祠',
        nameEn: 'Jiaxuan Shrine (Xin Qiji Memorial)',
        role: '人文古迹 (Cultural Relic)',
        eraSpec: '纪念南宋豪放派词宗、济南历城人辛弃疾',
        focusCameraPos: [-5.4, 2.4, 2.2],
        focusTargetPos: [-2.7, 0.9, 0.1],
        aspects: {
          architecture:
            '坐北朝南三进院落，正厅为卷棚歇山顶，前有临水敞亭“停云堂”，建筑风格古朴豪迈。',
          history:
            '辛弃疾字幼安，号稼轩，出生于济南历城。与李清照纪念堂并称济南“二安”。',
          poetry:
            '辛弃疾名句：“众里寻他千百度，蓦然回首，那人却在，灯火阑珊处。”',
          guide: '祠内展陈辛弃疾抗金生平、手迹拓片及历代名家题咏碑刻。',
        },
        metrics: [
          { label: '济南二安', value: '幼安（辛弃疾）· 易安（李清照）' },
          { label: '文学流派', value: '南宋豪放词派领袖' },
          { label: '核心建筑', value: '稼轩祠正殿 · 停云堂' },
        ],
      }
    );

    const archwayGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 1.4,
      depth: 0.45,
      plinthH: 0.22,
      colH: 0.95,
      tiers: 1,
      sides: 4,
    });
    registerLandmark(
      parts,
      rootGroup,
      archwayGroup,
      new THREE.Vector3(0.2, 0.36, 3.25),
      new THREE.Vector3(0.2, 0.85, 1.8),
      {
        id: 'daming-stone-archway',
        nameZh: '08. 大明湖牌坊 · 门景地标',
        nameEn: 'Daming Lake Ceremonial Archway',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '四柱三间五楼官式牌坊',
        focusCameraPos: [0.8, 2.2, 6.2],
        focusTargetPos: [0.2, 1.0, 3.25],
        aspects: {
          architecture:
            '采用四柱三间五楼重檐歇山式形制，丹柱金彩，斗拱层叠，正中额题“大明湖”三个苍劲大字。',
          history: '见证了百年来济南老城与大明湖风景区的历史变迁。',
          poetry:
            '牌坊楹联：“剪水作花飞，看四面垂杨，十里红荷，都入画图传历下。”',
          guide: '穿过牌坊即见碧波万顷，可在此搭乘画舫开启环湖水上游线。',
        },
        metrics: [
          { label: '建筑制式', value: '四柱三间五楼牌坊' },
          { label: '色彩特征', value: '朱漆立柱 · 旋子彩绘' },
          { label: '游览起点', value: '大明湖南岸主入口' },
        ],
      }
    );

    const boatGroup = new THREE.Group();
    const hullGeo = trackGeo(new THREE.BoxGeometry(0.95, 0.16, 0.38));
    hullGeo.translate(0, 0.08, 0);
    const cabinGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 0.65,
      depth: 0.32,
      plinthH: 0.08,
      colH: 0.28,
      tiers: 1,
      sides: 4,
    });
    cabinGroup.position.y = 0.14;
    boatGroup.add(new THREE.Mesh(hullGeo, mats.secondaryTimber), cabinGroup);

    registerLandmark(
      parts,
      rootGroup,
      boatGroup,
      new THREE.Vector3(1.45, 0.2, 1.45),
      new THREE.Vector3(1.1, 0.5, 1.1),
      {
        id: 'daming-painted-boat',
        nameZh: '09. 明湖画舫 · 泛舟游船',
        nameEn: 'Minghu Traditional Painted Pleasure Boat',
        role: '人文古迹 (Cultural Relic)',
        eraSpec: '非遗明湖泛舟 · 乾隆御舫规制',
        focusCameraPos: [3.6, 1.8, 3.8],
        focusTargetPos: [1.45, 0.45, 1.45],
        aspects: {
          architecture: '仿清代官式画舫建造，船首昂扬，雕梁画栋，四周设推拉花窗与美人靠回廊。',
          history:
            '《老残游记》载老残雇小舟自鹊华桥出发，穿荷柳、登历下亭、拜铁公祠，留下千古游记名篇。',
          poetry:
            '清·刘鹗《老残游记》：“到了铁公祠前，朝南一望，只见对面千佛山上，梵宇僧楼……”',
          guide: '画舫航线串联护城河、趵突泉与大明湖，实现“船在泉中行，人在画中游”。',
        },
        metrics: [
          { label: '水上游线', value: '护城河—大明湖环湖航线' },
          { label: '船体设计', value: '古典飞檐雕花画舫' },
          { label: '游览体验', value: '穿行荷柳 · 登临历下亭' },
        ],
      },
      { bobAmp: 0.03, bobFreq: 2.2 }
    );

    const lotusGeo = trackGeo(new THREE.ConeGeometry(0.24, 0.45, 8));
    lotusGeo.translate(0, 0.225, 0);
    const lotusInst = new THREE.InstancedMesh(lotusGeo, mats.foliageInstanced, 96);
    lotusInst.castShadow = true;
    lotusInst.receiveShadow = true;
    for (let i = 0; i < 96; i++) {
      const isShoreWillow = i < 56;
      const a = (i * Math.PI * 2) / (isShoreWillow ? 56 : 40);
      const r = isShoreWillow ? 4.45 + (i % 4) * 0.28 : 1.9 + (i % 5) * 0.35;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const gy = groundHeightAt('daming', x, z);
      _dummy.position.set(x, gy, z);
      _dummy.rotation.set(0, a, 0);
      const s = isShoreWillow ? 0.95 + (i % 5) * 0.08 : 0.55 + (i % 4) * 0.06;
      _dummy.scale.set(s, isShoreWillow ? s * 1.4 : s * 0.65, s);
      _dummy.updateMatrix();
      lotusInst.setMatrixAt(i, _dummy.matrix);

      if (isShoreWillow) {
        _color.setHSL(0.32 + (i % 3) * 0.02, 0.55, 0.36 + (i % 4) * 0.04);
      } else if (i % 3 === 0) {
        _color.setHSL(0.95, 0.78, 0.65);
      } else {
        _color.setHSL(0.41, 0.62, 0.32);
      }
      lotusInst.setColorAt(i, _color);
    }
    lotusInst.instanceMatrix.needsUpdate = true;
    if (lotusInst.instanceColor) lotusInst.instanceColor.needsUpdate = true;
    lotusInst.computeBoundingSphere();
    rootGroup.add(lotusInst);
    instancedMeshes.push(lotusInst);
  } else if (preset === 'qianfo') {
    // =========================================================================
    // 3. 千佛山 · 齐烟九点 (Qianfo Mountain / Lishan — 9 Landmarks)
    // =========================================================================
    const peakY = groundHeightAt('qianfo', 0, -0.8);
    const yilanGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 1.35,
      depth: 1.35,
      plinthH: 0.42,
      colH: 0.78,
      tiers: 2,
      sides: 8,
    });
    registerLandmark(
      parts,
      rootGroup,
      yilanGroup,
      new THREE.Vector3(0, peakY - 0.1, -0.8),
      new THREE.Vector3(0, 1.8, 0),
      {
        id: 'qianfo-yilan-pavilion',
        nameZh: '01. 历山极顶 · 一览亭',
        nameEn: 'Yilan Pavilion atop Qianfo Summit',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '海拔285米极顶 · 取杜甫“一览众山小”之意',
        focusCameraPos: [2.8, 5.2, 3.6],
        focusTargetPos: [0, peakY + 0.8, -0.8],
        aspects: {
          architecture:
            '屹立于千佛山最高峰之巅，为八角重檐攒尖顶阁亭，四周环绕花岗岩石雕云栏，视野开阔达数十里。',
          history:
            '千佛山古称历山，山顶一览亭取杜甫《望岳》“一览众山小”诗意建造，是俯瞰整个济南老城与大明湖的制高点。',
          poetry:
            '郭沫若登千佛山诗：“俯看齐州烟九点，一泓海水杯中泻。”',
          guide: '登顶北望可见“齐烟九点”及大明湖如明镜镶嵌城中。',
        },
        metrics: [
          { label: '主峰海拔', value: '285 米' },
          { label: '建筑制式', value: '八角重檐凌空观景亭' },
          { label: '视野胜景', value: '俯瞰大明湖 · 远眺黄河' },
        ],
      }
    );

    const xingguoY = groundHeightAt('qianfo', -0.5, 0.35);
    const xingguoGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 2.1,
      depth: 1.35,
      plinthH: 0.38,
      colH: 0.85,
      tiers: 2,
      sides: 4,
    });
    registerLandmark(
      parts,
      rootGroup,
      xingguoGroup,
      new THREE.Vector3(-0.5, xingguoY - 0.08, 0.35),
      new THREE.Vector3(-0.6, 1.2, 0.5),
      {
        id: 'qianfo-xingguo-temple',
        nameZh: '02. 兴国禅寺 · 依崖古刹',
        nameEn: 'Xingguo Chan Monastery (Halfway Cliff)',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '隋代称千佛寺 · 唐贞观年间扩建称兴国禅寺',
        focusCameraPos: [-3.4, 3.8, 3.8],
        focusTargetPos: [-0.5, xingguoY + 0.6, 0.35],
        aspects: {
          architecture:
            '坐落于千佛山半山腰峭壁之下，南依万佛摩崖，北临深谷，殿堂随山势错落排布。',
          history:
            '始建于隋开皇年间，唐太宗贞观年间敕命扩建并赐名“兴国禅寺”，香火绵延一千四百余年。',
          poetry:
            '寺门千古名联：“暮鼓晨钟，惊醒世间名利客；经声佛号，唤回苦海梦迷人。”',
          guide: '进入寺门先读名联，再入内院瞻仰大雄宝殿与南侧紧邻的隋唐摩崖造像。',
        },
        metrics: [
          { label: '创寺年代', value: '隋开皇 · 唐贞观敕建' },
          { label: '选址格局', value: '背倚摩崖 · 北眺泉城' },
          { label: '镇寺名联', value: '暮鼓晨钟惊醒世间名利客' },
        ],
      }
    );

    const cliffGroup = new THREE.Group();
    const cliffWallGeo = trackGeo(new THREE.BoxGeometry(2.6, 1.15, 0.45));
    cliffWallGeo.translate(0, 0.575, 0);
    cliffGroup.add(new THREE.Mesh(cliffWallGeo, mats.stonePlinth));
    for (let g = -2; g <= 2; g++) {
      const statueGeo = trackGeo(new THREE.ConeGeometry(0.12, 0.36, 12));
      statueGeo.translate(g * 0.45, 0.48, 0.24);
      const haloGeo = trackGeo(new THREE.TorusGeometry(0.14, 0.02, 8, 24));
      haloGeo.translate(g * 0.45, 0.56, 0.22);
      cliffGroup.add(
        new THREE.Mesh(statueGeo, mats.gildedAccent),
        new THREE.Mesh(haloGeo, mats.gildedAccent)
      );
    }

    const cliffY = groundHeightAt('qianfo', 1.4, -0.3);
    registerLandmark(
      parts,
      rootGroup,
      cliffGroup,
      new THREE.Vector3(1.4, cliffY - 0.05, -0.3),
      new THREE.Vector3(1.5, 0.9, -0.4),
      {
        id: 'qianfo-cliff-grottos',
        nameZh: '03. 隋唐万佛崖摩崖造像',
        nameEn: 'Sui & Tang Dynasty Cliff-Carved Buddha Grottoes',
        role: '人文古迹 (Cultural Relic)',
        eraSpec: '隋开皇七年至十五年 (587–595年) 镌刻 · 全国重点文保',
        focusCameraPos: [4.2, 3.2, 2.2],
        focusTargetPos: [1.4, cliffY + 0.5, -0.3],
        aspects: {
          architecture:
            '在石灰岩悬崖峭壁上依天然岩势开凿出9处石窟，共镌刻大小佛像130余尊。',
          history:
            '始凿于隋文帝开皇七年（587年），是山东境内时代最早、保存最完整的隋代摩崖造像群之一。',
          poetry:
            '元·张养浩《登千佛山》：“千佛山前千佛寺，千佛岩下礼千佛。”',
          guide: '重点观赏极乐洞内隋开皇十一年造阿弥陀佛主尊及刘景茂造像题记。',
        },
        metrics: [
          { label: '开凿年代', value: '隋开皇七年 (公元587年)' },
          { label: '洞窟数量', value: '9 窟 · 130余尊造像' },
          { label: '保护级别', value: '全国重点文物保护单位' },
        ],
      }
    );

    const qiyanY = groundHeightAt('qianfo', -1.85, 0.9);
    const qiyanGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 1.25,
      depth: 0.42,
      plinthH: 0.25,
      colH: 0.92,
      tiers: 1,
      sides: 4,
    });
    registerLandmark(
      parts,
      rootGroup,
      qiyanGroup,
      new THREE.Vector3(-1.85, qiyanY - 0.05, 0.9),
      new THREE.Vector3(-1.5, 0.85, 0.8),
      {
        id: 'qianfo-qiyan-archway',
        nameZh: '04. 齐烟九点坊 · 望山门景',
        nameEn: 'Qiyan Jiudian (Nine Mists of Qi) Archway',
        role: '人文古迹 (Cultural Relic)',
        eraSpec: '清道光二十五年 (1845年) 历城知县叶圭书建',
        focusCameraPos: [-4.6, 3.0, 3.4],
        focusTargetPos: [-1.85, qiyanY + 0.6, 0.9],
        aspects: {
          architecture:
            '耸立于登山盘道咽喉处的木石牌坊，正北额题“齐烟九点”，正南额题“仰观俯察”。',
          history:
            '典出唐代李贺《梦天》“遥望齐州九点烟，一泓海水杯中泻”，成就济南八景之“齐烟九点”。',
          poetry:
            '唐·李贺《梦天》：“遥望齐州九点烟，一泓海水杯中泻。”',
          guide: '穿过牌坊回首北望，牌坊门框恰似天然画框，框取药山、鹊山、华山九峰。',
        },
        metrics: [
          { label: '典故出处', value: '唐·李贺《梦天》诗意' },
          { label: '立坊时间', value: '清道光二十五年 (1845)' },
          { label: '造园技法', value: '高山框景 · 借景入画' },
        ],
      }
    );

    const maitreyaGroup = new THREE.Group();
    const lotusThroneGeo = trackGeo(createSweepingEaveGeometry(0.95, 0.38, 16, 0));
    const buddhaBodyGeo = trackGeo(new THREE.ConeGeometry(0.55, 1.15, 20));
    buddhaBodyGeo.translate(0, 0.82, 0);
    const buddhaHeadGeo = trackGeo(new THREE.SphereGeometry(0.24, 20, 20));
    buddhaHeadGeo.translate(0, 1.48, 0);
    const backHaloGeo = trackGeo(new THREE.RingGeometry(0.45, 0.72, 32));
    backHaloGeo.translate(0, 1.25, -0.25);
    maitreyaGroup.add(
      new THREE.Mesh(lotusThroneGeo, mats.stonePlinth),
      new THREE.Mesh(buddhaBodyGeo, mats.gildedAccent),
      new THREE.Mesh(buddhaHeadGeo, mats.gildedAccent),
      new THREE.Mesh(backHaloGeo, mats.gildedAccent)
    );

    const maitreyaY = groundHeightAt('qianfo', 2.45, 1.1);
    registerLandmark(
      parts,
      rootGroup,
      maitreyaGroup,
      new THREE.Vector3(2.45, maitreyaY - 0.05, 1.1),
      new THREE.Vector3(1.9, 1.1, 0.9),
      {
        id: 'qianfo-maitreya-statue',
        nameZh: '05. 弥勒胜苑 · 鎏金铜铸大佛',
        nameEn: 'Maitreya Sanctuary & Gilded Bronze Buddha',
        role: '人文古迹 (Cultural Relic)',
        eraSpec: '通高30米（佛体20米 + 莲花座9米） · 江北最大铜铸弥勒',
        focusCameraPos: [5.4, 2.8, 3.8],
        focusTargetPos: [2.45, maitreyaY + 0.9, 1.1],
        aspects: {
          architecture:
            '位于千佛山东麓广场，大佛为紫铜锻造贴金，端坐于八角九米高汉白玉束腰莲花宝座之上。',
          history: '融合中国传统佛教造像艺术与现代金属锻造工艺。',
          poetry:
            '弥勒楹联：“大肚能容，容天下难容之事；开口便笑，笑世间可笑之人。”',
          guide: '阳光照耀下金尊大佛熠熠生辉，座后弧形石刻浮雕展现泉城历史民俗。',
        },
        metrics: [
          { label: '大佛总高', value: '30.0 米（铜铸贴金）' },
          { label: '莲座直径', value: '30.0 米汉白玉基座' },
          { label: '浮雕背光', value: '36米花岗岩艺术照壁' },
        ],
      }
    );

    const shunY = groundHeightAt('qianfo', 1.25, -2.0);
    const shunGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 1.55,
      depth: 1.2,
      plinthH: 0.32,
      colH: 0.78,
      tiers: 1,
      sides: 4,
    });
    registerLandmark(
      parts,
      rootGroup,
      shunGroup,
      new THREE.Vector3(1.25, shunY - 0.05, -2.0),
      new THREE.Vector3(1.2, 1.2, -1.6),
      {
        id: 'qianfo-shun-shrine',
        nameZh: '06. 舜祠 · 大舜躬耕历山圣迹',
        nameEn: 'Emperor Shun Ancestral Shrine (Lishan)',
        role: '人文古迹 (Cultural Relic)',
        eraSpec: '《史记》“舜耕历山”上古圣迹 · 济南大舜文化核心',
        focusCameraPos: [3.8, 3.2, -4.4],
        focusTargetPos: [1.25, shunY + 0.6, -2.0],
        aspects: {
          architecture:
            '古朴雄浑的先秦与汉唐祭祀殿宇形制，院内有大舜石像、历山铭碑及思亲亭。',
          history:
            '《史记·五帝本纪》载：“舜耕历山，历山之人皆让畔。”千佛山即上古历山。',
          poetry:
            '北魏郦道元《水经注》：“城南对山，山上舜祠，山下有大穴，谓之舜井。”',
          guide: '拜谒舜祠可深入了解济南大舜文化渊源与“历下”、“历城”地名的由来。',
        },
        metrics: [
          { label: '历史溯源', value: '上古五帝 · 舜耕历山' },
          { label: '关联古迹', value: '舜祠 · 舜井 · 历山院' },
          { label: '城市渊源', value: '“历下”“历城”得名之源' },
        ],
      }
    );

    const wenchangY = groundHeightAt('qianfo', -2.1, -1.5);
    const wenchangGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 1.15,
      depth: 1.15,
      plinthH: 0.35,
      colH: 0.68,
      tiers: 2,
      sides: 6,
    });
    registerLandmark(
      parts,
      rootGroup,
      wenchangGroup,
      new THREE.Vector3(-2.1, wenchangY - 0.05, -1.5),
      new THREE.Vector3(-1.7, 1.3, -1.2),
      {
        id: 'qianfo-wenchang-pavilion',
        nameZh: '07. 文昌阁 · 西崖重阁',
        nameEn: 'Wenchang Pavilion on Western Crag',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '明清祈福文运阁楼 · 六角重檐',
        focusCameraPos: [-4.8, 3.2, -3.6],
        focusTargetPos: [-2.1, wenchangY + 0.7, -1.5],
        aspects: {
          architecture: '筑于千佛山西侧山崖之上，为六角重檐攒尖顶阁楼，飞檐高挑。',
          history: '昔日济南学子赴山东贡院参加乡试前，常登千佛山礼拜文昌帝君祈求文运。',
          poetry: '古联云：“文光射斗牛，看历下名士辈出；瑞气笼奎壁，喜齐鲁弦歌不绝。”',
          guide: '在此可西望济南城区与黄河远影，是观赏“齐烟暮色”的绝佳亭台。',
        },
        metrics: [
          { label: '平面形制', value: '六角重檐攒尖顶阁' },
          { label: '人文传统', value: '齐鲁文脉 · 登高祈学' },
          { label: '景观朝向', value: '西眺黄河与匡山夕照' },
        ],
      }
    );

    const trailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.2, groundHeightAt('qianfo', -0.2, 3.4) + 0.05, 3.4),
      new THREE.Vector3(-1.3, groundHeightAt('qianfo', -1.3, 1.9) + 0.05, 1.9),
      new THREE.Vector3(-0.6, groundHeightAt('qianfo', -0.6, 0.7) + 0.05, 0.7),
      new THREE.Vector3(0, peakY + 0.05, -0.4),
    ]);
    const trailGeo = trackGeo(new THREE.TubeGeometry(trailCurve, 64, 0.16, 8, false));
    trailGeo.scale(1.6, 0.35, 1.0);
    const trailMesh = new THREE.Mesh(trailGeo, mats.stonePlinth);

    registerLandmark(
      parts,
      rootGroup,
      trailMesh,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.45, 1.2),
      {
        id: 'qianfo-winding-steps',
        nameZh: '08. 盘山青石御道与石阶',
        nameEn: 'Winding Bluestone Mountain Ascent Trail',
        role: '山水名胜 (Scenic Feature)',
        eraSpec: '历代登高礼佛古盘道 · 青石条砌筑',
        focusCameraPos: [-2.8, 2.6, 5.2],
        focusTargetPos: [-0.8, 1.0, 2.0],
        aspects: {
          architecture: '顺应千佛山北坡地形蜿蜒而上，采用青石条错缝铺砌，两侧设石护栏与摩崖题刻。',
          history: '自隋唐以来即为登山礼佛、重阳登高之古道，串联唐槐亭、齐烟九点坊与兴国禅寺。',
          poetry: '宋·曾巩《登千佛山》：“盘道穿云入翠微，回看城郭似枰棋。”',
          guide: '每年农历九月初九重阳节，千佛山山会在此盘道盛大举行。',
        },
        metrics: [
          { label: '石阶材质', value: '历城青石条手工凿砌' },
          { label: '串联景点', value: '唐槐亭 → 齐烟九点 → 禅寺' },
          { label: '非遗民俗', value: '千佛山九月九重阳山会' },
        ],
      }
    );

    const tanghuaiY = groundHeightAt('qianfo', -0.4, 2.85);
    const tanghuaiGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 0.95,
      depth: 0.95,
      plinthH: 0.22,
      colH: 0.65,
      tiers: 1,
      sides: 4,
    });
    registerLandmark(
      parts,
      rootGroup,
      tanghuaiGroup,
      new THREE.Vector3(-0.4, tanghuaiY - 0.04, 2.85),
      new THREE.Vector3(-0.4, 0.7, 1.8),
      {
        id: 'qianfo-tanghuai-pavilion',
        nameZh: '09. 唐槐亭 · 秦琼拴马遗迹',
        nameEn: 'Tanghuai (Tang Locust Tree) Pavilion',
        role: '人文古迹 (Cultural Relic)',
        eraSpec: '唐代名将秦琼拴马古槐 · 明万历年间建亭',
        focusCameraPos: [-1.8, 2.0, 5.4],
        focusTargetPos: [-0.4, tanghuaiY + 0.5, 2.85],
        aspects: {
          architecture: '位于千佛山盘道中下段的四角单檐碑亭，与千年古槐相伴。',
          history: '相传唐代开国名将秦琼曾在此古槐下拴马歇息，后人筑唐槐亭纪念。',
          poetry: '清人咏唐槐：“将军战马今何在，留得空山古槐青。”',
          guide: '可细看千年古槐树干中空却新枝繁茂的“母抱子”生命奇观。',
        },
        metrics: [
          { label: '历史传说', value: '唐代翼国公秦琼拴马处' },
          { label: '古树奇观', value: '千年唐槐“母抱子”' },
          { label: '建亭年代', value: '明万历年间始建' },
        ],
      }
    );

    const pineGeo = trackGeo(new THREE.ConeGeometry(0.28, 0.85, 7));
    pineGeo.translate(0, 0.425, 0);
    const pineInst = new THREE.InstancedMesh(pineGeo, mats.foliageInstanced, 88);
    pineInst.castShadow = true;
    pineInst.receiveShadow = true;
    for (let i = 0; i < 88; i++) {
      const a = i * 2.39996;
      const r = 1.65 + (i / 88) * 3.6;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const gy = groundHeightAt('qianfo', x, z);
      _dummy.position.set(x, gy - 0.03, z);
      _dummy.rotation.set(0, a, 0);
      const s = 0.82 + ((i * 13) % 32) * 0.01;
      _dummy.scale.set(s, s * (0.95 + (i % 4) * 0.12), s);
      _dummy.updateMatrix();
      pineInst.setMatrixAt(i, _dummy.matrix);

      _color.setHSL(0.36 + (i % 4) * 0.02, 0.48, 0.28 + (i % 5) * 0.04);
      pineInst.setColorAt(i, _color);
    }
    pineInst.instanceMatrix.needsUpdate = true;
    if (pineInst.instanceColor) pineInst.instanceColor.needsUpdate = true;
    pineInst.computeBoundingSphere();
    rootGroup.add(pineInst);
    instancedMeshes.push(pineInst);
  } else {
    // =========================================================================
    // 4. 灵岩寺 · 海内四大名刹 (Lingyan Temple & Pizhi Pagoda — 9 Landmarks)
    // =========================================================================
    const pizhiGroup = new THREE.Group();
    const sumeruGeo = trackGeo(new THREE.CylinderGeometry(0.95, 1.08, 0.55, 8));
    sumeruGeo.translate(0, 0.275, 0);
    pizhiGroup.add(new THREE.Mesh(sumeruGeo, mats.stonePlinth));

    let pY = 0.55;
    for (let level = 0; level < 9; level++) {
      const s = Math.pow(0.89, level);
      const bodyR = 0.76 * s;
      const bodyH = 0.34 * Math.pow(0.91, level);
      const bodyGeo = trackGeo(new THREE.CylinderGeometry(bodyR * 0.94, bodyR, bodyH, 8));
      bodyGeo.translate(0, pY + bodyH / 2, 0);
      pizhiGroup.add(new THREE.Mesh(bodyGeo, mats.secondaryTimber));

      const eaveGeo = trackGeo(createSweepingEaveGeometry(bodyR * 1.32, 0.16 * s, 8, 0));
      eaveGeo.translate(0, pY + bodyH - 0.02, 0);
      pizhiGroup.add(new THREE.Mesh(eaveGeo, mats.primaryRoof));
      pY += bodyH + 0.11 * s;
    }
    const spireGeo = trackGeo(new THREE.ConeGeometry(0.14, 0.72, 16));
    spireGeo.translate(0, pY + 0.34, 0);
    pizhiGroup.add(new THREE.Mesh(spireGeo, mats.gildedAccent));

    const pizhiGroundY = groundHeightAt('lingyan', -1.25, -0.6);
    registerLandmark(
      parts,
      rootGroup,
      pizhiGroup,
      new THREE.Vector3(-1.25, pizhiGroundY - 0.04, -0.6),
      new THREE.Vector3(-1.2, 2.2, -0.5),
      {
        id: 'lingyan-pizhi-pagoda',
        nameZh: '01. 辟支塔 · 宋代八角九层楼阁塔',
        nameEn: 'Pizhi Pagoda (Song Dynasty 9-Tier Octagonal Pagoda)',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '始建于唐 · 北宋淳化五年至嘉祐二年 (994–1057年) 重建',
        focusCameraPos: [-4.4, 3.8, 3.2],
        focusTargetPos: [-1.25, pizhiGroundY + 1.8, -0.6],
        aspects: {
          architecture:
            '通高55.7米，为八角九层楼阁式砖石混筑佛塔。塔基为八角石砌须弥座，雕刻四十幅阿育王皈依佛门浮雕；塔刹由覆钵、相轮及八根铁链构成。',
          history:
            '始建于唐天宝年间，现存塔体为北宋淳化五年（994年）至嘉祐二年（1057年）建成。',
          poetry:
            '宋·曾巩《灵岩寺》：“法定禅房临峭谷，辟支灵塔冠层峦。”',
          guide: '细赏塔基须弥座上栩栩如生的北宋石刻浮雕以及塔顶宋代铁链塔刹。',
        },
        metrics: [
          { label: '古塔通高', value: '55.7 米（八角九层）' },
          { label: '建成年代', value: '北宋嘉祐二年 (1057年)' },
          { label: '须弥座雕塑', value: '40 幅北宋阿育王石刻浮雕' },
        ],
      }
    );

    const qianfoHallY = groundHeightAt('lingyan', 0.85, -1.0);
    const qianfoHallGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 2.35,
      depth: 1.45,
      plinthH: 0.42,
      colH: 0.92,
      tiers: 2,
      sides: 4,
    });
    registerLandmark(
      parts,
      rootGroup,
      qianfoHallGroup,
      new THREE.Vector3(0.85, qianfoHallY - 0.04, -1.0),
      new THREE.Vector3(0.9, 1.5, -0.9),
      {
        id: 'lingyan-qianfo-hall',
        nameZh: '02. 千佛殿 · 海内第一名塑罗汉',
        nameEn: 'Qianfo Hall (Hall of 40 Painted Clay Arhats)',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '唐贞观始建 · 殿内藏宋明40尊彩色泥塑罗汉',
        focusCameraPos: [3.8, 3.0, 2.4],
        focusTargetPos: [0.85, qianfoHallY + 0.8, -1.0],
        aspects: {
          architecture: '建于高大石砌台基之上，面阔七间，进深四间，前檐柱采用石雕蟠龙柱。',
          history:
            '殿内供奉宋代（27尊）及明代（13尊）40尊全身彩色泥塑罗汉像，梁启超赞誉为“海内第一名塑”。',
          poetry: '贺敬之观灵岩寺罗汉诗：“雪山千古冷，独照峨眉峰。哪怕泥塑人，也有脉搏动！”',
          guide: '罗汉塑像神态各异、衣褶流畅，连额头青筋与血管脉络均清晰逼真。',
        },
        metrics: [
          { label: '泥塑国宝', value: '40 尊宋明彩色泥塑罗汉' },
          { label: '梁启超题赞', value: '“海内第一名塑”' },
          { label: '建筑等级', value: '七开间庑殿顶巨制' },
        ],
      }
    );

    const stupaHeroGroup = new THREE.Group();
    for (let s = -1; s <= 1; s++) {
      const stBase = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.48, 0.35, 0.48)),
        mats.stonePlinth
      );
      stBase.position.set(s * 0.72, 0.175, 0);
      const stBody = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.22, 0.25, 0.55, 8)),
        mats.stonePlinth
      );
      stBody.position.set(s * 0.72, 0.62, 0);
      const stRoof = new THREE.Mesh(
        trackGeo(createSweepingEaveGeometry(0.38, 0.22, 4, Math.PI / 4)),
        mats.primaryRoof
      );
      stRoof.position.set(s * 0.72, 0.9, 0);
      stupaHeroGroup.add(stBase, stBody, stRoof);
    }

    const stupaY = groundHeightAt('lingyan', -2.85, 0.85);
    registerLandmark(
      parts,
      rootGroup,
      stupaHeroGroup,
      new THREE.Vector3(-2.85, stupaY - 0.04, 0.85),
      new THREE.Vector3(-1.9, 0.95, 0.6),
      {
        id: 'lingyan-stupa-forest',
        nameZh: '03. 墓塔林 · 慧崇塔与百座石塔',
        nameEn: 'Stupa Forest (Tang to Ming Dynasty Stone Pagodas)',
        role: '人文古迹 (Cultural Relic)',
        eraSpec: '北魏至明清 · 现存167座石塔与81通墓志碑',
        focusCameraPos: [-5.4, 2.5, 3.4],
        focusTargetPos: [-2.85, stupaY + 0.5, 0.85],
        aspects: {
          architecture: '包含唐代“慧崇塔”以及宋、金、元、明、清历代高僧石质墓塔167座。',
          history: '是中国第二大古塔林，堪称一部浓缩的中国古代石塔建筑史。',
          poetry: '清·乾隆《题灵岩墓塔林》：“历劫高僧归寂灭，累朝石塔立苍茫。”',
          guide: '最核心文物为墓塔林北首的唐天宝年间“慧崇塔”。',
        },
        metrics: [
          { label: '石塔存量', value: '167 座历代石塔 · 81 通墓碑' },
          { label: '核心唐塔', value: '唐天宝年间慧崇塔' },
          { label: '历史跨度', value: '唐 · 宋 · 金 · 元 · 明 · 清' },
        ],
      }
    );

    const yushuY = groundHeightAt('lingyan', 0.85, -2.55);
    const yushuGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 1.5,
      depth: 1.25,
      plinthH: 0.45,
      colH: 0.85,
      tiers: 2,
      sides: 4,
    });
    registerLandmark(
      parts,
      rootGroup,
      yushuGroup,
      new THREE.Vector3(0.85, yushuY - 0.04, -2.55),
      new THREE.Vector3(0.8, 1.5, -1.8),
      {
        id: 'lingyan-yushu-pavilion',
        nameZh: '04. 御书阁 · 宋皇赐书宝阁',
        nameEn: 'Yushu Ge (Imperial Calligraphy Pavilion)',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '北宋真宗、仁宗赐御书处',
        focusCameraPos: [3.2, 3.2, -4.8],
        focusTargetPos: [0.85, yushuY + 0.8, -2.55],
        aspects: {
          architecture: '位于千佛殿正北高台之上，为二层重檐阁楼建筑。',
          history: '宋真宗赴泰山封禅途经此地，赐御书佛经珍藏于阁内，故名“御书阁”。',
          poetry: '明·王世贞《游泰山记》赞灵岩：“游泰山不至灵岩，不成游也。”',
          guide: '阁旁生长着树龄逾千年的“汉柏”与玄奘“摩顶松”。',
        },
        metrics: [
          { label: '历史功能', value: '珍藏北宋皇帝御赐佛经' },
          { label: '伴生古木', value: '千年汉柏 · 玄奘摩顶松' },
          { label: '位置关系', value: '千佛殿正北高台' },
        ],
      }
    );

    const daxiongY = groundHeightAt('lingyan', 0.85, 0.75);
    const daxiongGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 2.0,
      depth: 1.35,
      plinthH: 0.35,
      colH: 0.8,
      tiers: 1,
      sides: 4,
    });
    registerLandmark(
      parts,
      rootGroup,
      daxiongGroup,
      new THREE.Vector3(0.85, daxiongY - 0.04, 0.75),
      new THREE.Vector3(0.8, 0.95, 0.8),
      {
        id: 'lingyan-mahavira-hall',
        nameZh: '05. 大雄宝殿与般舟殿宋代须弥座',
        nameEn: 'Mahavira Hall & Song Dynasty Banzhou Plinth',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '宋嘉祐年间基址 · 明清重修大殿',
        focusCameraPos: [3.8, 2.4, 3.6],
        focusTargetPos: [0.85, daxiongY + 0.6, 0.75],
        aspects: {
          architecture: '位于千佛殿南侧，紧邻北宋嘉祐年间遗存的般舟殿精美石雕须弥座台基。',
          history: '见证了灵岩寺自公元357年朗公创建以来的千年法脉。',
          poetry: '清·乾隆八次驻跸灵岩寺：“灵岩千载刹，岱岳一脉连。”',
          guide: '殿前古银杏树高大参天，深秋时节满院金黄。',
        },
        metrics: [
          { label: '创寺源流', value: '公元357年朗公禅师创建' },
          { label: '宋代遗珍', value: '般舟殿石雕伎乐须弥座' },
          { label: '帝王驻跸', value: '乾隆皇帝八次行宫驻跸' },
        ],
      }
    );

    const zhuoxiGroup = new THREE.Group();
    const springPavilion = createClassicalHallGroup(trackGeo, mats, {
      width: 0.92,
      depth: 0.92,
      plinthH: 0.2,
      colH: 0.62,
      tiers: 1,
      sides: 6,
    });
    const springPool = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.68, 0.68, 0.14, 24)),
      mats.waterCrystal
    );
    springPool.position.set(-0.6, 0.08, 0.4);
    zhuoxiGroup.add(springPavilion, springPool);

    const zhuoxiY = groundHeightAt('lingyan', 2.8, 0.3);
    registerLandmark(
      parts,
      rootGroup,
      zhuoxiGroup,
      new THREE.Vector3(2.8, zhuoxiY - 0.04, 0.3),
      new THREE.Vector3(2.0, 0.85, 0.3),
      {
        id: 'lingyan-zhuoxi-spring',
        nameZh: '06. 卓锡泉 · 济南七十二名泉之一',
        nameEn: 'Zhuoxi Spring (Monk Staff Spring)',
        role: '山水名胜 (Scenic Feature)',
        eraSpec: '东晋法定禅师锡杖叩石涌泉 · 乾隆御封甘露',
        focusCameraPos: [5.4, 2.4, 2.6],
        focusTargetPos: [2.8, zhuoxiY + 0.5, 0.3],
        aspects: {
          architecture: '位于灵岩寺东侧山崖下，泉水自岩壁石隙涌出，呈“五步三泉”奇景。',
          history: '相传北魏高僧法定禅师以锡杖叩击山石，清泉应声涌出，列济南七十二名泉之一。',
          poetry: '元·赵孟頫咏灵岩泉：“锡杖叩顽石，清泉涌碧流。”',
          guide: '卓锡泉、白鹤泉、袈裟泉三泉鼎立，泉水清冽甘甜。',
        },
        metrics: [
          { label: '名泉排位', value: '金代《名泉碑》七十二名泉' },
          { label: '奇观分布', value: '卓锡、白鹤、双鹤“五步三泉”' },
          { label: '得名典故', value: '法定禅师锡杖叩石出泉' },
        ],
      }
    );

    const fangshanGroup = new THREE.Group();
    const cliffGeo = trackGeo(new THREE.CylinderGeometry(1.65, 2.35, 1.85, 7));
    cliffGeo.scale(1.6, 1.0, 0.65);
    cliffGeo.translate(0, 0.925, 0);
    const summitShrine = createClassicalHallGroup(trackGeo, mats, {
      width: 0.85,
      depth: 0.7,
      plinthH: 0.18,
      colH: 0.45,
      tiers: 1,
      sides: 4,
    });
    summitShrine.position.set(0, 1.82, 0);
    fangshanGroup.add(new THREE.Mesh(cliffGeo, mats.stonePlinth), summitShrine);

    const fangshanY = groundHeightAt('lingyan', 2.4, -2.2);
    registerLandmark(
      parts,
      rootGroup,
      fangshanGroup,
      new THREE.Vector3(2.4, fangshanY - 0.1, -2.2),
      new THREE.Vector3(1.8, 1.6, -1.6),
      {
        id: 'lingyan-fangshan-cliff',
        nameZh: '07. 方山绝壁与证明功德龛',
        nameEn: 'Mt. Fangshan Cliff & Zhengming Grotto',
        role: '山水名胜 (Scenic Feature)',
        eraSpec: '泰山北麓屏障 · 唐代卢舍那大佛石龛',
        focusCameraPos: [5.4, 3.8, -0.5],
        focusTargetPos: [2.4, fangshanY + 1.1, -2.2],
        aspects: {
          architecture: '灵岩寺背后耸立的“方山”，山巅平直如削，半山绝壁开凿有唐代“证明功德龛”。',
          history: '唐永淳二年（683年）高宗李治与武则天敕令在方山绝壁雕凿卢舍那佛坐像。',
          poetry: '唐·刘长卿诗：“灵岩万仞耸苍穹，石室禅关紫翠中。”',
          guide: '仰望方山如巨大屏风环护古刹，沿东侧红门石阶可探访唐代石窟。',
        },
        metrics: [
          { label: '山体特征', value: '山顶平直如方印 · 绝壁千仞' },
          { label: '唐代大佛', value: '唐永淳二年卢舍那佛（高4.5米）' },
          { label: '世界遗产', value: '泰山世界文化与自然遗产组成部分' },
        ],
      }
    );

    const gateY = groundHeightAt('lingyan', 0.2, 2.55);
    const gateGroup = createClassicalHallGroup(trackGeo, mats, {
      width: 1.75,
      depth: 0.95,
      plinthH: 0.28,
      colH: 0.72,
      tiers: 1,
      sides: 4,
    });
    registerLandmark(
      parts,
      rootGroup,
      gateGroup,
      new THREE.Vector3(0.2, gateY - 0.04, 2.55),
      new THREE.Vector3(0.2, 0.75, 1.8),
      {
        id: 'lingyan-mountain-gate',
        nameZh: '08. 天王殿山门与钟鼓二楼',
        nameEn: 'Tianwang Mountain Gate & Bell-Drum Towers',
        role: '核心建筑 (Primary Landmark)',
        eraSpec: '“大灵岩寺”石额 · 四大名刹门庭',
        focusCameraPos: [0.8, 2.2, 5.8],
        focusTargetPos: [0.2, gateY + 0.5, 2.55],
        aspects: {
          architecture: '灵岩寺南大门，由山门、天王殿及东西钟鼓楼组成，石券门额镌刻“大灵岩寺”。',
          history: '唐代李吉甫《十道图》将灵岩寺列为“天下四绝”（海内四大名刹）之首。',
          poetry: '山门古联：“四绝推灵岩第一，十方仰慧日重光。”',
          guide: '步入山门即可望见远处高耸入云的宋代辟支塔与千年古银杏。',
        },
        metrics: [
          { label: '海内四绝', value: '灵岩 · 国清 · 玉泉 · 栖霞' },
          { label: '门庭布局', value: '山门 · 天王殿 · 钟鼓楼' },
          { label: '历史地位', value: '北方佛教禅宗重镇' },
        ],
      }
    );

    const palaceGroup = new THREE.Group();
    const pondGeo = trackGeo(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 32));
    pondGeo.translate(0, 0.04, 0);
    const pavilion = createClassicalHallGroup(trackGeo, mats, {
      width: 0.9,
      depth: 0.9,
      plinthH: 0.22,
      colH: 0.58,
      tiers: 1,
      sides: 4,
    });
    pavilion.position.set(0, 0.06, -0.35);
    palaceGroup.add(new THREE.Mesh(pondGeo, mats.springBasinPlate), pavilion);

    const palaceY = groundHeightAt('lingyan', -1.5, 2.2);
    registerLandmark(
      parts,
      rootGroup,
      palaceGroup,
      new THREE.Vector3(-1.5, palaceY - 0.04, 2.2),
      new THREE.Vector3(-1.3, 0.65, 1.5),
      {
        id: 'lingyan-qianlong-palace',
        nameZh: '09. 乾隆行宫与澄怀镜池',
        nameEn: 'Qianlong Imperial Traveling Palace & Mirror Pond',
        role: '人文古迹 (Cultural Relic)',
        eraSpec: '清乾隆二十二年 (1757年) 建行宫院落',
        focusCameraPos: [-3.8, 2.2, 4.8],
        focusTargetPos: [-1.5, palaceY + 0.4, 2.2],
        aspects: {
          architecture: '引卓锡泉与袈裟泉水汇成一池碧水，池畔筑有御书房、爱山楼与临水方亭。',
          history: '乾隆皇帝八次专程驻跸灵岩寺行宫，留下御制诗碑数十通。',
          poetry: '乾隆《灵岩行宫即景》：“泉声竹影入窗纱，静对炉烟品贡茶。”',
          guide: '池面如镜，可将北侧高耸的辟支塔完整倒映于碧水之中。',
        },
        metrics: [
          { label: '驻跸次数', value: '乾隆皇帝 8 次驻跸' },
          { label: '造景核心', value: '引泉入池 · 辟支塔倒影' },
          { label: '御制碑刻', value: '现存乾隆御碑十余通' },
        ],
      }
    );

    const treeAndStupaGeo = trackGeo(new THREE.ConeGeometry(0.25, 0.78, 8));
    treeAndStupaGeo.translate(0, 0.39, 0);
    const lingyanInst = new THREE.InstancedMesh(treeAndStupaGeo, mats.foliageInstanced, 80);
    lingyanInst.castShadow = true;
    lingyanInst.receiveShadow = true;
    for (let i = 0; i < 80; i++) {
      const a = (i * Math.PI * 2) / 80;
      const r = 3.85 + (i % 5) * 0.32;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const gy = groundHeightAt('lingyan', x, z);
      _dummy.position.set(x, gy - 0.02, z);
      _dummy.rotation.set(0, a, 0);
      const s = 0.85 + ((i * 19) % 30) * 0.01;
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();
      lingyanInst.setMatrixAt(i, _dummy.matrix);

      if (i % 3 === 0) {
        _color.setHSL(0.12, 0.82, 0.56);
      } else {
        _color.setHSL(0.42, 0.45, 0.28 + (i % 4) * 0.04);
      }
      lingyanInst.setColorAt(i, _color);
    }
    lingyanInst.instanceMatrix.needsUpdate = true;
    if (lingyanInst.instanceColor) lingyanInst.instanceColor.needsUpdate = true;
    lingyanInst.computeBoundingSphere();
    rootGroup.add(lingyanInst);
    instancedMeshes.push(lingyanInst);
  }

  return {
    rootGroup,
    parts,
    instancedMeshes,
    koiMesh,
    koiData,
    dispose: () => {
      geometriesToDispose.forEach((g) => g.dispose());
    },
  };
}
