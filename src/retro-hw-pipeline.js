/**
 * src/retro-hw-pipeline.js
 * Zero-dependency, deterministic Q16.16 fixed-point GBA & PS1 hardware emulation suite
 * for ndh-game-dev-kit (Ledger 1 deterministic raster/math + Ledger 2 WebAudio synthesis).
 */

export const SHIFT = 16;
export const ONE = 1 << SHIFT;

// ============================================================================
// 1. DETERMINISTIC FIXED-POINT MATH & TRIGONOMETRY (ZERO FLOATS)
// ============================================================================
export function mulQ16(a, b) {
  return Number((BigInt(a) * BigInt(b)) >> 16n) | 0;
}

export function ceilDiv(a, b) {
  return a >= 0 ? ((a + b - 1) / b) | 0 : (a / b) | 0;
}

export function createDeterministicTrigLUT() {
  const TABLE_SIZE = 1024; // 1024 brads = 2pi radians (256 = 90 deg)
  const MASK = TABLE_SIZE - 1;
  const QUARTER = TABLE_SIZE >> 2;
  const SIN_LUT = new Int32Array(TABLE_SIZE);

  for (let i = 0; i <= QUARTER; i += 1) {
    const x = BigInt(i * 9000) / 256n;
    const term = x * (18000n - x);
    const num = 4n * term * 65536n;
    const den = 405000000n - term;
    const val = Number(num / den) | 0;
    SIN_LUT[i] = val;
    SIN_LUT[512 - i] = val;
    SIN_LUT[512 + i] = -val;
    SIN_LUT[(1024 - i) & MASK] = -val;
  }

  return {
    sinQ16: (angleBrad) => SIN_LUT[angleBrad & MASK],
    cosQ16: (angleBrad) => SIN_LUT[(angleBrad + QUARTER) & MASK],
  };
}

export function buildRotationMatrixQ16(rx, ry, rz, trig) {
  const sx = trig.sinQ16(rx), cx = trig.cosQ16(rx);
  const sy = trig.sinQ16(ry), cy = trig.cosQ16(ry);
  const sz = trig.sinQ16(rz), cz = trig.cosQ16(rz);
  const sxsy = mulQ16(sx, sy);
  const cxsy = mulQ16(cx, sy);

  return Int32Array.of(
    mulQ16(cy, cz) + mulQ16(sxsy, sz), mulQ16(-cy, sz) + mulQ16(sxsy, cz), mulQ16(sy, cx),
    mulQ16(cx, sz), mulQ16(cx, cz), -sx,
    mulQ16(-sy, cz) + mulQ16(cxsy, sz), mulQ16(sy, sz) + mulQ16(cxsy, cz), mulQ16(cx, cy)
  );
}

// ============================================================================
// 2. PS1 GPU PIPELINE (GOURAUD, AFFINE UV, 4x4 DITHER, RGB555, SEMI-TRANSPARENCY)
// ============================================================================
const PS1_DITHER_4X4 = Int8Array.of(
  -4, 0, -3, 1,
  2, -2, 3, -1,
  -3, 1, -4, 0,
  3, -1, 2, -2
);

// mode: 0 = 50/50 avg, 1 = 100% additive, 2 = 100% subtractive, 3 = 100% + 25% front
export function blendPS1Pixel(dst, src, mode = 0) {
  if (mode === 0) {
    const avg = ((dst & 0x00FEFEFE) >> 1) + ((src & 0x00FEFEFE) >> 1);
    return 0xFF000000 | avg;
  }
  const dr = dst & 0xFF, dg = (dst >> 8) & 0xFF, db = (dst >> 16) & 0xFF;
  const sr = src & 0xFF, sg = (src >> 8) & 0xFF, sb = (src >> 16) & 0xFF;
  let r, g, b;
  if (mode === 1) {
    r = dr + sr; if (r > 255) r = 255;
    g = dg + sg; if (g > 255) g = 255;
    b = db + sb; if (b > 255) b = 255;
  } else if (mode === 2) {
    r = dr - sr; if (r < 0) r = 0;
    g = dg - sg; if (g < 0) g = 0;
    b = db - sb; if (b < 0) b = 0;
  } else {
    r = dr + (sr >> 2); if (r > 255) r = 255;
    g = dg + (sg >> 2); if (g > 255) g = 255;
    b = db + (sb >> 2); if (b > 255) b = 255;
  }
  return 0xFF000000 | (b << 16) | (g << 8) | r;
}

export function drawPS1GouraudTriangle(
  buf32, screenW, screenH, v0, v1, v2, tex32, texW, texH, blendMode = -1
) {
  if (v1.y < v0.y) { const t = v0; v0 = v1; v1 = t; }
  if (v2.y < v0.y) { const t = v0; v0 = v2; v2 = t; }
  if (v2.y < v1.y) { const t = v1; v1 = v2; v2 = t; }

  const totalHeight = v2.y - v0.y;
  if (totalHeight <= 0) return;

  const uMask = texW - 1;
  const vMask = texH - 1;

  const dxLong = (((v2.x - v0.x) << SHIFT) / totalHeight) | 0;
  const duLong = ((v2.u - v0.u) / totalHeight) | 0;
  const dvLong = ((v2.v - v0.v) / totalHeight) | 0;
  const drLong = ((((v2.r ?? 128) - (v0.r ?? 128)) << SHIFT) / totalHeight) | 0;
  const dgLong = ((((v2.g ?? 128) - (v0.g ?? 128)) << SHIFT) / totalHeight) | 0;
  const dbLong = ((((v2.b ?? 128) - (v0.b ?? 128)) << SHIFT) / totalHeight) | 0;

  let xLong = v0.x << SHIFT, uLong = v0.u, vLong = v0.v;
  let rLong = (v0.r ?? 128) << SHIFT, gLong = (v0.g ?? 128) << SHIFT, bLong = (v0.b ?? 128) << SHIFT;

  for (let half = 0; half < 2; half += 1) {
    const startV = half === 0 ? v0 : v1;
    const endV = half === 0 ? v1 : v2;
    const segHeight = endV.y - startV.y;
    if (segHeight <= 0) continue;

    const dxShort = (((endV.x - startV.x) << SHIFT) / segHeight) | 0;
    const duShort = ((endV.u - startV.u) / segHeight) | 0;
    const dvShort = ((endV.v - startV.v) / segHeight) | 0;
    const drShort = ((((endV.r ?? 128) - (startV.r ?? 128)) << SHIFT) / segHeight) | 0;
    const dgShort = ((((endV.g ?? 128) - (startV.g ?? 128)) << SHIFT) / segHeight) | 0;
    const dbShort = ((((endV.b ?? 128) - (startV.b ?? 128)) << SHIFT) / segHeight) | 0;

    let xShort = startV.x << SHIFT, uShort = startV.u, vShort = startV.v;
    let rShort = (startV.r ?? 128) << SHIFT, gShort = (startV.g ?? 128) << SHIFT, bShort = (startV.b ?? 128) << SHIFT;

    const y0 = Math.max(0, startV.y); const y1 = Math.min(screenH, endV.y);
    const skipY = y0 - startV.y;
    if (skipY > 0) {
      xLong += dxLong * skipY; uLong += duLong * skipY; vLong += dvLong * skipY;
      rLong += drLong * skipY; gLong += dgLong * skipY; bLong += dbLong * skipY;
      xShort += dxShort * skipY; uShort += duShort * skipY; vShort += dvShort * skipY;
      rShort += drShort * skipY; gShort += dgShort * skipY; bShort += dbShort * skipY;
    }
    for (let y = y0; y < y1; y += 1) {
      if (y >= 0 && y < screenH) {
        let xl = xLong, xr = xShort, ul = uLong, ur = uShort, vl = vLong, vr = vShort;
        let rl = rLong, rr = rShort, gl = gLong, gr = gShort, bl = bLong, br = bShort;

        if (xl > xr) {
          let t = xl; xl = xr; xr = t;
          t = ul; ul = ur; ur = t; t = vl; vl = vr; vr = t;
          t = rl; rl = rr; rr = t; t = gl; gl = gr; gr = t; t = bl; bl = br; br = t;
        }

        const xStart = Math.max(0, ceilDiv(xl, ONE));
        const xEnd = Math.min(screenW, ceilDiv(xr, ONE));
        const span = (xr - xl) >> SHIFT;

        if (xEnd > xStart && span > 0) {
          const du = ((ur - ul) / span) | 0, dv = ((vr - vl) / span) | 0;
          const dr = ((rr - rl) / span) | 0, dg = ((gr - gl) / span) | 0, db = ((br - bl) / span) | 0;
          const preStep = BigInt((xStart << SHIFT) - xl);

          let u = ul + Number((BigInt(du) * preStep) >> 16n);
          let v = vl + Number((BigInt(dv) * preStep) >> 16n);
          let r = rl + Number((BigInt(dr) * preStep) >> 16n);
          let g = gl + Number((BigInt(dg) * preStep) >> 16n);
          let b = bl + Number((BigInt(db) * preStep) >> 16n);

          const rowOffset = y * screenW;
          const ditherRow = (y & 3) << 2;

          for (let x = xStart; x < xEnd; x += 1) {
            const tx = (u >> SHIFT) & uMask;
            const ty = (v >> SHIFT) & vMask;
            const texel = tex32[ty * texW + tx];
            const tr = texel & 0xFF;
            const tg = (texel >> 8) & 0xFF;
            const tb = (texel >> 16) & 0xFF;

            const dither = PS1_DITHER_4X4[ditherRow + (x & 3)];
            let outR = ((tr * (r >> SHIFT)) >> 7) + dither;
            let outG = ((tg * (g >> SHIFT)) >> 7) + dither;
            let outB = ((tb * (b >> SHIFT)) >> 7) + dither;

            outR = (outR < 0 ? 0 : outR > 255 ? 255 : outR) & 0xF8;
            outG = (outG < 0 ? 0 : outG > 255 ? 255 : outG) & 0xF8;
            outB = (outB < 0 ? 0 : outB > 255 ? 255 : outB) & 0xF8;

            const shaded = (255 << 24) | (outB << 16) | (outG << 8) | outR;
            const pixelIdx = rowOffset + x;
            buf32[pixelIdx] = blendMode >= 0
              ? blendPS1Pixel(buf32[pixelIdx], shaded, blendMode)
              : shaded;

            u += du; v += dv;
            r += dr; g += dg; b += db;
          }
        }
      }
      xLong += dxLong; uLong += duLong; vLong += dvLong;
      rLong += drLong; gLong += dgLong; bLong += dbLong;
      xShort += dxShort; uShort += duShort; vShort += dvShort;
      rShort += drShort; gShort += dgShort; bShort += dbShort;
    }
  }
}

export function renderPS1Mesh(buf32, w, h, mesh, mat3x3, camPos, focalQ16, tex32, texW, texH) {
  const halfW = w >> 1;
  const halfH = h >> 1;
  const projected = new Array(mesh.verts.length);

  for (let i = 0; i < mesh.verts.length; i += 1) {
    const v = mesh.verts.at(i);
    const rx = mulQ16(mat3x3.at(0), v.x) + mulQ16(mat3x3.at(1), v.y) + mulQ16(mat3x3.at(2), v.z) + camPos.x;
    const ry = mulQ16(mat3x3.at(3), v.x) + mulQ16(mat3x3.at(4), v.y) + mulQ16(mat3x3.at(5), v.z) + camPos.y;
    const rz = mulQ16(mat3x3.at(6), v.x) + mulQ16(mat3x3.at(7), v.y) + mulQ16(mat3x3.at(8), v.z) + camPos.z;

    if (rz <= ONE) {
      projected[i] = null;
      continue;
    }

    const sx = Number((BigInt(rx) * BigInt(focalQ16)) / BigInt(rz)) >> SHIFT;
    const sy = Number((BigInt(ry) * BigInt(focalQ16)) / BigInt(rz)) >> SHIFT;
    projected[i] = {
      x: (sx + halfW) | 0,
      y: (sy + halfH) | 0,
      z: rz,
      r: v.r ?? 128,
      g: v.g ?? 128,
      b: v.b ?? 128,
    };
  }

  const visibleTris = Array.of();
  for (let i = 0; i < mesh.tris.length; i += 1) {
    const t = mesh.tris.at(i);
    const p0 = projected.at(t.i0);
    const p1 = projected.at(t.i1);
    const p2 = projected.at(t.i2);
    if (!p0 || !p1 || !p2) continue;

    const cross = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
    if (cross >= 0) continue;

    const avgZ = ((p0.z + p1.z + p2.z) / 3) | 0;
    visibleTris.push({ t, p0, p1, p2, avgZ });
  }

  visibleTris.sort((a, b) => b.avgZ - a.avgZ);

for (let i = 0; i < visibleTris.length; i += 1) {
const { t, p0, p1, p2 } = visibleTris.at(i);
drawPS1GouraudTriangle(
buf32, w, h,
{ x: p0.x, y: p0.y, u: t.u0, v: t.v0, r: p0.r, g: p0.g, b: p0.b },
{ x: p1.x, y: p1.y, u: t.u1, v: t.v1, r: p1.r, g: p1.g, b: p1.b },
{ x: p2.x, y: p2.y, u: t.u2, v: t.v2, r: p2.r, g: p2.g, b: p2.b },
tex32, texW, texH,
t.blendMode ?? -1
);
}
}
// ============================================================================
// 3. GBA 2D PIPELINE (RGB555, MODE 7 AFFINE FLOOR, H-BLANK SCANLINE RIPPLE)
// ============================================================================
const BAYER_2X2 = Int8Array.of(-4, 2, 3, -1);
export function toGBA555(r, g, b, x = 0, y = 0) {
const dither = BAYER_2X2[((y & 1) << 1) + (x & 1)];
const r5 = Math.max(0, Math.min(255, r + dither)) & 0xF8;
const g5 = Math.max(0, Math.min(255, g + dither)) & 0xF8;
const b5 = Math.max(0, Math.min(255, b + dither)) & 0xF8;
return (255 << 24) | (b5 << 16) | (g5 << 8) | r5;
}
export function renderMode7Floor(buf32, w, h, horizonY, camX, camY, camZ, cosQ16, sinQ16, tex32, texSize) {
const mask = texSize - 1;
for (let y = horizonY + 1; y < h; y += 1) {
const rowDist = y - horizonY;
const zScale = ((camZ << 8) / rowDist) | 0;
const stepX = (cosQ16 * zScale) >> 16;
const stepY = (sinQ16 * zScale) >> 16;
let worldX = camX + (-(w >> 1) * stepX) - (sinQ16 * zScale);
let worldY = camY + (-(w >> 1) * stepY) + (cosQ16 * zScale);
const rowOffset = y * w;
for (let x = 0; x < w; x += 1) {
const tx = (worldX >> 16) & mask;
const ty = (worldY >> 16) & mask;
buf32[rowOffset + x] = tex32[ty * texSize + tx];
worldX += stepX;
worldY += stepY;
}
}
}
export function applyGBAHBlankWave(buf32, w, h, trig, frameTick, ampPx = 4, freq = 16, wrap = true) {
const rowScratch = new Uint32Array(w);
for (let y = 0; y < h; y += 1) {
const angle = (y * freq + frameTick * 8) & 1023;
const shiftX = (trig.sinQ16(angle) * ampPx) >> 16;
if (shiftX === 0) continue;
const rowStart = y * w;
rowScratch.set(buf32.subarray(rowStart, rowStart + w));
for (let x = 0; x < w; x += 1) {
let srcX = x + shiftX;
if (wrap) {
srcX %= w;
if (srcX < 0) srcX += w;
buf32[rowStart + x] = rowScratch[srcX];
} else {
const clampedX = srcX < 0 ? 0 : srcX >= w ? w - 1 : srcX;
buf32[rowStart + x] = rowScratch[clampedX];
}
}
}
}
// ============================================================================
// 4. PS1 SPU AUDIO ENGINE (4-BIT ADPCM CODEC, GAUSSIAN INTERPOLATOR, REVERB)
// ============================================================================
const PS1_K0 = Int16Array.of(0, 60, 115, 98, 122);
const PS1_K1 = Int16Array.of(0, 0, -52, -55, -60);
export function encodePS1ADPCM(pcm16) {
const numBlocks = Math.ceil(pcm16.length / 28);
const out = new Uint8Array(numBlocks * 16);
let hist1 = 0, hist2 = 0;
for (let b = 0; b < numBlocks; b += 1) {
let bestFilter = 0, bestShift = 0, minError = Infinity;
let bestNibbles = new Int8Array(28);
let bestH1 = hist1, bestH2 = hist2;
for (let f = 0; f < 5; f += 1) {
let maxDelta = 0, tH1 = hist1, tH2 = hist2;
for (let i = 0; i < 28; i += 1) {
const idx = b * 28 + i;
const sample = idx < pcm16.length ? pcm16[idx] : 0;
const pred = ((tH1 * PS1_K0[f] + tH2 * PS1_K1[f]) + 32) >> 6;
const delta = Math.abs(sample - pred);
if (delta > maxDelta) maxDelta = delta;
tH2 = tH1;
tH1 = sample;
}
let shift = 12;
while (shift > 0 && (maxDelta >> (12 - shift)) > 7) shift -= 1;
let err = 0;
tH1 = hist1; tH2 = hist2;
const nibbles = new Int8Array(28);
for (let i = 0; i < 28; i += 1) {
const idx = b * 28 + i;
const sample = idx < pcm16.length ? pcm16[idx] : 0;
const pred = ((tH1 * PS1_K0[f] + tH2 * PS1_K1[f]) + 32) >> 6;
const diff = sample - pred;
let nib = Math.round(diff / (1 << (12 - shift)));
nib = Math.max(-8, Math.min(7, nib));
nibbles[i] = nib;
const decoded = Math.max(-32768, Math.min(32767, pred + (nib << (12 - shift))));
const dErr = sample - decoded;
err += dErr * dErr;
tH2 = tH1;
tH1 = decoded;
}
if (err < minError) {
minError = err;
bestFilter = f;
bestShift = shift;
bestNibbles = nibbles;
bestH1 = tH1;
bestH2 = tH2;
}
}
hist1 = bestH1;
hist2 = bestH2;
const base = b * 16;
out[base] = (bestFilter << 4) | (bestShift & 0x0F);
out[base + 1] = (b === numBlocks - 1) ? 0x01 : 0x00;
for (let i = 0; i < 14; i += 1) {
const lo = bestNibbles[i * 2] & 0x0F;
const hi = bestNibbles[i * 2 + 1] & 0x0F;
out[base + 2 + i] = (hi << 4) | lo;
}
}
return out;
}
export function decodePS1ADPCMToInt16(adpcmBytes) {
const numBlocks = (adpcmBytes.length / 16) | 0;
const out = new Int16Array(numBlocks * 28);
let hist1 = 0, hist2 = 0;
for (let b = 0; b < numBlocks; b += 1) {
const base = b * 16;
const header = adpcmBytes[base];
const filter = (header >> 4) & 0x07;
const shift = header & 0x0F;
const k0 = PS1_K0[filter] || 0;
const k1 = PS1_K1[filter] || 0;
for (let i = 0; i < 28; i += 1) {
const byte = adpcmBytes[base + 2 + (i >> 1)];
let nib = (i & 1) === 0 ? (byte & 0x0F) : (byte >> 4);
if (nib >= 8) nib -= 16;
const pred = ((hist1 * k0 + hist2 * k1) + 32) >> 6;
const sample = Math.max(-32768, Math.min(32767, pred + (nib << (12 - shift))));
hist2 = hist1;
hist1 = sample;
out[b * 28 + i] = sample;
}
}
return out;
}
const SPU_GAUSS = (() => {
const table = new Int16Array(512);
for (let i = 0; i < 512; i += 1) {
const x = (i / 256.0) - 2.0;
table[i] = Math.round(Math.exp(-2.2 * x * x) * 20650);
}
return table;
})();
export function resamplePS1Gaussian(pcm16, pitchQ12, outputLength) {
const out = new Float32Array(outputLength);
let phase = 0;
const maxIdx = pcm16.length - 1;
for (let n = 0; n < outputLength; n += 1) {
const idx = phase >> 12;
if (idx >= maxIdx) break;
const frac = (phase >> 4) & 0xFF;
const s0 = pcm16[Math.max(0, idx - 1)];
const s1 = pcm16[idx];
const s2 = pcm16[Math.min(maxIdx, idx + 1)];
const s3 = pcm16[Math.min(maxIdx, idx + 2)];
let sum = (SPU_GAUSS[255 - frac] * s0) >> 15;
sum += (SPU_GAUSS[511 - frac] * s1) >> 15;
sum += (SPU_GAUSS[256 + frac] * s2) >> 15;
sum += (SPU_GAUSS[frac] * s3) >> 15;
const clamped = Math.max(-32768, Math.min(32767, sum));
out[n] = clamped / 32768.0;
phase += pitchQ12;
}
return out;
}
export function createPS1Reverb(ctx, decayTime = 1.4, wetMix = 0.35) {
const input = ctx.createGain();
const output = ctx.createGain();
const dry = ctx.createGain();
const wet = ctx.createGain();
dry.gain.value = 1.0 - wetMix;
wet.gain.value = wetMix;
const combDelays = Array.of(0.0297, 0.0371, 0.0411, 0.0437);
const combSum = ctx.createGain();
combSum.gain.value = 0.25;
combDelays.forEach((delaySec) => {
const delay = ctx.createDelay();
const feedback = ctx.createGain();
const lpf = ctx.createBiquadFilter();
delay.delayTime.value = delaySec;
feedback.gain.value = Math.min(0.38, Math.pow(0.001, delaySec / decayTime));
lpf.type = "lowpass";
lpf.frequency.value = 780;
input.connect(delay);
delay.connect(lpf);
lpf.connect(feedback);
feedback.connect(delay);
lpf.connect(combSum);
});
input.connect(dry);
dry.connect(output);
combSum.connect(wet);
wet.connect(output);
return { input, output };
}
// ============================================================================
// 5. GBA / DMG PSG CHIP & 4-BIT WAVETABLE SYNTHESIS (MUTE-BY-DEFAULT SAFE)
// ============================================================================
export class GBAPSGChip {
constructor(ctx) {
this.ctx = ctx;
this.master = ctx.createGain();
this.master.gain.value = 0.25;
const patterns = Array.of(
Float32Array.of(-1, -1, -1, -1, -1, -1, -1, 1),
Float32Array.of(1, -1, -1, -1, -1, -1, -1, 1),
Float32Array.of(1, -1, -1, -1, -1, 1, 1, 1),
Float32Array.of(-1, 1, 1, 1, 1, 1, 1, -1)
);
this.dutyBuffers = patterns.map((pat) => {
const buf = ctx.createBuffer(1, 8, ctx.sampleRate);
buf.getChannelData(0).set(pat);
return buf;
});
this.noise15Buf = this._buildLFSRBuffer(false);
this.noise7Buf = this._buildLFSRBuffer(true);
}
_buildLFSRBuffer(shortMode7Bit) {
const length = shortMode7Bit ? 127 : 32767;
const buf = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
const data = buf.getChannelData(0);
let lfsr = 0x7FFF;
for (let i = 0; i < length; i += 1) {
data[i] = (lfsr & 1) === 0 ? 1.0 : -1.0;
const xorBit = (lfsr & 1) ^ ((lfsr >> 1) & 1);
lfsr = (lfsr >> 1) | (xorBit << 14);
if (shortMode7Bit) {
lfsr = (lfsr & ~(1 << 6)) | (xorBit << 6);
}
}
return buf;
}
playPulse({ freq = 440, endFreq = null, duty = 1, volume = 12, decaySec = 0.25, durationSec = 0.3, time = this.ctx.currentTime } = {}) {
const src = this.ctx.createBufferSource();
src.buffer = this.dutyBuffers.at(duty & 3);
src.loop = true;
const baseFreq = this.ctx.sampleRate / 8;
src.playbackRate.setValueAtTime(freq / baseFreq, time);
if (endFreq !== null) {
src.playbackRate.exponentialRampToValueAtTime(Math.max(20, endFreq) / baseFreq, time + durationSec);
}
const env = this.ctx.createGain();
const peakGain = (Math.max(0, Math.min(15, volume)) / 15) * 0.5;
env.gain.setValueAtTime(peakGain, time);
env.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.02, decaySec));
src.connect(env);
env.connect(this.master);
src.start(time);
src.stop(time + durationSec);
}
playNoise({ clockHz = 8000, metallic7Bit = false, volume = 10, decaySec = 0.15, time = this.ctx.currentTime } = {}) {
const src = this.ctx.createBufferSource();
src.buffer = metallic7Bit ? this.noise7Buf : this.noise15Buf;
src.loop = true;
src.playbackRate.setValueAtTime(clockHz / this.ctx.sampleRate, time);
const env = this.ctx.createGain();
const peakGain = (Math.max(0, Math.min(15, volume)) / 15) * 0.5;
env.gain.setValueAtTime(peakGain, time);
env.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.015, decaySec));
src.connect(env);
env.connect(this.master);
src.start(time);
src.stop(time + decaySec);
}
}
