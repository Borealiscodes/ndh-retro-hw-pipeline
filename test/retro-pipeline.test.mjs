import test from "node:test";
import assert from "node:assert/strict";
import {
ONE,
createDeterministicTrigLUT,
buildRotationMatrixQ16,
encodePS1ADPCM,
decodePS1ADPCMToInt16,
} from "../src/retro-hw-pipeline.js";
import {
generateWashiTexture,
generateMarbleTexture,
generateCausticWaterTexture,
generateStarfieldTexture,
} from "../src/retro-textures.js";
test("1. Deterministic Q16.16 trig LUT and identity rotation matrix hold exact fixed-point invariants", () => {
const trig = createDeterministicTrigLUT();
assert.equal(trig.sinQ16(0), 0);
assert.equal(trig.sinQ16(256), ONE);
assert.equal(trig.cosQ16(0), ONE);
const id = buildRotationMatrixQ16(0, 0, 0, trig);
assert.equal(id.at(0), ONE);
assert.equal(id.at(4), ONE);
assert.equal(id.at(8), ONE);
});
test("2. Procedural RGB555 textures generate deterministic power-of-2 Uint32Array buffers", () => {
const trig = createDeterministicTrigLUT();
assert.equal(generateWashiTexture(64).length, 4096);
assert.equal(generateMarbleTexture(64, trig, "jade").length, 4096);
assert.equal(generateCausticWaterTexture(64).length, 4096);
assert.equal(generateStarfieldTexture(64).length, 4096);
});
test("3. PS1 4-bit ADPCM codec round-trips 16-bit PCM blocks cleanly", () => {
const pcm = new Int16Array(56);
for (let i = 0; i < 56; i += 1) {
pcm[i] = Math.round(Math.sin(i * 0.25) * 16000);
}
const encoded = encodePS1ADPCM(pcm);
assert.equal(encoded.length, 32); // 2 blocks x 16 bytes
const decoded = decodePS1ADPCMToInt16(encoded);
assert.equal(decoded.length, 56);
assert.ok(Math.abs(decoded.at(10) - pcm.at(10)) < 1500);
});

test("4. 3D PS1 mesh rasterizes front-facing Gouraud triangles into framebuffer", () => {
  const trig = createDeterministicTrigLUT();
  const buf = new Uint32Array(64 * 64);
  const tex = generateWashiTexture(16);
  const mesh = {
    verts: Array.of(
      { x: 0, y: -ONE, z: 0, r: 255, g: 255, b: 255 },
      { x: -ONE, y: ONE, z: 0, r: 200, g: 240, b: 255 },
      { x: ONE, y: ONE, z: 0, r: 255, g: 220, b: 180 }
    ),
    tris: Array.of(
      { i0: 0, i1: 1, i2: 2, u0: 0, v0: 0, u1: 0, v1: 15 << 16, u2: 15 << 16, v2: 15 << 16, blendMode: -1 }
    )
  };
  const mat = buildRotationMatrixQ16(0, 0, 0, trig);
  renderPS1Mesh(buf, 64, 64, mesh, mat, { x: 0, y: 0, z: 3 << 16 }, 64 << 16, tex, 16, 16);
  let litPixels = 0;
  for (let i = 0; i < buf.length; i += 1) {
    if (buf[i] !== 0) litPixels += 1;
  }
  assert.ok(litPixels > 50);
});
