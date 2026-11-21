/**
• src/retro-textures.js
• Deterministic, zero-float procedural texture generators (Uint32Array, RGB555)
• for retro-hw-pipeline.js & ndh-game-dev-kit.
*/
function hash2D(x, y, mask, seed = 1337) {
let h = ((x & mask) * 374761393 + (y & mask) * 668265263 + seed * 1442695041) | 0;
h = Math.imul(h ^ (h >>> 13), 1274126177);
return ((h ^ (h >>> 16)) >>> 24) & 0xFF;
}
function tileableValueNoise(x, y, size, freqShift, seed) {
const step = 1 << freqShift;
const gridMask = (size >> freqShift) - 1;
const gx = x >> freqShift;
const gy = y >> freqShift;
const fx = x & (step - 1);
const fy = y & (step - 1);
const tx = (fx << 8) >> freqShift;
const ty = (fy << 8) >> freqShift;
const sx = (tx * tx * (768 - 2 * tx)) >> 16;
const sy = (ty * ty * (768 - 2 * ty)) >> 16;
const c00 = hash2D(gx, gy, gridMask, seed);
const c10 = hash2D(gx + 1, gy, gridMask, seed);
const c01 = hash2D(gx, gy + 1, gridMask, seed);
const c11 = hash2D(gx + 1, gy + 1, gridMask, seed);
const top = c00 + (((c10 - c00) * sx) >> 8);
const bot = c01 + (((c11 - c01) * sx) >> 8);
return top + (((bot - top) * sy) >> 8);
}
function tileableFBM(x, y, size, octaves = 3, seed = 42) {
let total = 0;
let amp = 128;
let norm = 0;
for (let o = 0; o < octaves; o += 1) {
const freqShift = Math.max(1, 5 - o);
total += (tileableValueNoise(x, y, size, freqShift, seed + o * 97) * amp) >> 8;
norm += amp;
amp >>= 1;
}
return ((total << 8) / norm) | 0;
}
function packRGB555(r, g, b) {
const r5 = (r < 0 ? 0 : r > 255 ? 255 : r) & 0xF8;
const g5 = (g < 0 ? 0 : g > 255 ? 255 : g) & 0xF8;
const b5 = (b < 0 ? 0 : b > 255 ? 255 : b) & 0xF8;
return (255 << 24) | (b5 << 16) | (g5 << 8) | r5;
}
export function generateWashiTexture(size = 128, seed = 101) {
const tex = new Uint32Array(size * size);
for (let y = 0; y < size; y += 1) {
for (let x = 0; x < size; x += 1) {
const grain = tileableFBM(x, y, size, 3, seed);
const fiber = tileableValueNoise(x >> 2, y << 1, size, 2, seed + 55);
const fiberSpike = fiber > 215 ? (fiber - 215) >> 1 : 0;
const base = 216 + ((grain - 128) >> 2) - fiberSpike;
tex[y * size + x] = packRGB555(base + 12, base + 4, base - 16);
}
}
return tex;
}
export function generateMarbleTexture(size = 128, trig, tint = "jade", seed = 202) {
const tex = new Uint32Array(size * size);
const shift = Math.log2(size) | 0;
for (let y = 0; y < size; y += 1) {
for (let x = 0; x < size; x += 1) {
const turb = tileableFBM(x, y, size, 3, seed);
const phase = (((x + y) << (10 - shift)) + (turb << 2)) & 1023;
const vein = Math.abs(trig.sinQ16(phase)) >> 8;
if (tint === "jade") {
tex[y * size + x] = packRGB555(32 + (vein >> 2), 96 + (vein >> 1), 88 + (vein >> 1));
} else {
const v = 90 + ((vein * 155) >> 8);
tex[y * size + x] = packRGB555(v, v, v + 8);
}
}
}
return tex;
}
export function generateCausticWaterTexture(size = 128, seed = 303) {
const tex = new Uint32Array(size * size);
for (let y = 0; y < size; y += 1) {
for (let x = 0; x < size; x += 1) {
const n1 = tileableFBM(x, y, size, 3, seed);
const n2 = tileableFBM(size - 1 - x, (y + (size >> 1)) & (size - 1), size, 3, seed + 77);
const ridge = 255 - Math.min(255, Math.abs(n1 - n2) * 3);
const gleam = (ridge * ridge) >> 8;
const r = 16 + (gleam >> 1);
const g = 72 + ((gleam * 160) >> 8);
const b = 136 + ((gleam * 115) >> 8);
tex[y * size + x] = packRGB555(r, g, b);
}
}
return tex;
}
export function generateStarfieldTexture(size = 128, seed = 404) {
const tex = new Uint32Array(size * size);
const mask = size - 1;
for (let y = 0; y < size; y += 1) {
for (let x = 0; x < size; x += 1) {
const nebula = tileableFBM(x, y, size, 3, seed);
const starHash = hash2D(x, y, mask, seed + 999);
if (starHash > 251) {
const bright = 200 + ((starHash - 251) * 13);
const warm = (starHash & 1) === 0;
tex[y * size + x] = packRGB555(bright, bright - (warm ? 8 : 0), warm ? bright - 32 : bright);
} else {
const dust = nebula > 128 ? (nebula - 128) >> 1 : 0;
tex[y * size + x] = packRGB555(8 + (dust >> 1), 10 + (dust >> 2), 28 + dust);
}
}
}
return tex;
}
