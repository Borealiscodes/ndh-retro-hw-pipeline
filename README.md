
NDH Retro Hardware Pipeline (Q16.16 GBA 2D + PS1 3D + Hybrid Audio)

Zero-float, deterministic Q16.16 fixed-point PlayStation 1 3D + Game Boy Advance 2D + hybrid SPU/PSG hardware emulation suite with procedural RGB555 textures, reduced-motion pause (Space), and a toggleable <= 780 Hz NDH sensory-safe audio envelope.

Core Modules

• src/retro-hw-pipeline.js: Deterministic 1024-brad trig LUT, 3x3 fixed-point rotation matrices, PS1 Gouraud-shaded affine triangle rasterizer with 4x4 ordered Bayer dithering and semi-transparency modes (0..3), GBA Mode 7 floor projection, H-Blank scanline ripple, PS1 4-bit ADPCM codec + Gaussian interpolator + Schroeder reverb, and GBA PSG pulse/LFSR noise synthesis.
• src/retro-textures.js: Seamless power-of-2 procedural Uint32Array RGB555 texture generators (Washi Parchment, Veined Jade/Ivory Marble, Caustic Water, and Starfield Nebula).
• index.html: Live 320x240 interactive playground with mute-by-default audio (M), <= 780 Hz NDH sensory low-pass filter toggle, reduced-motion pause (Space), and keyboard shortcuts (R, G, T).

Quickstart & Verification

bash
node --test test/retro-pipeline.test.mjs
python3 -m http.server 8094 --bind 127.0.0.1
Use code with caution.
License: MIT License • Signed-off-by: Borealis Serenity Hedling <chguard-sentinel@vaked.dev>
