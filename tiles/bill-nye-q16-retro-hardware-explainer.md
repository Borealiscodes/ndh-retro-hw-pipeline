# How Can 14 KB of Pure Integer Math Paint a 3D Crystal Over a Rippling Sea—With Zero Image or Audio Files?

**Plain-Language Explainer Tile (Altitude A7)**  
**Companion Software:** `Borealiscodes/ndh-retro-hw-pipeline` (`commit 21dcfda`)  
**Author:** Borealis Serenity Hedling (`NDH-RESEARCH-PILOT` • Dublin 8, Ireland)  
**Date:** November 21, 2026  

---

## Wait—Where Are the `.png` Textures and `.wav` Sound Files?

There aren't any! Every starry pixel, every ripple on the water, every vein in the spinning jade crystal, and every chime of the temple bell in **NDH Retro Hardware Playground** is cooked from scratch using **whole numbers (`integers`)** the moment the page opens!

---

## Trick 1: `Q16.16` Fixed-Point Math (Why Decimals Are Banned!)

Normal computer decimals (`0.1 + 0.2 = 0.30000000000000004`) have tiny rounding quirks that can drift across different phones and laptops.

Instead, our retro engine uses **`Q16.16` Fixed-Point Math**:
* Imagine multiplying every number by **`65,536` (`2^16`)** before doing any math.
* Half a pixel (`0.5`) becomes **`32,768`**. One whole unit (`1.0`) becomes **`65,536`**.
* Because the CPU only adds, subtracts, and bit-shifts whole integers (`>> 16`), **Frame `1904` on your Android tablet draws the exact same `76,800` pixels as Frame `1904` on any computer in the world!**

---

## Trick 2: How a 1990s Game Boy Advance Fakes a 3D Ocean (`Mode 7` + `H-Blank`)

The original Game Boy Advance didn't have a 3D graphics chip—so programmers invented **Mode 7**:
1. **Perspective Floor (`renderMode7Floor`):** For every horizontal scanline below the horizon, the code calculates how far away that line is (`zScale`), and stretches a flat `128×128` caustic water tile wider as it gets closer to the bottom of the screen!
2. **H-Blank Scanline Ripple (`applyGBAHBlankWave`):** Right after the virtual screen finishes drawing each horizontal line (the "Horizontal Blank" pause), it nudges that row a few pixels left or right using a sine wave—turning a flat sheet of water into shimmering waves!

---

## Trick 3: How a 1994 PlayStation Shades a 3D Crystal (`Gouraud` + `4×4 Dither`)

Above the horizon floats an 8-sided 3D crystal built like a 1994 PlayStation (PS1) object:
* **Gouraud Vertex Lighting:** Each of the crystal's 6 corners gets its own RGB color (icy cyan on top, mint jade on the left, warm gold on the right), and the rasterizer smoothly blends those colors across every triangle.
* **4×4 Ordered Bayer Dithering & `RGB555`:** Old consoles couldn't display 16 million colors—they only had **32,768 colors (`RGB555`)**. To hide blocky color bands, the engine adds a tiny `4×4` checkerboard pattern (`PS1_DITHER_4X4`) to every pixel so smooth gradients fool your eye!
* **100% Additive Glow (`blendMode = 1`):** When you turn on **PS1 Additive Aura (`G`)**, a slightly larger starfield crystal adds its brightness straight on top of whatever is behind it—creating a translucent cosmic halo with zero alpha-channel slowdowns!

---

## Trick 4: Why the Audio Sounds Warm Instead of Piercing (`<= 780 Hz` + Brick-Wall Limiter)

Retro game chips used square pulses (`12.5%` duty cycle) and metallic `7-bit` shift-register noise (`LFSR`) that can sound harsh and piercing on modern speakers—especially for neurodivergent ears.

To keep the sound warm and safe:
1. **4-Bit PS1 ADPCM & Gaussian Smoothing:** The temple bell is compressed down to 4 bits per sample (`encodePS1ADPCM`) and smoothed back out with a 4-tap Gaussian bell curve (`SPU_GAUSS`)—just like a real PlayStation SPU chip!
2. **Damped Reverb + Brick-Wall Limiter:** Four short echo loops (`createPS1Reverb`) have their feedback capped at `0.38` and filtered below `780 Hz` so echoes never screech or run away, finished with a **`DynamicsCompressorNode` brick-wall limiter** that keeps volume rock-steady!

---

**Provenance & License:**  
`Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>` • Creative Commons Attribution 4.0 International (`CC-BY-4.0`) / MIT License.
