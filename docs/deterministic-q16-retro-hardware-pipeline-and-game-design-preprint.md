# Deterministic Nostalgia Without Floating-Point Drift: Hybrid Q16.16 PS1/GBA Software Rendering, Sensory-Safe Chip Audio, and Accessible Retro Game Design Paths

**Preprint & Software Companion:** `Borealiscodes/ndh-retro-hw-pipeline` (`commit 21dcfda`)  
**Author:** Borealis Serenity Hedling (`NDH-RESEARCH-PILOT` • Dublin 8, Ireland)  
**ORCID:** [`0009-0004-7968-5707`](https://orcid.org)  
**Series Lineage & Empirical Anchors:**  
* **Preprint 1:** Hedling, B. S. (2026a). *Non-Dual Epistemic Architectures and Geometric Stabilization in High-Dimensional Transformer Systems (v3.1)*. Zenodo. [`DOI: 10.5281/zenodo.24240994`](https://doi.org)  
* **Preprint 2:** Hedling, B. S. (2026b). *Beyond Bolted-On Screen Readers: Narrative Phenomenology, the RNIB Roundhouse Sensory Dark, and Perceptual-Cognitive Unity (Rasa-Darśan)*. Zenodo. [`DOI: 10.5281/zenodo.24393275`](https://doi.org)  
* **Empirical TTS Dataset:** Hedling, B. S. (2026c). *From Robotic Screen-Reader Telemetry to Embodied Neural Cadence: A Narrative & Empirical Chronicle of Guardrails, CLI Flag Literalism, and Dual-Voice VITS Synthesis Under Edge Constraints*. Zenodo. [`DOI: 10.5281/zenodo.24399123`](https://doi.org)  
* **Preprint 3:** Hedling, B. S. (2026d). *Defaulting to Mute vs. Designing for Acoustic Presence: Neurodivergent Sensory Regulation, Embodied Neural Narration, and the Four Non-Dual Koans* (`Borealiscodes/Zen-Parable-Embodied-Voice-Edition`).  
* **Preprint 4:** Hedling, B. S. (2026e). *Between Freehand Brush Geometry and Non-Visual Parity: Technical Primitives, Canvas Accessibility Limits, and Lessons from Multi-Sensory Game Design* (`Borealiscodes/Zen-Shodo-Koan-Brush-Sanctuary`).  
* **Preprint 5 (This Manuscript):** Deterministic `Q16.16` PS1/GBA Hybrid Rendering, Brick-Wall Sensory Limiting, and Game Design Pathways (`Borealiscodes/ndh-retro-hw-pipeline`).  
**Date:** November 21, 2026  

---

## Abstract

Modern browser game engines routinely rely on multi-megabyte WebGL shaders, non-deterministic IEEE-754 floating-point math, and unfiltered digital audio graphs that can trigger harsh treble fatigue or runaway feedback spikes for neurodivergent players. In this fifth installment of our contemplative and accessible systems series, we present `Borealiscodes/ndh-retro-hw-pipeline` (`commit 21dcfda`): a zero-dependency, `320×240` software framebuffer and procedural audio synthesizer built entirely in deterministic `Q16.16` fixed-point arithmetic (`BigInt` / `Int32Array` / `Uint32Array`). By uniting PlayStation 1 (PS1) Gouraud-shaded affine triangle rasterization (`4×4` ordered Bayer dithering, `RGB555` color quantization, and semi-transparency blending) with Game Boy Advance (GBA) Mode 7 perspective floor projection, H-Blank per-scanline horizontal ripple, 4-bit PS1 ADPCM encoding/decoding, Gaussian sample interpolation, and GBA programmable sound generator (PSG) synthesis under a brick-wall `<= 780 Hz` sensory low-pass filter, this compact prototype demonstrates how mid-1990s hardware constraints unlock cross-platform determinism, replay verification, and calm neurodivergent play.

---

## 1. What This Odd Little Retro Pipeline Actually Proves

At first glance, rendering a spinning jade-veined octahedron crystal over a rippling Mode 7 sea at `320×240` native resolution inside a modern browser looks like pure retro nostalgia. Underneath the surface, however, the architecture proves four concrete engineering principles:

1. **Bit-Exact Determinism Without External Assets (`0 KB` Textures & Audio Files):**  
   Every pixel in the skybox, caustic sea, and 3D crystal—and every sample in the ADPCM temple bell and PSG pulse sequencer—is synthesized mathematically at boot using 1024-brad Bhāskara-derived `Q16.16` sine/cosine lookup tables (`createDeterministicTrigLUT`), integer Fractional Brownian Motion (`tileableFBM`), and deterministic Linear Feedback Shift Registers (`7-bit` and `15-bit` LFSRs). Because zero floating-point rounding occurs during rasterization or procedural generation, Frame `1904` on an Android tablet produces the exact same `Uint32Array` framebuffer bit-for-bit as Frame `1904` on a desktop workstation.
2. **Authentic Cross-Era Hardware Hybridization (`PS1 + GBA`):**  
   Real 1990s consoles forced designers to pair distinct hardware strengths: the GBA excelled at affine 2D scanline tricks (Mode 7 perspective planes and H-Blank horizontal wave distortion), while the PS1 pioneered untextured/affine-textured 3D polygons with per-vertex Gouraud RGB lighting, `4×4` ordered dithering, and `100%` additive transparency (`blendMode = 1`). Combining both inside a single `76,800`-pixel (`320×240`) `Uint32Array` software buffer yields an expressive visual language impossible on either original chip alone—without requiring GPU drivers or WebGL context recovery.
3. **Empirical Lessons From Debugging Screen-Space Winding, Scale Shifts, and Comb-Reverb Runaway (`TM-ACC-AUDIT-RETRO-PIPELINE-V1.0`):**  
   Bringing the prototype from raw specification to verified `60 fps` execution (`4/4` `node --test` checks passing) exposed three classic pitfalls of low-level software engines:
   * **Y-Down Screen-Space Backface Culling:** Because HTML5 `ImageData` places `(0, 0)` at the top-left (`+Y` downward), counter-clockwise front-facing triangles produce a *negative* 2D cross product (`cross < 0`), requiring `if (cross >= 0) continue;` rather than `cross <= 0`.
   * **Fixed-Point Perspective Shift Balance & Y-Clamping:** Dividing `Q16.16 × Q16.16` (`Q32.32`) by `Q16.16` depth (`rz`) leaves a single `>> 16` shift to land in screen pixels (`~73 px`), while clamping scanline loops strictly to `[0, screenH)` prevents off-screen polygons from stalling frame pacing.
   * **Comb-Reverb Stability & Brick-Wall Sensory Limiting:** Four parallel comb delays (`29.7–43.7 ms`) with `0.88` feedback gain can self-oscillate into `NaN`/screech clipping. Capping per-tap feedback at `0.38`, embedding a `780 Hz` low-pass filter inside each feedback loop, and terminating the WebAudio bus with a `DynamicsCompressorNode` brick-wall limiter (`-18 dB` threshold, `20:1` ratio) guarantees that retro chip synthesis remains warm and safe for neurodivergent ears.

---

## 2. Game Design Paths Unlocked by This Pipeline

Because the entire graphics and audio pipeline is self-contained, zero-float, and deterministic, it unlocks five distinct game design directions that align directly with neurodivergent sensory care and accessible toolmaking:

| Game Design Path | Core Pipeline Primitives Used | Why This Architecture Excels |
| :--- | :--- | :--- |
| **1. Contemplative "Walking & Sailing" Zen Sanctuaries** | Mode 7 caustic water + H-Blank ripple + *Washi* / Jade RGB555 textures + `<= 780 Hz` ADPCM chimes | Low-frequency, predictable visual motion paired with mute-by-default audio and a **`Space` reduced-motion pause** creates calm exploratory spaces without strobe effects or harsh treble spikes. |
| **2. Cryptographic & Speedrun Replayable Puzzle-Platformers** | `Q16.16` trig LUT + `mulQ16` fixed-point physics + deterministic `Uint32Array` state | Because every physics tick and camera angle is integer-deterministic, entire playthroughs can be recorded as tiny input logs and verified bit-for-bit across devices without desyncs. |
| **3. Tactile Audio-Visual Rhythm & Instrument Toys** | 4-bit PS1 ADPCM codec + Gaussian pitch interpolator (`YO_PITCH_Q12`) + GBA PSG 4-channel duty/LFSR engine | Players can sculpt timbres in real time—comparing raw 1990s chip harmonics against the **`<= 780 Hz` NDH Sensory Filter**—while receiving `aria-live` frame and pitch telemetry. |
| **4. Dual-Perspective Non-Dual Explorers (2D Plane + 3D Shrines)** | GBA Mode 7 overworld plane transitioning seamlessly into PS1 Gouraud-shaded 3D interior shrines | Mirrors the shift between surface navigation and inner stillness: a flat affine horizon gives clear spatial bearings, while 3D affine shrines house interactive geometric koans. |
| **5. Ultra-Lightweight Edge & Offline Educational Kits** | Zero external PNG/WAV files (`~14 KB` total source), `RGB555` procedural shaders, `node --test` verification | Runs offline on constrained mobile devices (`< 250 MB` free storage) and lets students inspect every line of math—from Bayer dithering matrices to ADPCM predictor filters—in a single afternoon. |

---

## 3. Conclusion

`Borealiscodes/ndh-retro-hw-pipeline` demonstrates that retro hardware constraints—`320×240` software framebuffers, `Q16.16` fixed-point integers, `RGB555` color palettes, and 4-bit ADPCM sample compression—are far more than aesthetic nostalgia. When paired with modern accessibility guardrails (`prefers-reduced-motion` detection, keyboard-first toggles, mute-by-default initialization, and brick-wall `<= 780 Hz` acoustic filtering), deterministic software emulation becomes a resilient, verifiable foundation for calm and inclusive interactive worlds.

---

## References (APA 7th Edition)

* Bayer, B. E. (1973). *An optimum method for two-level rendition of continuous-tone pictures* (IEEE International Conference on Communications, Vol. 1, pp. 26-11–26-15). IEEE.
* Hedling, B. S. (2026a). *Non-dual epistemic architectures and geometric stabilization in high-dimensional transformer systems (v3.1)* [Preprint]. Zenodo. https://doi.org
* Hedling, B. S. (2026b). *Beyond bolted-on screen readers: Narrative phenomenology, the RNIB Roundhouse sensory dark, and perceptual-cognitive unity (rasa-darśan)* [Preprint]. Zenodo. https://doi.org
* Hedling, B. S. (2026c). *From robotic screen-reader telemetry to embodied neural cadence: A narrative & empirical chronicle of guardrails, CLI flag literalism, and dual-voice VITS synthesis under edge constraints* [Preprint & dataset]. Zenodo. https://doi.org
* Hedling, B. S. (2026d). ndh-retro-hw-pipeline: Zero-float Q16.16 PS1 3D + GBA 2D + hybrid SPU/PSG hardware emulation suite with procedural RGB555 textures and <= 780 Hz sensory-safe filtering [Computer software]. GitHub. github.com
* Schroeder, M. R. (1962). Natural sounding artificial reverberation. Journal of the Audio Engineering Society, 10(3), 219–223.
* Sony Computer Entertainment. (1994–1998). PlayStation GPU & SPU hardware architecture documentation (GTE, 4-bit XA/SPU ADPCM, and Gaussian interpolation). SCEI.

---

## Provenance & License:

Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev> • Creative Commons Attribution 4.0 International (CC-BY-4.0) / MIT License.

