import {
  ONE,
  createDeterministicTrigLUT,
  buildRotationMatrixQ16,
  renderPS1Mesh,
  renderMode7Floor,
  applyGBAHBlankWave,
  encodePS1ADPCM,
  decodePS1ADPCMToInt16,
  resamplePS1Gaussian,
  createPS1Reverb,
  GBAPSGChip
} from "./retro-hw-pipeline.js";
import {
  generateWashiTexture,
  generateMarbleTexture,
  generateCausticWaterTexture,
  generateStarfieldTexture
} from "./retro-textures.js";

const W = 320;
const H = 240;
const HORIZON_Y = 136;
const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d", { alpha: false });
const imgData = ctx.createImageData(W, H);
const buf32 = new Uint32Array(imgData.data.buffer);
const hudEl = document.getElementById("hud");
const trig = createDeterministicTrigLUT();

const textures = {
  jade: generateMarbleTexture(128, trig, "jade", 202),
  marble: generateMarbleTexture(128, trig, "ivory", 205),
  washi: generateWashiTexture(128, 101),
  stars: generateStarfieldTexture(128, 404)
};
const waterTex = generateCausticWaterTexture(128, 303);
const skyTex = generateStarfieldTexture(128, 909);
let activeCrystalTex = textures.jade;

const U_MAX = 127 << 16;
function createCrystalMesh(blendMode = -1, brightnessScale = 1.0) {
  const b = (v) => Math.min(255, (v * brightnessScale) | 0);
  const verts = Array.of(
    { x: 0, y: -ONE, z: 0, r: b(240), g: b(250), b: b(255) },
    { x: 0, y: ONE, z: 0, r: b(90), g: b(140), b: b(220) },
    { x: -ONE, y: 0, z: 0, r: b(110), g: b(235), b: b(190) },
    { x: 0, y: 0, z: ONE, r: b(220), g: b(160), b: b(255) },
    { x: ONE, y: 0, z: 0, r: b(255), g: b(210), b: b(130) },
    { x: 0, y: 0, z: -ONE, r: b(80), g: b(180), b: b(210) }
  );
  const tris = Array.of(
    { i0: 0, i1: 2, i2: 3, u0: U_MAX >> 1, v0: 0, u1: 0, v1: U_MAX, u2: U_MAX, v2: U_MAX, blendMode },
    { i0: 0, i1: 3, i2: 4, u0: U_MAX >> 1, v0: 0, u1: 0, v1: U_MAX, u2: U_MAX, v2: U_MAX, blendMode },
    { i0: 0, i1: 4, i2: 5, u0: U_MAX >> 1, v0: 0, u1: 0, v1: U_MAX, u2: U_MAX, v2: U_MAX, blendMode },
    { i0: 0, i1: 5, i2: 2, u0: U_MAX >> 1, v0: 0, u1: 0, v1: U_MAX, u2: U_MAX, v2: U_MAX, blendMode },
    { i0: 1, i1: 3, i2: 2, u0: U_MAX >> 1, v0: U_MAX, u1: U_MAX, v1: 0, u2: 0, v2: 0, blendMode },
    { i0: 1, i1: 4, i2: 3, u0: U_MAX >> 1, v0: U_MAX, u1: U_MAX, v1: 0, u2: 0, v2: 0, blendMode },
    { i0: 1, i1: 5, i2: 4, u0: U_MAX >> 1, v0: U_MAX, u1: U_MAX, v1: 0, u2: 0, v2: 0, blendMode },
    { i0: 1, i1: 2, i2: 5, u0: U_MAX >> 1, v0: U_MAX, u1: U_MAX, v1: 0, u2: 0, v2: 0, blendMode }
  );
  return { verts, tris };
}

const solidCrystal = createCrystalMesh(-1, 1.0);
const auraCrystal = createCrystalMesh(1, 0.45);

let audioCtx = null;
let psg = null;
let reverb = null;
let sensoryFilter = null;
let adpcmBellPCM = null;
let audioEnabled = false;
let sensoryFilterOn = true;
let seqTimer = null;

const YO_SCALE_HZ = Array.of(293.66, 329.63, 392.00, 440.00, 493.88, 587.33, 659.25);
const YO_PITCH_Q12 = Array.of(0x1000, 0x11F6, 0x1555, 0x1800, 0x1AE9, 0x2000, 0x23EC);

function initAudio() {
  if (audioCtx) return;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  audioCtx = new Ctor();
  psg = new GBAPSGChip(audioCtx);
  reverb = createPS1Reverb(audioCtx, 1.8, 0.42);
  sensoryFilter = audioCtx.createBiquadFilter();
  sensoryFilter.type = "lowpass";
  sensoryFilter.frequency.value = sensoryFilterOn ? 780 : 18000;

  psg.master.connect(reverb.input);
  const limiter = audioCtx.createDynamicsCompressor();
  limiter.threshold.value = -18;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.15;
  reverb.output.connect(sensoryFilter);
  sensoryFilter.connect(limiter);
  limiter.connect(audioCtx.destination);

  const sampleRate = 22050;
  const len = Math.floor(sampleRate * 1.2);
  const rawPCM = new Int16Array(len);
  for (let i = 0; i < len; i += 1) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 4.2);
    const wave = Math.sin(2 * Math.PI * 293.66 * t) * 0.7 +
                 Math.sin(2 * Math.PI * 587.33 * t) * 0.3 * Math.exp(-t * 8.0);
    rawPCM[i] = Math.max(-32768, Math.min(32767, (wave * env * 24000) | 0));
  }
  adpcmBellPCM = decodePS1ADPCMToInt16(encodePS1ADPCM(rawPCM));
}

function playADPCMBell(pitchQ12 = 0x1000) {
  if (!audioCtx || !audioEnabled || !adpcmBellPCM) return;
  const outLen = Math.min(audioCtx.sampleRate * 1.5, ((adpcmBellPCM.length * 0x1000) / pitchQ12) | 0);
  const floatBuf = resamplePS1Gaussian(adpcmBellPCM, pitchQ12, outLen);
  const audioBuf = audioCtx.createBuffer(1, floatBuf.length, 22050);
  audioBuf.getChannelData(0).set(floatBuf);
  const src = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  gain.gain.value = 0.28;
  src.buffer = audioBuf;
  src.connect(gain);
  gain.connect(reverb.input);
  src.start();
}

let stepIdx = 0;
function startSequencer() {
  if (seqTimer) clearInterval(seqTimer);
  seqTimer = setInterval(() => {
    if (!audioEnabled || !audioCtx) return;
    const note = (stepIdx * 3 + (stepIdx >> 2)) % YO_SCALE_HZ.length;
    psg.playPulse({ freq: YO_SCALE_HZ.at(note), duty: 0, volume: 7, decaySec: 0.35, durationSec: 0.4 });
    if (stepIdx % 4 === 0) {
      playADPCMBell(YO_PITCH_Q12.at(note));
      psg.playNoise({ clockHz: 4200, metallic7Bit: true, volume: 4, decaySec: 0.08 });
    }
    stepIdx += 1;
  }, 420);
}

let rippleOn = true;
let auraOn = true;
let motionOn = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
let frameTick = 0;

const btnAudio = document.getElementById("btnAudio");
const btnFilter = document.getElementById("btnFilter");
const btnMotion = document.getElementById("btnMotion");
const btnChime = document.getElementById("btnChime");
const btnRipple = document.getElementById("btnRipple");
const btnAura = document.getElementById("btnAura");
const selTex = document.getElementById("selTex");

const toggleAudio = async () => {
  initAudio();
  if (audioCtx.state === "suspended") await audioCtx.resume();
  audioEnabled = !audioEnabled;
  btnAudio.textContent = audioEnabled ? "Mute Audio (M)" : "Unmute Audio (M)";
  btnAudio.classList.toggle("active", audioEnabled);
  if (audioEnabled) {
    startSequencer();
    playADPCMBell(0x1000);
  }
};

const toggleFilter = () => {
  sensoryFilterOn = !sensoryFilterOn;
  btnFilter.textContent = sensoryFilterOn ? "NDH Sensory Filter <=780Hz: ON" : "NDH Sensory Filter <=780Hz: OFF (Raw)";
  btnFilter.classList.toggle("active", sensoryFilterOn);
  if (sensoryFilter && audioCtx) {
    sensoryFilter.frequency.setValueAtTime(sensoryFilterOn ? 780 : 18000, audioCtx.currentTime);
  }
};

const toggleMotion = () => {
  motionOn = !motionOn;
  btnMotion.textContent = motionOn ? "Motion: Playing (Space)" : "Motion: Paused (Space)";
  btnMotion.classList.toggle("active", motionOn);
};

btnAudio.addEventListener("click", toggleAudio);
btnFilter.addEventListener("click", toggleFilter);
btnMotion.addEventListener("click", toggleMotion);
btnChime.addEventListener("click", () => {
  if (!audioEnabled) return;
  playADPCMBell(YO_PITCH_Q12.at(frameTick % YO_PITCH_Q12.length));
});
btnRipple.addEventListener("click", () => {
  rippleOn = !rippleOn;
  btnRipple.textContent = rippleOn ? "H-Blank Ripple: ON (R)" : "H-Blank Ripple: OFF (R)";
  btnRipple.classList.toggle("active", rippleOn);
});
btnAura.addEventListener("click", () => {
  auraOn = !auraOn;
  btnAura.textContent = auraOn ? "PS1 Additive Aura: ON (G)" : "PS1 Additive Aura: OFF (G)";
  btnAura.classList.toggle("active", auraOn);
});
selTex.addEventListener("change", (e) => {
  activeCrystalTex = textures[e.target.value];
});

window.addEventListener("keydown", (ev) => {
  if (ev.key === "m" || ev.key === "M") toggleAudio();
  else if (ev.key === " ") { ev.preventDefault(); toggleMotion(); }
  else if (ev.key === "r" || ev.key === "R") btnRipple.click();
  else if (ev.key === "g" || ev.key === "G") btnAura.click();
  else if (ev.key === "t" || ev.key === "T") {
    selTex.selectedIndex = (selTex.selectedIndex + 1) % selTex.options.length;
    activeCrystalTex = textures[selTex.value];
  }
});

function renderFrame() {
  const skyScroll = (frameTick >> 2) & 127;
  for (let y = 0; y <= HORIZON_Y; y += 1) {
    const rowOff = y * W;
    const ty = (y & 127) << 7;
    for (let x = 0; x < W; x += 1) {
      buf32[rowOff + x] = skyTex[ty + ((x + skyScroll) & 127)];
    }
  }


const seaAngle = (frameTick * 1) & 1023;
const camX = (frameTick * 14000) | 0;
const camY = (frameTick * 22000) | 0;
renderMode7Floor(
buf32, W, H, HORIZON_Y,
camX, camY, 28 << 16,
trig.cosQ16(seaAngle), trig.sinQ16(seaAngle),
waterTex, 128
);
if (rippleOn) {
const waterSlice = buf32.subarray((HORIZON_Y + 1) * W);
applyGBAHBlankWave(waterSlice, W, H - HORIZON_Y - 1, trig, frameTick, 3, 24, true);
}
const rx = (frameTick * 3) & 1023;
const ry = (frameTick * 5) & 1023;
const rz = (trig.sinQ16((frameTick * 2) & 1023) >> 10);
const bobY = (trig.sinQ16((frameTick * 6) & 1023) >> 3) - (10 << 16);
const mat = buildRotationMatrixQ16(rx, ry, rz, trig);
const camPos = { x: 0, y: bobY, z: 3 << 16 };
const focalQ16 = 220 << 16;
renderPS1Mesh(buf32, W, H, solidCrystal, mat, camPos, focalQ16, activeCrystalTex, 128, 128);
if (auraOn) {
const auraMat = new Int32Array(9);
for (let i = 0; i < 9; i += 1) auraMat[i] = ((mat.at(i) * 5) >> 2) | 0;
renderPS1Mesh(buf32, W, H, auraCrystal, auraMat, camPos, focalQ16, textures.stars, 128, 128);
}
ctx.putImageData(imgData, 0, 0);
if ((frameTick & 15) === 0) {
hudEl.textContent =
"Frame: " + frameTick +
" | Native Res: 320x240 | Fixed-Point: Q16.16 | Audio: " +
(audioEnabled ? "Active" : "Muted");
}
if (motionOn) frameTick += 1;
requestAnimationFrame(renderFrame);
}
requestAnimationFrame(renderFrame);
