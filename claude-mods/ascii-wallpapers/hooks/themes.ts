import {
  branch,
  burst,
  cabin,
  cloud,
  coals,
  crescent,
  curtain,
  disc,
  grass,
  house,
  jellyfish,
  koi,
  lilyPad,
  make,
  paperBoat,
  pine,
  ridge,
  ring,
  streak,
  sun,
  tree,
  twinkle,
  waves,
} from './art'
import type { BoatTones, CloudTones, JellyPalette, KoiPalette } from './art'
import { mix } from './scene'
import type { Ctx, Layer, Theme } from './scene'
import type { ThemeId } from '../types'

/** One size unit: about a thirty-fourth of the scene's comfortable width. */
const u = ({ W, H }: Ctx) => Math.max(0.35, Math.min(W, H * 1.6) / 34)

// ---------------------------------------------------------------- palettes

const BRIGHT_CLOUD: CloudTones = { top: 0xffffff, mid: 0xf2f8ff, low: 0xdcebf9, rim: 0xb3cfea }
const FAR_CLOUD: CloudTones = { top: 0xf4fbff, mid: 0xe2f0fb, low: 0xcfe4f6, rim: 0xbad5ee }
const NIGHT_WISP: CloudTones = { top: 0x9aa6dc, mid: 0x8592ca, low: 0x717fb9, rim: 0x5d6aa4 }

const KOHAKU: KoiPalette = { base: 0xf7f2ea, spot: 0xe2412e, fin: 0xffe8e0, belly: 0xffffff, eye: 0x1a1a1a, spots: 0.45 }
const OGON: KoiPalette = { base: 0xffc94a, spot: 0xffe7a0, fin: 0xffe08a, belly: 0xfff1c4, eye: 0x3a2a00, spots: 0.3 }
const HI: KoiPalette = { base: 0xff7a2a, spot: 0xffb35c, fin: 0xffb980, belly: 0xffd0a0, eye: 0x2a1200, spots: 0.35 }
const SHOWA: KoiPalette = { base: 0x22282d, spot: 0xe2412e, fin: 0x5c6a72, belly: 0xf2ece4, eye: 0xffffff, spots: 0.5 }
const ASAGI: KoiPalette = { base: 0x6f93b8, spot: 0xa9c4dd, fin: 0xff9a5c, belly: 0xff9a5c, eye: 0x10202c, spots: 0.35 }

const PINK_JELLY: JellyPalette = { rim: 0xff5fb8, base: 0xff8fd0, light: 0xffd1ec, glow: 0xfff0fa, tentacle: 0xffa8dc }
const VIOLET_JELLY: JellyPalette = { rim: 0x8a63ff, base: 0xa98aff, light: 0xdcd0ff, glow: 0xf3eeff, tentacle: 0xbba4ff }
const CYAN_JELLY: JellyPalette = { rim: 0x2fbfff, base: 0x6fd8ff, light: 0xc9f3ff, glow: 0xf0fdff, tentacle: 0x8fe3ff }
const PEACH_JELLY: JellyPalette = { rim: 0xff8a6a, base: 0xffb08f, light: 0xffe0d2, glow: 0xfff4ee, tentacle: 0xffc2a8 }

const BOATS: readonly BoatTones[] = [
  { light: 0xffffff, shade: 0xdcd6c8, fold: 0xbdb5a6 },
  { light: 0xfff3d1, shade: 0xe6d6ae, fold: 0xcbb98c },
  { light: 0xffe1e1, shade: 0xe8c4c4, fold: 0xcfa6a6 },
  { light: 0xe3f2ff, shade: 0xc3d8ec, fold: 0xa3bdd6 },
  { light: 0xe6fff3, shade: 0xc2e6d4, fold: 0xa0c9b5 },
]

const stars = (density: number, band: number): Layer => ({
  // density as written reads per 100 pixels; stars want a fuller sky
  kind: 'field',
  glyphs: '..·*+',
  colors: [0xffffff, 0xcfd8ff, 0xfff2c2],
  density: density * 2.5,
  band: [0, band],
  motion: { blink: [4.5, 0.1] },
  jitter: 0.7,
  opacity: [0.35, 1],
})

// ---------------------------------------------------------------- themes

export const THEMES: readonly Theme[] = [
  {
    id: 'cloud-drift',
    ribbonY: 0.62,
    name: 'Cloud Drift',
    blurb: 'Puffy clouds sail over green hills on a bright noon.',
    accent: 0x4aa8ff,
    sky: [0x3a93e8, 0x78c1f6, 0xc6eaff],
    light: { x: 0.86, y: 0.1, r: 0.5, color: 0xfff1b8, strength: 0.8 },
    layers: [
      { kind: 'field', glyphs: '-', colors: [0xffffff], density: 0.12, motion: { dx: 4 }, jitter: 0.5, opacity: [0.1, 0.25] },
      { kind: 'sprite', make: c => sun(3.2 * u(c), 0xfffbe8, 0xffd25a, 0xffe58a), ink: ':', x: 0.94, y: 0.04, glow: true, motion: { spin: 70, blink: [6, 0.85] }, z: 1 },
      { kind: 'sprite', make: c => cloud(10 * u(c), 4 * u(c), c.rand, FAR_CLOUD), ink: '.', x: 0.2, y: 0.28, opacity: 0.75, motion: { dx: 0.3, gap: 8 }, z: 1 },
      { kind: 'sprite', make: c => cloud(8 * u(c), 3.5 * u(c), c.rand, FAR_CLOUD), ink: '.', x: 0.75, y: 0.48, opacity: 0.7, motion: { dx: 0.35, gap: 12 }, z: 1 },
      { kind: 'sprite', make: c => cloud(17 * u(c), 6.5 * u(c), c.rand, BRIGHT_CLOUD), ink: '.:', x: 0.08, y: 0.1, motion: { dx: 0.75, bob: [0.25, 7], gap: 10 }, z: 2 },
      { kind: 'sprite', make: c => cloud(13 * u(c), 5 * u(c), c.rand, BRIGHT_CLOUD), ink: '.:', x: 0.62, y: 0.36, motion: { dx: 0.9, bob: [0.25, 6], gap: 16 }, z: 2 },
      { kind: 'sprite', make: c => cloud(15 * u(c), 5.5 * u(c), c.rand, BRIGHT_CLOUD), ink: '.:', x: 0.3, y: 0.6, motion: { dx: 0.65, bob: [0.3, 8], gap: 20 }, z: 2 },
      { kind: 'sprite', make: c => ridge(c.rand, { W: c.W, h: 8 * u(c), octaves: [[1, 0.55], [3, 0.3], [7, 0.15]], top: 0x8fd6a2, bottom: 0x6fbd88, lit: 0xc2f2cb }), ink: "'", x: 0, y: 1, z: 3 },
      { kind: 'sprite', make: c => ridge(c.rand, { W: c.W, h: 4.5 * u(c), octaves: [[2, 0.5], [5, 0.3], [11, 0.2]], top: 0x55b474, bottom: 0x3d9a5c, lit: 0x92dca2 }), ink: ',', x: 0, y: 1, z: 4 },
      { kind: 'field', glyphs: 'v', colors: [0x2b4766, 0x3a5a7d], density: 0.03, band: [0.08, 0.45], motion: { dx: 1.8, bob: [0.5, 1.4], gap: 20 }, jitter: 0.4, opacity: [0.75, 0.95], z: 5 },
    ],
  },
  {
    id: 'koi-pond',
    ribbonY: 0.35,
    name: 'Koi Pond',
    blurb: 'Koi glide under lily pads through slow green water.',
    accent: 0xff8a3d,
    sky: [0x073745, 0x0c5961, 0x137a74],
    light: { x: 0.3, y: 0.05, r: 0.6, color: 0x7fffe0, strength: 0.22 },
    layers: [
      { kind: 'field', glyphs: '~', colors: [0x3fb7a8, 0x5fd3c2], density: 0.9, motion: { dx: 0.25, blink: [5, 0.3] }, jitter: 0.6, opacity: [0.12, 0.3] },
      { kind: 'field', glyphs: '.', colors: [0xcff9ef], density: 0.12, motion: { blink: [2.5, 0] }, jitter: 0.6, opacity: [0.2, 0.5] },
      { kind: 'field', glyphs: 'oO', colors: [0x9fe8dc], density: 0.03, motion: { blink: [3.5, 0] }, jitter: 0.5, opacity: [0.3, 0.6], z: 1 },
      { kind: 'sprite', make: c => koi(11 * u(c), c.rand, KOHAKU, true), ink: 't%', x: 0.1, y: 0.18, shadow: [1, 1], motion: { dx: 1.0, bob: [0.4, 3.2], gap: 8 } },
      { kind: 'sprite', make: c => koi(9 * u(c), c.rand, OGON, false), ink: 't%', x: 0.7, y: 0.36, shadow: [1, 1], motion: { dx: -0.8, bob: [0.35, 3.6], gap: 10 } },
      { kind: 'sprite', make: c => koi(12 * u(c), c.rand, SHOWA, true), ink: 't%', x: 0.4, y: 0.52, shadow: [1, 1], motion: { dx: 0.7, bob: [0.4, 2.9], gap: 14 } },
      { kind: 'sprite', make: c => koi(10 * u(c), c.rand, HI, false), ink: 't%', x: 0.2, y: 0.68, shadow: [1, 1], motion: { dx: -1.1, bob: [0.35, 3.4], gap: 6 } },
      { kind: 'sprite', make: c => koi(9 * u(c), c.rand, ASAGI, true), ink: 't%', x: 0.85, y: 0.84, shadow: [1, 1], motion: { dx: 0.9, bob: [0.4, 4], gap: 12 } },
      { kind: 'sprite', make: c => lilyPad(3.4 * u(c), c.rand, 0x6cc06a, 0x2f7a3e, { petal: 0xffa6cf, heart: 0xffe27a }), ink: '%', x: 0.06, y: 0.08, shadow: [1, 1], motion: { sway: [0.3, 7] }, z: 3 },
      { kind: 'sprite', make: c => lilyPad(2.6 * u(c), c.rand, 0x74c86f, 0x347f42), ink: '%', x: 0.9, y: 0.28, shadow: [1, 1], motion: { sway: [0.25, 8] }, z: 3 },
      { kind: 'sprite', make: c => lilyPad(3 * u(c), c.rand, 0x66b964, 0x2c733b, { petal: 0xfff1f6, heart: 0xffd34d }), ink: '%', x: 0.16, y: 0.86, shadow: [1, 1], motion: { sway: [0.3, 6] }, z: 3 },
      { kind: 'sprite', make: c => lilyPad(3.8 * u(c), c.rand, 0x6cc06a, 0x2f7a3e, { petal: 0xff8fbd, heart: 0xffe27a }), ink: '%', x: 0.74, y: 0.97, shadow: [1, 1], motion: { sway: [0.3, 9] }, z: 3 },
    ],
  },
  {
    id: 'jellyfish',
    ribbonY: 0.35,
    name: 'Jellyfish',
    blurb: 'Soft glowing jellies pulse upward through deep blue.',
    accent: 0xff7ac8,
    sky: [0x020a1f, 0x061d45, 0x0c336a],
    light: { x: 0.5, y: -0.05, r: 0.75, color: 0x4ba3ff, strength: 0.38 },
    layers: [
      { kind: 'field', glyphs: '·.*', colors: [0x7fe3ff, 0xc9b6ff], density: 0.7, motion: { dx: 0.1, blink: [3, 0.05] }, jitter: 0.8, opacity: [0.3, 0.9], glow: true },
      { kind: 'sprite', make: c => jellyfish(5 * u(c), c.rand, CYAN_JELLY), ink: 'o', x: 0.8, y: 0.15, opacity: 0.5, motion: { dy: -0.22, bob: [0.3, 3.4], sway: [0.8, 9], gap: 6 }, z: 1 },
      { kind: 'sprite', make: c => jellyfish(5 * u(c), c.rand, VIOLET_JELLY), ink: 'o', x: 0.15, y: 0.85, opacity: 0.5, motion: { dy: -0.25, bob: [0.3, 3], sway: [0.8, 10], gap: 10 }, z: 1 },
      { kind: 'sprite', make: c => jellyfish(9 * u(c), c.rand, PINK_JELLY), ink: 'o*', x: 0.12, y: 0.4, glow: true, motion: { dy: -0.45, bob: [0.5, 3], sway: [1.2, 9], gap: 6 } },
      { kind: 'sprite', make: c => jellyfish(8 * u(c), c.rand, VIOLET_JELLY), ink: 'o*', x: 0.72, y: 0.12, glow: true, motion: { dy: -0.38, bob: [0.5, 3.6], sway: [1, 11], gap: 8 } },
      { kind: 'sprite', make: c => jellyfish(7 * u(c), c.rand, CYAN_JELLY), ink: 'o*', x: 0.5, y: 0.75, glow: true, motion: { dy: -0.5, bob: [0.4, 2.6], sway: [1, 7], gap: 10 } },
      { kind: 'sprite', make: c => jellyfish(6 * u(c), c.rand, PEACH_JELLY), ink: 'o*', x: 0.92, y: 0.62, glow: true, motion: { dy: -0.42, bob: [0.4, 2.9], sway: [1, 8], gap: 12 } },
      { kind: 'field', glyphs: 'o°', colors: [0x9fd8ff], density: 0.06, motion: { dy: -1, sway: [0.5, 3] }, jitter: 0.5, opacity: [0.3, 0.6], z: 3 },
      { kind: 'sprite', make: c => grass(c.W, 6 * u(c), c.rand, [0x0f5a5a, 0x0c4a4f, 0x127068], 0x2fa08a), ink: '|', x: 0, y: 1, motion: { sway: [0.3, 5] }, z: 4 },
    ],
  },
  {
    id: 'fireflies',
    ribbonY: 0.8,
    name: 'Fireflies',
    blurb: 'A dark meadow at the edge of the woods, blinking with light.',
    accent: 0xd9ff6a,
    sky: [0x040a17, 0x0a1a26, 0x10291f],
    light: { x: 0.84, y: 0.08, r: 0.4, color: 0xc8d8ff, strength: 0.2 },
    layers: [
      stars(0.18, 0.4),
      { kind: 'sprite', make: c => disc(1.8 * u(c), d => mix(0xfff6dc, 0xe7dcb5, d)), ink: ':', x: 0.88, y: 0.05, glow: true, z: 0 },
      { kind: 'sprite', make: c => ridge(c.rand, { W: c.W, h: 12 * u(c), octaves: [[2, 0.4], [5, 0.35], [11, 0.25]], top: 0x0e2c25, bottom: 0x0a211b }), ink: ':', x: 0, y: 1, z: 1 },
      { kind: 'sprite', make: c => tree(11 * u(c), 17 * u(c), c.rand, { light: 0x24583c, mid: 0x1a442e, dark: 0x113322, trunk: 0x0b1a12 }), ink: ':', x: 0.02, y: 0.94, z: 2 },
      { kind: 'sprite', make: c => tree(9 * u(c), 14 * u(c), c.rand, { light: 0x205036, mid: 0x173d29, dark: 0x0f2e1f, trunk: 0x0b1a12 }), ink: ':', x: 0.95, y: 0.96, z: 2 },
      { kind: 'sprite', make: c => grass(c.W, 4.5 * u(c), c.rand, [0x1b5532, 0x226a3c, 0x174a2c], 0x4cae68), ink: '|', x: 0, y: 1, motion: { sway: [0.3, 5] }, z: 4 },
      { kind: 'field', glyphs: '•', colors: [0xeaff7a, 0xfff38a, 0xc8ff5a], density: 1.1, band: [0.15, 0.97], motion: { dx: 0.2, sway: [1.5, 7], bob: [1, 5], blink: [2.4, 0] }, jitter: 0.6, opacity: [0.9, 1], glow: true, z: 5 },
    ],
  },
  {
    id: 'moonlit',
    ribbonY: 0.08,
    name: 'Moonlit',
    blurb: 'A crescent moon over sleeping hills and one warm window.',
    accent: 0xf6e7a8,
    sky: [0x04071d, 0x0a1440, 0x1e2d6a],
    light: { x: 0.8, y: 0.16, r: 0.5, color: 0xd9e4ff, strength: 0.42 },
    layers: [
      stars(0.4, 0.75),
      { kind: 'sprite', make: () => twinkle(0xffffff), x: 0.15, y: 0.1, glow: true, motion: { blink: [3, 0.1] }, z: 1 },
      { kind: 'sprite', make: () => twinkle(0xfff2c2), x: 0.45, y: 0.22, glow: true, motion: { blink: [4, 0.1] }, z: 1 },
      { kind: 'sprite', make: () => twinkle(0xcfd8ff), x: 0.6, y: 0.04, glow: true, motion: { blink: [3.4, 0.1] }, z: 1 },
      { kind: 'sprite', make: c => crescent(4.6 * u(c), 0xfff8de, 0xe2d6a8, 0xd2c491), ink: ':.', x: 0.84, y: 0.1, glow: true, motion: { blink: [9, 0.9] }, z: 1 },
      { kind: 'sprite', make: c => streak(7 * u(c), 0xffffff), x: 0.3, y: 0.14, glow: true, motion: { dx: 22, gap: 700 }, z: 2 },
      { kind: 'sprite', make: c => cloud(18 * u(c), 3 * u(c), c.rand, NIGHT_WISP), ink: '~', x: 0.1, y: 0.3, opacity: 0.42, motion: { dx: 0.3, gap: 10 }, z: 2 },
      { kind: 'sprite', make: c => cloud(12 * u(c), 2.5 * u(c), c.rand, NIGHT_WISP), ink: '~', x: 0.7, y: 0.46, opacity: 0.35, motion: { dx: 0.45, gap: 20 }, z: 2 },
      { kind: 'sprite', make: c => ridge(c.rand, { W: c.W, h: 11 * u(c), octaves: [[1, 0.5], [3, 0.35], [7, 0.15]], top: 0x24326e, bottom: 0x1a2658, lit: 0x34468a }), ink: "'", x: 0, y: 1, z: 3 },
      { kind: 'sprite', make: c => ridge(c.rand, { W: c.W, h: 6 * u(c), octaves: [[2, 0.5], [5, 0.3], [9, 0.2]], top: 0x141e4c, bottom: 0x0d1536 }), ink: '.', x: 0, y: 1, z: 4 },
      { kind: 'sprite', make: c => house(7 * u(c), 0x2a3772, 0x3a4b94, 0xffd27a), ink: '.', x: 0.22, y: 0.97, z: 5 },
    ],
  },
  {
    id: 'paper-boats',
    ribbonY: 0.3,
    name: 'Paper Boats',
    blurb: 'A little fleet of paper boats bobbing over teal water.',
    accent: 0x5fd3d3,
    sky: [0x0b3446, 0x10546a, 0x1a7d86],
    light: { x: 0.2, y: 0, r: 0.75, color: 0xbff7ff, strength: 0.2 },
    layers: [
      { kind: 'field', glyphs: '·', colors: [0xe8ffff], density: 0.1, motion: { blink: [2, 0] }, jitter: 0.6, opacity: [0.3, 0.7] },
      { kind: 'sprite', make: c => waves(c.W, 3 * u(c), 24, 0x7fd6d6), loop: 24, x: 0, y: 0.18, motion: { dx: 0.35, bob: [0.3, 4] }, z: 1 },
      { kind: 'sprite', make: c => waves(c.W, 3 * u(c), 32, 0x8fe0de), loop: 32, x: 0, y: 0.45, motion: { dx: -0.3, bob: [0.3, 5] }, z: 1 },
      { kind: 'sprite', make: c => waves(c.W, 3 * u(c), 20, 0x7fd6d6), loop: 20, x: 0, y: 0.72, motion: { dx: 0.4, bob: [0.3, 3.5] }, z: 1 },
      { kind: 'sprite', make: c => waves(c.W, 3 * u(c), 28, 0x9be6e2), loop: 28, x: 0, y: 0.97, motion: { dx: -0.35, bob: [0.3, 4.5] }, z: 1 },
      { kind: 'field', glyphs: '*', colors: [0xff9a3c, 0xffcf4a, 0x7fcf6a], density: 0.015, motion: { dx: 0.5, bob: [0.3, 3] }, jitter: 0.5, tile: true, z: 1 },
      { kind: 'sprite', make: c => paperBoat(10 * u(c), BOATS[0]!), ink: '/', x: 0.1, y: 0.12, shadow: [1, 1], motion: { dx: 0.7, bob: [0.35, 2.6], gap: 10 } },
      { kind: 'sprite', make: c => paperBoat(8 * u(c), BOATS[1]!), ink: '/', x: 0.65, y: 0.32, shadow: [1, 1], motion: { dx: 0.9, bob: [0.3, 2.2], gap: 14 } },
      { kind: 'sprite', make: c => paperBoat(9 * u(c), BOATS[2]!), ink: '/', x: 0.35, y: 0.56, shadow: [1, 1], motion: { dx: 0.6, bob: [0.35, 3], gap: 8 } },
      { kind: 'sprite', make: c => paperBoat(7 * u(c), BOATS[3]!), ink: '/', x: 0.9, y: 0.76, shadow: [1, 1], motion: { dx: 0.8, bob: [0.3, 2.4], gap: 16 } },
      { kind: 'sprite', make: c => paperBoat(8 * u(c), BOATS[4]!), ink: '/', x: 0.2, y: 0.92, shadow: [1, 1], motion: { dx: 0.55, bob: [0.3, 2.8], gap: 12 } },
    ],
  },
  {
    id: 'snowfall',
    ribbonY: 0.78,
    name: 'Snowfall',
    blurb: 'Quiet snow over pines, peaks and a warm cabin.',
    accent: 0xbfe3ff,
    sky: [0x0e1630, 0x1f2c50, 0x3e527c],
    light: { x: 0.18, y: 0.1, r: 0.45, color: 0xdfe8ff, strength: 0.25 },
    layers: [
      { kind: 'field', glyphs: '·.', colors: [0xc7d3ef], density: 0.9, motion: { dy: 0.7, sway: [0.8, 5] }, jitter: 0.5, opacity: [0.3, 0.6] },
      { kind: 'sprite', make: c => ridge(c.rand, { W: c.W, h: 18 * u(c), octaves: [[1, 0.5], [3, 0.35], [6, 0.15]], top: 0x3e5080, bottom: 0x2c3b63, lit: 0x5e72a3, snow: { color: 0xe6eefb, depth: 2, above: 0.7 } }), ink: "'", x: 0, y: 0.9, z: 1 },
      { kind: 'sprite', make: c => pine(7 * u(c), 11 * u(c), { light: 0x2a5c50, dark: 0x214a42, trunk: 0x3a2a20, snow: 0xf2f7ff }), ink: '^', x: 0.24, y: 0.92, opacity: 0.85, z: 2 },
      { kind: 'sprite', make: c => pine(7 * u(c), 12 * u(c), { light: 0x2a5c50, dark: 0x214a42, trunk: 0x3a2a20, snow: 0xf2f7ff }), ink: '^', x: 0.74, y: 0.92, opacity: 0.85, z: 2 },
      { kind: 'sprite', make: c => cabin(13 * u(c), { wall: 0x6e4630, log: 0x8a5a3c, roof: 0x5a3426, snow: 0xf4f8ff, window: 0xffc46b, door: 0x3b241a }), ink: '=', x: 0.5, y: 0.95, z: 3 },
      { kind: 'sprite', make: c => pine(10 * u(c), 17 * u(c), { light: 0x2f6b5c, dark: 0x24524a, trunk: 0x3a2a20, snow: 0xf2f7ff }), ink: '^', x: 0.02, y: 0.98, z: 3 },
      { kind: 'sprite', make: c => pine(8 * u(c), 13 * u(c), { light: 0x2f6b5c, dark: 0x24524a, trunk: 0x3a2a20, snow: 0xf2f7ff }), ink: '^', x: 0.14, y: 0.99, z: 3 },
      { kind: 'sprite', make: c => pine(11 * u(c), 18 * u(c), { light: 0x2f6b5c, dark: 0x24524a, trunk: 0x3a2a20, snow: 0xf2f7ff }), ink: '^', x: 0.97, y: 0.98, z: 3 },
      { kind: 'sprite', make: c => ridge(c.rand, { W: c.W, h: 3.5 * u(c), octaves: [[2, 0.5], [5, 0.3], [9, 0.2]], top: 0xf2f6ff, bottom: 0xc9d6ec }), ink: '.', x: 0, y: 1, z: 4 },
      { kind: 'field', glyphs: '*+·', colors: [0xffffff, 0xe6eeff], density: 0.6, motion: { dy: 1.5, sway: [1.2, 4] }, jitter: 0.5, opacity: [0.75, 1], glow: true, z: 5 },
    ],
  },
  {
    id: 'sakura',
    ribbonY: 0.62,
    name: 'Sakura',
    blurb: 'Cherry blossoms drift across a pink mountain dusk.',
    accent: 0xff9cc2,
    sky: [0x261231, 0x6a2a55, 0xd96f7e],
    light: { x: 0.5, y: 0.82, r: 0.6, color: 0xffb07a, strength: 0.5 },
    layers: [
      { kind: 'field', glyphs: '.', colors: [0xffe6d0], density: 0.1, band: [0, 0.4], motion: { blink: [5, 0.2] }, jitter: 0.6, opacity: [0.2, 0.6] },
      { kind: 'sprite', make: c => disc(5 * u(c), d => mix(0xffe8c0, 0xffa36c, d * d)), ink: '.', x: 0.5, y: 0.7, glow: true, opacity: 0.92, z: 0 },
      { kind: 'sprite', make: c => ridge(c.rand, { W: c.W, h: 15 * u(c), octaves: [[1, 0.75], [3, 0.15], [7, 0.1]], top: 0x5e2c58, bottom: 0x48214a, lit: 0x7a3c6e, snow: { color: 0xffe6f0, depth: 2, above: 0.86 } }), ink: "'", x: 0, y: 1, z: 1 },
      { kind: 'sprite', make: c => ridge(c.rand, { W: c.W, h: 6 * u(c), octaves: [[2, 0.5], [4, 0.3], [9, 0.2]], top: 0x3a1838, bottom: 0x2a1030 }), ink: ',', x: 0, y: 1, z: 3 },
      { kind: 'sprite', make: c => branch(Math.min(c.W * 0.62, 30 * u(c)), Math.min(c.H * 0.32, 14 * u(c)), c.rand, { bark: 0x3b1a24, petals: [0xffb7d0, 0xff8fb8, 0xffd6e6], heart: 0xfff0b0 }, false), ink: '*', x: 0, y: 0, motion: { sway: [0.2, 9] }, z: 4 },
      { kind: 'sprite', make: c => branch(Math.min(c.W * 0.5, 24 * u(c)), Math.min(c.H * 0.26, 11 * u(c)), c.rand, { bark: 0x3b1a24, petals: [0xffc9dc, 0xff9cc2, 0xffe6ef], heart: 0xfff0b0 }, true), ink: '*', x: 1, y: 0.02, motion: { sway: [0.2, 11] }, z: 4 },
      { kind: 'field', glyphs: '*', colors: [0xffc4dc, 0xffa6c9, 0xffe0ec], density: 0.12, motion: { dx: 0.9, dy: 0.7, sway: [1, 3.5] }, jitter: 0.5, tile: true, z: 5 },
      { kind: 'field', glyphs: "',", colors: [0xffc4dc, 0xffe0ec, 0xff9cc2], density: 0.3, motion: { dx: 1.2, dy: 0.8, sway: [1.2, 3] }, jitter: 0.5, opacity: [0.5, 0.95], z: 5 },
    ],
  },
  {
    id: 'aurora',
    ribbonY: 0.25,
    name: 'Aurora',
    blurb: 'Green and violet curtains ripple over a frozen lake.',
    accent: 0x5dffb0,
    sky: [0x01030c, 0x041026, 0x082034],
    light: { x: 0.5, y: 0.3, r: 0.65, color: 0x3fffb0, strength: 0.16 },
    layers: [
      stars(0.4, 0.7),
      { kind: 'sprite', make: c => curtain(c.rand, { W: c.W, h: c.H * 0.5, period: 64, edge: 0xd2a8ff, glow: 0xa070ff, top: 0x6a4ad0 }), ink: '|:', loop: 64, x: 0, y: 0.06, opacity: 0.75, glow: true, motion: { dx: -0.18, blink: [9, 0.45] }, z: 1 },
      { kind: 'sprite', make: c => curtain(c.rand, { W: c.W, h: c.H * 0.48, period: 48, edge: 0x9dffd2, glow: 0x3ee6a0, top: 0x2bb5a0 }), ink: '|!', loop: 48, x: 0, y: 0.14, glow: true, motion: { dx: 0.25, blink: [7, 0.55] }, z: 1 },
      { kind: 'sprite', make: c => curtain(c.rand, { W: c.W, h: c.H * 0.3, period: 40, edge: 0xb0f6ff, glow: 0x3fc8e0, top: 0x2a7fb0 }), ink: ':', loop: 40, x: 0, y: 0.3, opacity: 0.6, motion: { dx: 0.35, blink: [6, 0.4] }, z: 1 },
      { kind: 'sprite', make: c => ridge(c.rand, { W: c.W, h: 13 * u(c), octaves: [[2, 0.5], [4, 0.3], [9, 0.2]], top: 0x1a2b45, bottom: 0x0d1828, lit: 0x31507a, snow: { color: 0xdfeaff, depth: 1, above: 0.72 } }), ink: "'", x: 0, y: 0.86, z: 3 },
      { kind: 'sprite', make: c => make(c.W, Math.max(2, Math.round(c.H * 0.14)), (x, y) => mix(0x0a2236, 0x05121f, y / Math.max(1, c.H * 0.14))), x: 0, y: 1, z: 4 },
      { kind: 'sprite', make: c => waves(c.W, Math.max(2, c.H * 0.12), 40, 0x3ee6a0), loop: 40, x: 0, y: 1, opacity: 0.45, motion: { dx: 0.2, blink: [7, 0.5] }, z: 5 },
    ],
  },
  {
    id: 'ember',
    ribbonY: 0.4,
    name: 'Ember',
    blurb: 'A slow, breathing spark over glowing coals, embers rising.',
    accent: 0xd97757,
    sky: [0x0f0503, 0x200b06, 0x3a150b],
    light: { x: 0.5, y: 0.42, r: 0.6, color: 0xd97757, strength: 0.48 },
    layers: [
      { kind: 'field', glyphs: '~', colors: [0x5a3a30], density: 0.06, motion: { dx: 0.2, dy: -0.4 }, jitter: 0.5, opacity: [0.1, 0.2] },
      { kind: 'sprite', make: c => ring(12 * u(c), 0xffb38a, 0.2), x: 0.5, y: 0.4, motion: { spin: -140 }, z: 1 },
      { kind: 'sprite', make: c => ring(9 * u(c), 0xd97757, 0.35), x: 0.5, y: 0.4, motion: { spin: 90 }, z: 1 },
      { kind: 'sprite', make: c => burst(7 * u(c), 12, { core: 0xfff1e6, mid: 0xf2a07e, tip: 0xc8603e }), ink: '*', x: 0.5, y: 0.4, glow: true, motion: { spin: 100, blink: [5, 0.7] }, z: 2 },
      { kind: 'field', glyphs: '·', colors: [0xff9a5a, 0xffc07a, 0xe8683a], density: 0.1, motion: { dy: -1, sway: [0.8, 3], blink: [2.2, 0.2] }, jitter: 0.5, tile: true, glow: true, z: 3 },
      { kind: 'field', glyphs: '.*', colors: [0xffd2a0, 0xff9a5a], density: 0.45, motion: { dy: -1.4, sway: [0.6, 2.5], blink: [1.8, 0.1] }, jitter: 0.5, opacity: [0.5, 1], z: 3 },
      { kind: 'sprite', make: c => coals(c.W, 3.5 * u(c), c.rand, [0x3a1208, 0x6a1f0c, 0xa8381a, 0xff7a3a, 0xffc07a]), ink: '#', x: 0, y: 1, glow: true, motion: { blink: [3, 0.75] }, z: 4 },
    ],
  },
]

export const themeById = (id: string | null | undefined): Theme | undefined =>
  THEMES.find(theme => theme.id === id)

/** A theme by id, name, number (1-9, 0 for the tenth) or a loose prefix of its name. */
export const findTheme = (query: string): Theme | undefined => {
  const q = query.trim().toLowerCase().replace(/[\s_]+/g, '-')
  if (!q) return undefined
  // 1-9 and 0 for the tenth, as the picker's hotkeys read.
  const number = /^\d+$/.test(q) ? Number(q) : NaN
  if (number === 0) return THEMES[9]
  if (Number.isInteger(number) && number >= 1 && number <= THEMES.length) return THEMES[number - 1]

  return (
    THEMES.find(theme => theme.id === q || theme.name.toLowerCase().replace(/\s+/g, '-') === q) ??
    THEMES.find(theme => theme.id.startsWith(q) || theme.id.replace(/-/g, '').startsWith(q.replace(/-/g, '')))
  )
}

export const THEME_IDS = THEMES.map(theme => theme.id) as readonly ThemeId[]
