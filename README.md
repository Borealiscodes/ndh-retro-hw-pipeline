# 🎮 NDH Retro Hardware Pipeline (`Q16.16` PS1 3D + GBA 2D + Hybrid Audio)

**A zero-dependency, deterministic `Q16.16` fixed-point PlayStation 1 3D + Game Boy Advance 2D + hybrid SPU/PSG hardware emulation suite (`320×240` software framebuffer, `RGB555` procedural textures, `0 KB` external image or audio files) built for sensory-safe, replay-deterministic indie and contemplative game development.**

[![License: MIT](https://shields.io)](LICENSE)
[![Tests: 4/4 Passing](https://shields.io)](test/retro-pipeline.test.mjs)
[![Sensory Limiter: <= 780 Hz + Brick-Wall](https://shields.io)](src/playground-app.js)

---

## 📖 Companion Research Preprint & Plain-Language Explainer Tile

* **Preprint #5 (Deterministic `Q16.16` PS1/GBA Hybrid Rendering, Brick-Wall Sensory Limiting & Game Design Pathways):** [`docs/deterministic-q16-retro-hardware-pipeline-and-game-design-preprint.md`](docs/deterministic-q16-retro-hardware-pipeline-and-game-design-preprint.md)
* **Plain-Language Explainer Tile (`Altitude A7`):** [`tiles/bill-nye-q16-retro-hardware-explainer.md`](tiles/bill-nye-q16-retro-hardware-explainer.md)

---

## 🎛️ Core Architecture & Technical Primitives

### 1. Deterministic `Q16.16` Raster & Math Engine (`src/retro-hw-pipeline.js`)
* **Zero-Float Trigonometry & Matrices:** 1024-brad `Int32Array` lookup tables (`createDeterministicTrigLUT`) and `BigInt`-backed `Q16.16` matrix multiplication (`mulQ16`, `buildRotationMatrixQ16`) guarantee bit-exact framebuffer determinism across devices.
* **PS1 GPU Pipeline:** Software affine-mapped triangle rasterizer (`drawPS1GouraudTriangle`, `renderPS1Mesh`) featuring per-vertex RGB Gouraud shading, `4×4` ordered Bayer dithering (`PS1_DITHER_4X4`), `RGB555` color quantization, Y-down screen-space backface culling, and four semi-transparency blend modes (`50/50`, `100% Additive`, `100% Subtractive`, `100% + 25%`).
* **GBA 2D Scanline Pipeline:** Perspective Mode 7 floor projection (`renderMode7Floor`) paired with per-scanline H-Blank horizontal wave distortion (`applyGBAHBlankWave`).
* **Hybrid PS1 SPU + GBA PSG Audio:** Full 4-bit PS1 ADPCM block encoder/decoder (`encodePS1ADPCM` / `decodePS1ADPCMToInt16`), 4-tap Gaussian pitch interpolator (`resamplePS1Gaussian`), damped Schroeder comb reverb (`createPS1Reverb`), and GBA 4-channel pulse + `7-bit`/`15-bit` LFSR noise synthesis (`GBAPSGChip`).

### 2. Zero-Asset Procedural `RGB555` Textures (`src/retro-textures.js`)
Generates seamless `128×128` `Uint32Array` textures at boot using multi-octave integer Fractional Brownian Motion (`tileableFBM`):
* **Veined Jade & Ivory Temple Marble** (`generateMarbleTexture`)
* ***Washi* Parchment & Mulberry Fibers** (`generateWashiTexture`)
* **Cellular Caustic Water Ripples** (`generateCausticWaterTexture`)
* **Starfield & Indigo Nebula Dust** (`generateStarfieldTexture`)

### 3. Neurodivergent Sensory Guardrails (`index.html` & `src/playground-app.js`)
* **Mute-by-Default Initialization:** Audio remains silent until explicitly toggled (**`M`** or **`Unmute Audio`**).
* **Brick-Wall Limited `<= 780 Hz` NDH Sensory Filter:** Routes the hybrid PSG + ADPCM + damped reverb bus through a toggleable **`780 Hz` biquad low-pass filter** and a **`DynamicsCompressorNode` brick-wall limiter** (`-18 dB` threshold, `20:1` ratio) to prevent harsh treble spikes or comb-filter runaway.
* **Reduced-Motion & Keyboard First:** Respects `prefers-reduced-motion` on boot and supports **`Space`** (Pause/Resume Motion), **`T`** (Cycle Textures), **`R`** (Toggle H-Blank Ripple), and **`G`** (Toggle PS1 Additive Aura) with `aria-live="polite"` HUD telemetry.

---

## 🚀 Quickstart & Verification

```bash
# 1. Run deterministic trig, texture, ADPCM codec & 3D rasterizer tests (4/4 passing)
node --test test/retro-pipeline.test.mjs

# 2. Launch locally over IPv4 in Chrome / Firefox
python3 -m http.server 8094 --bind 127.0.0.1
```

Open **`http://127.0.0.1:8094`** in your browser to interact with the spinning Gouraud-shaded crystal over the Mode 7 caustic sea.

---

## 🤝 Research Lineage & Provenance

Part of the open contemplative and deterministic game-systems series by **Borealis Serenity Hedling** ([`Borealiscodes`](https://github.com) • `NDH-RESEARCH-PILOT` • Dublin 8, Ireland • ORCID: [`0009-0004-7968-5707`](https://orcid.org)):
* **Zenodo Preprints & Datasets:** [`10.5281/zenodo.24240994`](https://doi.org) • [`10.5281/zenodo.24393275`](https://doi.org) • [`10.5281/zenodo.24399123`](https://doi.org)
* **Ecosystem Toolkits:** [`ndh-game-dev-kit`](https://github.com/ndh-game-dev-kit) • [`ndh-acoustic-math-toys`](https://github.com/ndh-acoustic-math-toys)

**License:** MIT License • `Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>`
