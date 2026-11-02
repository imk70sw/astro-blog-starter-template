// The scene engine. A theme is data: a sky, a light, and layers. Each layer
// is either a sprite (a shape of colored "pixels", each painted as a tile with
// a character inside, the way the art is drawn in characters) or a field of
// loose particles (stars, petals, embers). Shapes are made procedurally for
// the size being drawn, so one theme fills a tall side panel, a wide preview
// and a slim ribbon equally well. Both renderers (SVG for the apps, cells for
// a terminal) read the same layout and the same motion formulas.

import type { ThemeId } from '../types'

export type Rgb = number

/** One pixel of a shape: a color and how opaque it is. */
export type Px = { c: Rgb; a: number }

export type Shape = { w: number; h: number; px: (Px | null)[] }

export type Motion = {
  /** Horizontal speed in pixels per second; the item wraps around. */
  dx?: number
  /** Vertical speed in pixels per second; the item wraps around. */
  dy?: number
  /** Extra off-screen distance before a wrapping item returns, in pixels. */
  gap?: number
  /** Vertical breathing: amplitude in pixels, period in seconds. */
  bob?: readonly [number, number]
  /** Horizontal breathing: amplitude in pixels, period in seconds. */
  sway?: readonly [number, number]
  /** Fades between full and `low` opacity over a period in seconds. */
  blink?: readonly [number, number]
  /** One full turn every this many seconds (negative turns the other way; apps only). */
  spin?: number
}

export type Ctx = { W: number; H: number; rand: () => number }

export type SpriteLayer = {
  kind: 'sprite'
  make: (ctx: Ctx) => Shape
  /** Characters painted inside the tiles. */
  ink?: string
  /** 0 = left edge, 1 = right edge (of the room the sprite leaves). */
  x: number
  /** 0 = top, 1 = bottom. */
  y: number
  motion?: Motion
  opacity?: number
  glow?: boolean
  /** A soft dark copy under the sprite, offset by [x, y] pixels. */
  shadow?: readonly [number, number]
  /** The shape repeats every this many pixels and scrolls seamlessly. */
  loop?: number
  z?: number
}

export type FieldLayer = {
  kind: 'field'
  glyphs: string
  colors: readonly Rgb[]
  /** Particles per 100 pixels of scene. */
  density: number
  /** Vertical region, 0..1. */
  band?: readonly [number, number]
  motion?: Motion
  /** How much speeds and periods vary between particles, 0..1. */
  jitter?: number
  opacity?: readonly [number, number]
  glow?: boolean
  /** Draw each particle as a small colored tile instead of a bare glyph. */
  tile?: boolean
  z?: number
}

export type Layer = SpriteLayer | FieldLayer

export type Theme = {
  id: ThemeId
  name: string
  blurb: string
  /** The color captions and badges use for this theme. */
  accent: Rgb
  /** Gradient stops, top to bottom. */
  sky: readonly Rgb[]
  /** A soft radial light: position as fractions, radius as a fraction of the larger side. */
  light?: { x: number; y: number; r: number; color: Rgb; strength: number }
  /** Where the ribbon's slice of the scene sits, 0 = top, 1 = bottom. */
  ribbonY?: number
  layers: readonly Layer[]
}

// ---------------------------------------------------------------- layout

export type Item = {
  shape: Shape
  ink: string
  /** A particle: one glyph, no shape of its own. */
  glyph?: string
  tile: boolean
  x: number
  y: number
  xr: readonly [number, number]
  yr: readonly [number, number]
  dx: number
  dy: number
  bob?: readonly [number, number]
  sway?: readonly [number, number]
  blink?: readonly [number, number]
  spin?: number
  /** Seconds added to the clock for this item's bob, sway and blink. */
  phase: number
  opacity: number
  glow: boolean
  shadow?: readonly [number, number]
  z: number
}

export type Layout = { W: number; H: number; items: Item[] }

export const hash = (text: string): number => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }

  return h >>> 0
}

export const random = (seed: number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type LayoutOptions = {
  /** Particle density, 1 for a full scene. */
  density?: number
  /** Sprites taller than this are left out (a slim ribbon has no room). */
  maxSpriteRows?: number
}

/** Lays a theme out for a scene `W` x `H` pixels. */
export const layout = (theme: Theme, W: number, H: number, o: LayoutOptions = {}): Layout => {
  const density = o.density ?? 1
  const maxRows = o.maxSpriteRows ?? Infinity
  const items: Item[] = []

  theme.layers.forEach((layer, index) => {
    // Each layer draws from its own stream, so one layer never reshuffles another.
    const rand = random(hash(`${theme.id}:${index}:${W}x${H}`))

    if (layer.kind === 'sprite') {
      const shape = layer.make({ W, H, rand })
      if (shape.w === 0 || shape.h === 0 || shape.h > maxRows) return
      const m = layer.motion ?? {}
      const gap = m.gap ?? 0
      const loop = layer.loop
      items.push({
        shape,
        ink: layer.ink ?? '',
        tile: true,
        x: loop ? -Math.floor(loop * rand()) : Math.round(layer.x * Math.max(0, W - shape.w)),
        y: Math.round(layer.y * Math.max(0, H - shape.h)),
        xr: loop ? [-loop, 0] : [-shape.w - gap / 2, W + gap / 2],
        yr: [-shape.h - gap / 2, H + gap / 2],
        dx: m.dx ?? 0,
        dy: m.dy ?? 0,
        bob: m.bob,
        sway: m.sway,
        blink: m.blink,
        spin: m.spin,
        phase: rand() * 10,
        opacity: layer.opacity ?? 1,
        glow: layer.glow ?? false,
        shadow: layer.shadow,
        z: layer.z ?? 2,
      })
      return
    }

    const glyphs = Array.from(layer.glyphs)
    const [top, bottom] = layer.band ?? [0, 1]
    const count = Math.round(((layer.density * W * H) / 100) * density)
    const jitter = layer.jitter ?? 0
    const vary = (value: number) => value * (1 + jitter * (rand() * 2 - 1))
    const pair = (p: readonly [number, number] | undefined) =>
      p ? ([vary(p[0]), vary(p[1])] as const) : undefined
    const m = layer.motion ?? {}
    const [low, high] = layer.opacity ?? [1, 1]
    const yLo = top * H
    const yHi = bottom * H
    for (let i = 0; i < count; i++) {
      const color = layer.colors[Math.floor(rand() * layer.colors.length)] ?? 0xffffff
      items.push({
        shape: { w: 1, h: 1, px: [{ c: color, a: 1 }] },
        ink: '',
        glyph: glyphs[Math.floor(rand() * glyphs.length)] ?? '.',
        tile: layer.tile ?? false,
        x: Math.floor(rand() * W),
        y: Math.floor(yLo + rand() * Math.max(0, yHi - yLo - 1)),
        xr: [-1 - (m.gap ?? 0), W],
        yr: m.dy ? [layer.band ? yLo - 1 : -1, layer.band ? yHi : H] : [-1, H],
        dx: m.dx ? vary(m.dx) : 0,
        dy: m.dy ? vary(m.dy) : 0,
        bob: pair(m.bob),
        sway: pair(m.sway),
        blink: m.blink ? ([vary(m.blink[0]), m.blink[1]] as const) : undefined,
        phase: rand() * 20,
        opacity: low + rand() * (high - low),
        glow: layer.glow ?? false,
        z: layer.z ?? 0,
      })
    }
  })

  items.sort((a, b) => a.z - b.z)

  return { W, H, items }
}

// ---------------------------------------------------------------- motion

const TAU = Math.PI * 2

const wrap = (value: number, [lo, hi]: readonly [number, number]) => {
  const span = hi - lo
  return lo + ((((value - lo) % span) + span) % span)
}

/** Where an item stands at `t` seconds, and how opaque it is. */
export const at = (item: Item, t: number) => {
  let x = item.dx ? wrap(item.x + item.dx * t, item.xr) : item.x
  let y = item.dy ? wrap(item.y + item.dy * t, item.yr) : item.y
  const local = t + item.phase
  if (item.bob) y += -item.bob[0] * Math.cos((TAU * local) / item.bob[1])
  if (item.sway) x += -item.sway[0] * Math.cos((TAU * local) / item.sway[1])
  let opacity = item.opacity
  if (item.blink) {
    const [period, low] = item.blink
    opacity *= low + (1 - low) * (0.5 + 0.5 * Math.cos((TAU * local) / period))
  }

  return { x, y, opacity }
}

// ---------------------------------------------------------------- color

const channel = (c: Rgb, shift: number) => (c >> shift) & 0xff

export const mix = (a: Rgb, b: Rgb, amount: number): Rgb => {
  const k = Math.min(1, Math.max(0, amount))
  const blend = (shift: number) =>
    Math.round(channel(a, shift) + (channel(b, shift) - channel(a, shift)) * k)

  return (blend(16) << 16) | (blend(8) << 8) | blend(0)
}

export const luma = (c: Rgb) =>
  (0.2126 * channel(c, 16) + 0.7152 * channel(c, 8) + 0.0722 * channel(c, 0)) / 255

/** The color a tile's character is painted in: a darker or lighter tone of the tile. */
export const inkOf = (c: Rgb) => (luma(c) > 0.42 ? mix(c, 0x000000, 0.36) : mix(c, 0xffffff, 0.32))

export const hex = (c: Rgb) => `#${c.toString(16).padStart(6, '0')}`

/** The sky's color at `f` (0 top, 1 bottom). */
export const skyAt = (sky: readonly Rgb[], f: number): Rgb => {
  if (sky.length === 1) return sky[0] ?? 0
  const scaled = Math.min(1, Math.max(0, f)) * (sky.length - 1)
  const i = Math.min(sky.length - 2, Math.floor(scaled))

  return mix(sky[i] ?? 0, sky[i + 1] ?? 0, scaled - i)
}

/** The character painted in the tile at (x, y): stable, varied. */
export const inkAt = (ink: string, x: number, y: number): string => {
  if (!ink) return ''
  const chars = Array.from(ink)
  const n = (Math.imul(x + 7, 73856093) ^ Math.imul(y + 3, 19349663)) >>> 0

  return chars[n % chars.length] ?? ''
}
