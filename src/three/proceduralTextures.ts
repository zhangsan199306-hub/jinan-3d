import * as THREE from 'three';

/**
 * Generates a photorealistic Baotu Spring emerald karst pool floor & water ripple texture
 * matching the uploaded reference photo (deep turquoise-jade center, golden-green mossy stone shelves,
 * and three churning white spring foam centers).
 */
export function createSpringWaterTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const cx = 512;
  const cy = 512;

  // Authentic emerald-turquoise karst spring water gradient with warm mossy edges
  const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 560);
  grad.addColorStop(0, '#0f766e');
  grad.addColorStop(0.45, '#0d9488');
  grad.addColorStop(0.75, '#115e59');
  grad.addColorStop(0.92, '#1f4e3d');
  grad.addColorStop(1, '#294233');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle submerged limestone caustics & moss patches
  for (let i = 0; i < 140; i++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    const pr = 15 + Math.random() * 45;
    const patchGrad = ctx.createRadialGradient(px, py, 2, px, py, pr);
    patchGrad.addColorStop(0, 'rgba(20, 184, 166, 0.16)');
    patchGrad.addColorStop(1, 'rgba(15, 118, 110, 0)');
    ctx.fillStyle = patchGrad;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine water surface wave ripples across the pool
  for (let r = 24; r < 520; r += 11) {
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.03; a += 0.03) {
      const wave = Math.sin(a * 14) * 3.0 + Math.cos(a * 8) * 2.0;
      const x = cx + Math.cos(a) * (r + wave);
      const y = cy + Math.sin(a) * (r + wave);
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle =
      r < 220
        ? 'rgba(240, 253, 250, 0.26)'
        : 'rgba(153, 246, 228, 0.13)';
    ctx.lineWidth = r < 180 ? 1.8 : 1.0;
    ctx.stroke();
  }

  // Three prominent churning white foam halos matching the triangular formation in the photo
  const springCenters = [
    [cx - 35, cy + 75, 92],  // Foreground-center main spring head
    [cx - 55, cy - 55, 76],  // Rear-left spring head
    [cx + 85, cy - 35, 82],  // Rear-right spring head
  ];
  springCenters.forEach(([sx, sy, maxR]) => {
    const foamGrad = ctx.createRadialGradient(sx, sy, 6, sx, sy, maxR);
    foamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
    foamGrad.addColorStop(0.45, 'rgba(240, 253, 250, 0.65)');
    foamGrad.addColorStop(0.75, 'rgba(204, 251, 241, 0.28)');
    foamGrad.addColorStop(1, 'rgba(204, 251, 241, 0)');
    ctx.fillStyle = foamGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, maxR, 0, Math.PI * 2);
    ctx.fill();

    for (let sr = 18; sr <= maxR; sr += 14) {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a linear-space architectural tubular roof tile (青灰筒瓦) & carved stone bump/roughness map.
 */
export function createArchitecturalTileMap(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);

  // Authentic Chinese tubular tile ridges (筒瓦与板瓦垄溝)
  for (let x = 0; x < 512; x += 6) {
    const shade = x % 12 === 0 ? 175 : 92;
    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
    ctx.fillRect(x, 0, 3, 512);
  }

  // Horizontal tile overlap joints
  for (let y = 0; y < 512; y += 24) {
    ctx.strokeStyle = 'rgb(65, 65, 65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates an ornate traditional Chinese architectural plaque (匾额) & green-gold painted beam texture.
 */
export function createPlaqueTexture(
  text: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  // Lacquered ebony black plaque background
  ctx.fillStyle = '#111318';
  ctx.fillRect(0, 0, 512, 192);

  // Double gilded dragon-pattern border
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 172);
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, 468, 148);

  // Golden calligraphy text (e.g. "泺 源 堂" or "观 澜 亭")
  ctx.font = '700 84px "Cinzel", "Songti SC", "SimSun", serif';
  ctx.fillStyle = '#fde047';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 98);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a grey flagstone courtyard pavement texture (青石板广场铺装).
 */
export function createFlagstonePavingTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 8;
  const cols = 4;
  const w = 512 / cols;
  const h = 512 / rows;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (w / 2);
    for (let c = -1; c <= cols; c++) {
      const x = c * w + offset;
      const y = r * h;
      const tone = 142 + ((r * 7 + c * 13) % 24);
      ctx.fillStyle = `rgb(${tone}, ${tone - 2}, ${tone - 6})`;
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a soft radial contact shadow texture for grounding pedestals, mountains, and lakes.
 */
export function createRadialContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(256, 256, 24, 256, 256, 252);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(0.82, 'rgba(0, 0, 0, 0.10)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
