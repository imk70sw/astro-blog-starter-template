// Procedural pixel art. Every maker returns a Shape sized for the scene it is
// drawn into, shaded with a few tones so it reads as painted, not stamped.

import { mix } from './scene'
import type { Px, Rgb, Shape } from './scene'

const TAU = Math.PI * 2

export const blank = (w: number, h: number): Shape => ({
  w: Math.max(0, Math.round(w)),
  h: Math.max(0, Math.round(h)),
  px: Array<Px | null>(Math.max(0, Math.round(w)) * Math.max(0, Math.round(h))).fill(null),
})

export const get = (s: Shape, x: number, y: number) =>
  x < 0 || y < 0 || x >= s.w || y >= s.h ? null : (s.px[y * s.w + x] ?? null)

export const put = (s: Shape, x: number, y: number, c: Rgb, a = 1) => {
  const xi = Math.round(x)
  const yi = Math.round(y)
  if (xi < 0 || yi < 0 || xi >= s.w || yi >= s.h) return
  s.px[yi * s.w + xi] = { c, a }
}

export const make = (w: number, h: number, fn: (x: number, y: number) => Px | Rgb | null): Shape => {
  const s = blank(w, h)
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const v = fn(x, y)
      if (v !== null) s.px[y * s.w + x] = typeof v === 'number' ? { c: v, a: 1 } : v
    }
  }

  return s
}

const flipX = (s: Shape): Shape => make(s.w, s.h, (x, y) => get(s, s.w - 1 - x, y))

/** Smooth noise along one axis, periodic over `period` when given. */
const noise1 = (rand: () => number, scale: number, period?: number) => {
  const knots = Array.from({ length: 256 }, () => rand())
  const n = period ? Math.max(1, Math.round(period / scale)) : 256
  return (x: number) => {
    const u = x / scale
    const i = Math.floor(u)
    const f = u - i
    const a = knots[((i % n) + n) % n] ?? 0
    const b = knots[(((i + 1) % n) + n) % n] ?? 0
    const k = (1 - Math.cos(f * Math.PI)) / 2
    return a + (b - a) * k
  }
}

/** A sum of sines with whole cycles over `period`: seamless when looped. */
const ridgeFn = (rand: () => number, period: number, octaves: readonly (readonly [number, number])[]) => {
  const terms = octaves.map(([cycles, amp]) => ({ k: cycles, amp, phase: rand() * TAU }))
  return (x: number) => terms.reduce((sum, t) => sum + t.amp * Math.sin((TAU * t.k * x) / period + t.phase), 0)
}

const quantize = (a: number) => (a > 0.86 ? 1 : a > 0.62 ? 0.75 : a > 0.4 ? 0.5 : a > 0.22 ? 0.3 : a > 0.12 ? 0.18 : 0)

// ---------------------------------------------------------------- sky things

export type CloudTones = { top: Rgb; mid: Rgb; low: Rgb; rim: Rgb }

export const cloud = (w: number, h: number, rand: () => number, t: CloudTones): Shape => {
  const W = Math.max(6, Math.round(w))
  const H = Math.max(3, Math.round(h))
  const count = 3 + Math.floor(rand() * 2)
  const bumps = Array.from({ length: count }, (_, i) => {
    const u = (i + 0.5) / count
    return { cx: W * (0.18 + 0.64 * u), cy: H * (0.55 - 0.1 * Math.sin(u * Math.PI)), r: H * (0.28 + 0.26 * Math.sin(u * Math.PI)) * (0.85 + rand() * 0.3) }
  })
  const inside = (x: number, y: number) => {
    const px = x + 0.5
    const py = y + 0.5
    const base = ((px - W / 2) / (W / 2)) ** 2 + ((py - H * 0.72) / (H * 0.3)) ** 2 <= 1 && py <= H
    return base || bumps.some(b => (px - b.cx) ** 2 + (py - b.cy) ** 2 <= b.r * b.r)
  }

  return make(W, H, (x, y) => {
    if (!inside(x, y)) return null
    if (!inside(x, y + 1)) return t.rim
    if (!inside(x, y - 1)) return t.top
    const v = y / H
    return v < 0.45 ? t.top : v < 0.75 ? t.mid : t.low
  })
}

export const disc = (r: number, color: (d: number, x: number, y: number) => Rgb | Px | null): Shape => {
  const R = Math.max(1, r)
  const size = Math.round(R * 2 + 1)
  const c = (size - 1) / 2
  return make(size, size, (x, y) => {
    const d = Math.hypot(x - c, y - c) / (R + 0.35)
    return d <= 1 ? color(d, x - c, y - c) : null
  })
}

export const sun = (r: number, core: Rgb, edge: Rgb, ray: Rgb): Shape => {
  const R = Math.max(2, Math.round(r))
  const reach = R + 3
  const size = reach * 2 + 1
  const s = blank(size, size)
  for (let k = 0; k < 12; k++) {
    const angle = (k / 12) * TAU
    const long = k % 2 === 0 ? 3 : 2
    for (let d = R + 1; d <= R + long; d++) {
      put(s, reach + Math.cos(angle) * d, reach + Math.sin(angle) * d, ray, 0.75 - (d - R) * 0.15)
    }
  }
  const body = disc(R, d => mix(core, edge, d * d))
  for (let y = 0; y < body.h; y++) {
    for (let x = 0; x < body.w; x++) {
      const p = get(body, x, y)
      if (p) put(s, x + reach - R, y + reach - R, p.c, p.a)
    }
  }

  return s
}

export const crescent = (r: number, light: Rgb, shade: Rgb, crater: Rgb): Shape => {
  const R = Math.max(3, Math.round(r))
  const size = R * 2 + 1
  const craters = [
    [-0.35, -0.2, 0.18],
    [-0.15, 0.35, 0.12],
    [-0.55, 0.25, 0.1],
  ] as const
  return make(size, size, (x, y) => {
    const dx = x - R
    const dy = y - R
    if (Math.hypot(dx, dy) > R + 0.3) return null
    if (Math.hypot(dx - R * 0.62, dy + R * 0.3) < R * 0.86) return null
    if (craters.some(([cx, cy, cr]) => Math.hypot(dx - cx * R, dy - cy * R) < cr * R + 0.3)) return crater
    return mix(light, shade, Math.max(0, (dx + dy) / (2.4 * R) + 0.3))
  })
}

/** A diagonal streak with a bright head: a shooting star. */
export const streak = (length: number, color: Rgb): Shape => {
  const L = Math.max(4, Math.round(length))
  const h = Math.ceil(L / 2.5)
  const s = blank(L, h)
  for (let i = 0; i < L; i++) put(s, i, (i / L) * (h - 1), color, 0.12 + (0.88 * i) / L)
  return s
}

export const twinkle = (color: Rgb): Shape =>
  make(3, 3, (x, y) => (x === 1 && y === 1 ? color : x === 1 || y === 1 ? { c: color, a: 0.45 } : null))

// ---------------------------------------------------------------- land

export type RidgeOptions = {
  W: number
  h: number
  /** Repeats every this many pixels (a looping layer); defaults to W. */
  period?: number
  octaves: readonly (readonly [number, number])[]
  top: Rgb
  bottom: Rgb
  /** Lighter face on slopes rising to the right. */
  lit?: Rgb
  snow?: { color: Rgb; depth: number; above: number }
}

export const ridge = (rand: () => number, o: RidgeOptions): Shape => {
  const period = o.period ?? o.W
  const width = o.period ? o.W + period : o.W
  const f = ridgeFn(rand, period, o.octaves)
  const H = Math.max(2, Math.round(o.h))
  const heights = Array.from({ length: width }, (_, x) => Math.round(H * (0.55 + 0.45 * f(x))))

  return make(width, H, (x, y) => {
    const top = H - Math.max(1, Math.min(H, heights[x] ?? 1))
    if (y < top) return null
    const depth = y - top
    if (o.snow && heights[x]! >= H * o.snow.above && depth < o.snow.depth) return o.snow.color
    const rising = (heights[x + 1] ?? 0) > (heights[x] ?? 0)
    const base = mix(o.top, o.bottom, (y - top) / Math.max(1, H - top))
    return o.lit && rising && depth < 3 ? mix(base, o.lit, 0.55) : base
  })
}

export const grass = (W: number, h: number, rand: () => number, tones: readonly Rgb[], tip: Rgb): Shape => {
  const H = Math.max(2, Math.round(h))
  const blades = Array.from({ length: W }, () => Math.round(H * (0.35 + rand() * 0.65)))
  return make(W, H, (x, y) => {
    const b = blades[x] ?? 1
    if (y < H - b) return null
    if (y === H - b) return { c: tip, a: 0.9 }
    return tones[(x + Math.floor(y / 2)) % tones.length] ?? tip
  })
}

export const waves = (W: number, h: number, period: number, color: Rgb): Shape => {
  const width = W + period
  return make(width, Math.max(1, Math.round(h)), (x, y) => {
    const v = Math.sin((TAU * 2 * x) / period + y * 1.7) + 0.5 * Math.sin((TAU * 3 * x) / period - y)
    return v > 1.05 ? { c: color, a: 0.55 } : v > 0.8 ? { c: color, a: 0.22 } : null
  })
}

export type TreeTones = { light: Rgb; mid: Rgb; dark: Rgb; trunk: Rgb }

export const tree = (w: number, h: number, rand: () => number, t: TreeTones): Shape => {
  const W = Math.max(5, Math.round(w))
  const H = Math.max(6, Math.round(h))
  const crownH = H * 0.78
  const blobs = Array.from({ length: 9 }, () => ({
    cx: W * (0.15 + rand() * 0.7),
    cy: crownH * (0.18 + rand() * 0.6),
    r: W * (0.12 + rand() * 0.16),
  }))
  blobs.push({ cx: W / 2, cy: crownH * 0.55, r: W * 0.36 })
  const ragged = Array.from({ length: W * H }, () => rand() < 0.3)
  const inBlobs = (x: number, y: number) => blobs.some(b => (x + 0.5 - b.cx) ** 2 + (y + 0.5 - b.cy) ** 2 <= b.r * b.r)
  // edge pixels drop out here and there: leafy, not round
  const inCrown = (x: number, y: number) =>
    inBlobs(x, y) && !(ragged[y * W + x] && !(inBlobs(x - 1, y) && inBlobs(x + 1, y) && inBlobs(x, y - 1) && inBlobs(x, y + 1)))
  const trunkW = Math.max(1, Math.round(W * 0.12))
  return make(W, H, (x, y) => {
    if (inCrown(x, y)) {
      const lit = !inCrown(x - 1, y - 1)
      const shade = !inCrown(x + 1, y + 1)
      return lit ? t.light : shade ? t.dark : t.mid
    }
    if (y > crownH * 0.6 && Math.abs(x + 0.5 - W / 2) <= trunkW / 2 + 0.01) return t.trunk
    return null
  })
}

export type PineTones = { light: Rgb; dark: Rgb; trunk: Rgb; snow?: Rgb }

export const pine = (w: number, h: number, t: PineTones): Shape => {
  const W = Math.max(5, Math.round(w) | 1)
  const H = Math.max(7, Math.round(h))
  const trunk = Math.max(1, Math.round(H * 0.12))
  const body = H - trunk
  const tiers = 3
  const c = (W - 1) / 2
  return make(W, H, (x, y) => {
    if (y >= body) return Math.abs(x - c) <= 0.5 ? t.trunk : null
    const tier = Math.min(tiers - 1, Math.floor((y / body) * tiers))
    const start = (tier * body) / tiers - tier * 1.2
    const local = (y - start) / (body / tiers + 1.2)
    const half = (0.2 + 0.8 * local) * (c * (0.55 + 0.45 * ((tier + 1) / tiers)))
    const d = Math.abs(x - c)
    if (d > half + 0.3) return null
    if (t.snow && (y - start < 1 || (d > half - 0.8 && local < 0.3))) return t.snow
    return x < c ? t.light : t.dark
  })
}

export type CabinTones = { wall: Rgb; log: Rgb; roof: Rgb; snow: Rgb; window: Rgb; door: Rgb }

export const cabin = (w: number, t: CabinTones): Shape => {
  const W = Math.max(11, Math.round(w) | 1)
  const roofH = Math.ceil(W / 2.6)
  const wallH = Math.ceil(W / 2.4)
  const H = roofH + wallH + 2
  const c = (W - 1) / 2
  return make(W, H, (x, y) => {
    // chimney
    if (y < 3 && x >= Math.round(W * 0.7) && x <= Math.round(W * 0.7) + 1) return y === 0 ? t.snow : t.log
    const ry = y - 2
    if (ry < 0) return null
    if (ry < roofH) {
      const half = (ry + 1) * (c / roofH) + 0.6
      if (Math.abs(x - c) > half) return null
      return Math.abs(x - c) > half - 1.2 || ry === 0 ? t.snow : t.roof
    }
    const wy = ry - roofH
    if (x === 0 || x === W - 1) return null
    const winY = wy >= 1 && wy <= 2
    const isWindow = winY && (Math.abs(x - Math.round(W * 0.25)) <= 0.6 || Math.abs(x - Math.round(W * 0.75)) <= 0.6)
    if (isWindow) return t.window
    if (Math.abs(x - c) <= 0.6 && wy >= 1) return t.door
    return wy % 2 === 0 ? t.log : t.wall
  })
}

export const house = (w: number, wall: Rgb, roof: Rgb, window: Rgb): Shape => {
  const W = Math.max(7, Math.round(w) | 1)
  const roofH = Math.ceil(W / 2)
  const H = roofH + Math.ceil(W / 2.2)
  const c = (W - 1) / 2
  return make(W, H, (x, y) => {
    if (y < roofH) return Math.abs(x - c) <= y + 0.5 ? roof : null
    if (x === 0 || x === W - 1) return null
    const wy = y - roofH
    return wy === 1 && Math.abs(x - c) <= 0.6 ? window : wall
  })
}

// ---------------------------------------------------------------- water

export type KoiPalette = { base: Rgb; spot: Rgb; fin: Rgb; belly: Rgb; eye: Rgb; spots: number }

export const koi = (length: number, rand: () => number, p: KoiPalette, facingRight: boolean): Shape => {
  const L = Math.max(8, Math.round(length))
  const H = Math.max(5, Math.round(L * 0.42) | 1)
  const cy = (H - 1) / 2
  const bodyLen = L * 0.78
  const spots = noise1(rand, 2.2)
  const spots2 = noise1(rand, 1.7)
  const s = make(L, H, (x, y) => {
    // head at the right
    const u = (L - 1 - x) / bodyLen
    if (u <= 1) {
      const half = Math.pow(Math.sin(Math.min(1, u * 1.05 + 0.05) * Math.PI), 0.75) * (H * 0.36)
      const d = Math.abs(y - cy)
      if (d > half + 0.25) return null
      if (u < 0.12 && Math.abs(y - (cy - 1)) < 0.6 && u > 0.04) return p.eye
      if (y > cy + half - 1 && u > 0.15) return p.belly
      const n = spots(x) * 0.6 + spots2(y * 3.1 + x) * 0.4
      return n > 1 - p.spots ? p.spot : p.base
    }
    // the tail fans out behind the body
    const v = (u - 1) / ((L - bodyLen) / bodyLen)
    const half = 0.6 + v * (H * 0.48)
    return Math.abs(y - cy) <= half ? { c: p.fin, a: 0.85 - v * 0.3 } : null
  })
  // pectoral fins
  const finX = Math.round(L - 1 - bodyLen * 0.28)
  put(s, finX, cy + H * 0.36 + 0.6, p.fin, 0.7)
  put(s, finX - 1, cy + H * 0.36 + 0.6, p.fin, 0.5)
  put(s, finX, cy - H * 0.36 - 0.6, p.fin, 0.7)
  return facingRight ? s : flipX(s)
}

export const lilyPad = (r: number, rand: () => number, light: Rgb, dark: Rgb, flower?: { petal: Rgb; heart: Rgb }): Shape => {
  const notch = rand() * TAU
  const R = Math.max(2, r)
  const s = disc(R, (d, dx, dy) => {
    let a = Math.atan2(dy, dx) - notch
    a = Math.atan2(Math.sin(a), Math.cos(a))
    if (Math.abs(a) < 0.32 && d > 0.15) return null
    if (d > 0.82) return dark
    const vein = Math.abs(Math.sin(Math.atan2(dy, dx) * 3)) < 0.18 && d > 0.25
    return vein ? mix(light, 0xffffff, 0.25) : mix(light, dark, d * 0.5)
  })
  if (flower) {
    const fx = Math.round(s.w / 2 + Math.cos(notch + Math.PI) * R * 0.35)
    const fy = Math.round(s.h / 2 + Math.sin(notch + Math.PI) * R * 0.35)
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) put(s, fx + dx, fy + dy, flower.petal)
    put(s, fx, fy, flower.heart)
  }

  return s
}

export type JellyPalette = { rim: Rgb; base: Rgb; light: Rgb; glow: Rgb; tentacle: Rgb }

export const jellyfish = (w: number, rand: () => number, p: JellyPalette): Shape => {
  const W = Math.max(5, Math.round(w) | 1)
  const bell = Math.ceil(W * 0.55)
  const tentacles = Math.max(3, Math.round(W / 2.5))
  const lengths = Array.from({ length: tentacles }, () => Math.round(bell * (1.3 + rand() * 1.1)))
  const H = bell + 1 + Math.max(...lengths)
  const cx = (W - 1) / 2
  const inBell = (x: number, y: number) => ((x - cx) / (W / 2)) ** 2 + ((bell - 0.5 - y) / bell) ** 2 <= 1 && y < bell
  const s = make(W, H, (x, y) => {
    if (y < bell) {
      if (!inBell(x, y)) return null
      if (!inBell(x - 1, y) || !inBell(x + 1, y) || !inBell(x, y - 1)) return p.rim
      const organ = Math.hypot(x - cx, y - bell * 0.62) < W * 0.16
      if (organ) return p.glow
      return mix(p.light, p.base, y / bell)
    }
    if (y === bell) return x % 2 === 0 ? { c: p.rim, a: 0.85 } : null
    return null
  })
  for (let i = 0; i < tentacles; i++) {
    const tx = 1 + ((W - 3) * (i + 0.5)) / tentacles
    const phase = rand() * TAU
    const len = lengths[i] ?? bell
    for (let d = 0; d < len; d++) {
      const x = tx + Math.sin(d * 0.55 + phase) * 0.9
      put(s, x, bell + 1 + d, p.tentacle, Math.max(0.15, 0.9 - (d / len) * 0.75))
    }
  }

  return s
}

export type BoatTones = { light: Rgb; shade: Rgb; fold: Rgb }

export const paperBoat = (w: number, t: BoatTones): Shape => {
  const W = Math.max(7, Math.round(w) | 1)
  const sail = Math.ceil(W * 0.45)
  const hull = Math.max(2, Math.round(W * 0.28))
  const H = sail + hull
  const c = (W - 1) / 2
  return make(W, H, (x, y) => {
    if (y < sail) {
      const half = ((y + 1) / sail) * (W * 0.3)
      const d = x - c
      if (Math.abs(d) > half + 0.2) return null
      if (Math.abs(d) < 0.5) return t.fold
      return d < 0 ? t.light : t.shade
    }
    const hy = y - sail
    const inset = hy
    if (x < inset || x > W - 1 - inset) return null
    if (hy === 0) return t.fold
    return x < c ? t.light : t.shade
  })
}

// ---------------------------------------------------------------- blossoms

export type BranchTones = { bark: Rgb; petals: readonly Rgb[]; heart: Rgb }

export const branch = (w: number, h: number, rand: () => number, t: BranchTones, fromRight: boolean): Shape => {
  const W = Math.max(10, Math.round(w))
  const H = Math.max(6, Math.round(h))
  const s = blank(W, H)
  const points: [number, number][] = []
  // a bough sagging from the corner, with twigs
  for (let i = 0; i <= W; i++) {
    const u = i / W
    const y = H * 0.12 + H * 0.5 * Math.sin(u * Math.PI * 0.75) + u * H * 0.15
    points.push([i, y])
    put(s, i, y, t.bark)
    if (u < 0.45) put(s, i, y + 1, t.bark)
  }
  for (let k = 0; k < 4; k++) {
    const [bx, by] = points[Math.floor(W * (0.25 + k * 0.18))] ?? [0, 0]
    const len = Math.round(H * (0.25 + rand() * 0.25))
    const up = rand() > 0.5 ? -1 : 1
    for (let d = 1; d <= len; d++) {
      put(s, bx + d * 0.8, by + up * d * 0.6, t.bark)
      if (d === len) points.push([bx + d * 0.8, by + up * d * 0.6])
    }
  }
  // blossom clusters along the wood
  const clusters = Math.round(W / 3.2)
  for (let k = 0; k < clusters; k++) {
    const [px, py] = points[Math.floor(rand() * points.length)] ?? [0, 0]
    const r = 1 + Math.floor(rand() * 2)
    const petal = t.petals[Math.floor(rand() * t.petals.length)] ?? t.heart
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r + 0.5) put(s, px + dx, py + dy, petal)
      }
    }
    put(s, px, py, t.heart)
  }

  return fromRight ? flipX(s) : s
}

// ---------------------------------------------------------------- light

export type CurtainOptions = { W: number; h: number; period: number; edge: Rgb; glow: Rgb; top: Rgb }

/** An aurora curtain: a bright lower hem with rays fading upward. */
export const curtain = (rand: () => number, o: CurtainOptions): Shape => {
  const width = o.W + o.period
  const H = Math.max(4, Math.round(o.h))
  const hem = ridgeFn(rand, o.period, [[1, 0.6], [2, 0.3], [5, 0.1]])
  const rays = ridgeFn(rand, o.period, [[7, 0.5], [13, 0.3], [23, 0.2]])
  return make(width, H, (x, y) => {
    const bottom = H * (0.62 + 0.28 * hem(x))
    if (y > bottom + 0.5) return null
    const up = (bottom - y) / bottom
    const strength = 0.55 + 0.45 * rays(x)
    const a = quantize(strength * Math.pow(1 - up, 1.6) * (y > bottom - 1.5 ? 1.25 : 1))
    if (a === 0) return null
    const c = up < 0.12 ? o.edge : up < 0.45 ? o.glow : o.top
    return { c, a }
  })
}

export type BurstTones = { core: Rgb; mid: Rgb; tip: Rgb }

/** A many-rayed spark, brightest at the heart. */
export const burst = (r: number, rays: number, t: BurstTones): Shape => {
  const R = Math.max(4, Math.round(r))
  const size = R * 2 + 1
  const s = blank(size, size)
  for (let k = 0; k < rays; k++) {
    const angle = (k / rays) * TAU + 0.2
    const len = R * (k % 2 === 0 ? 1 : 0.72)
    for (let d = 0; d <= len; d += 0.5) {
      const u = d / len
      const width = (1 - u) * (R * 0.16) + 0.4
      for (let o = -width; o <= width; o += 0.5) {
        const x = R + Math.cos(angle) * d - Math.sin(angle) * o
        const y = R + Math.sin(angle) * d + Math.cos(angle) * o
        put(s, x, y, u < 0.35 ? mix(t.core, t.mid, u / 0.35) : mix(t.mid, t.tip, (u - 0.35) / 0.65))
      }
    }
  }
  const core = Math.max(1, R * 0.22)
  for (let y = -core; y <= core; y++) {
    for (let x = -core; x <= core; x++) {
      if (x * x + y * y <= core * core + 0.3) put(s, R + x, R + y, t.core)
    }
  }

  return s
}

export const ring = (r: number, color: Rgb, alpha: number): Shape => {
  const R = Math.max(3, Math.round(r))
  const size = R * 2 + 1
  return make(size, size, (x, y) => {
    const d = Math.hypot(x - R, y - R)
    return Math.abs(d - R) < 0.5 && (x + y) % 2 === 0 ? { c: color, a: alpha } : null
  })
}

export const coals = (W: number, h: number, rand: () => number, tones: readonly Rgb[]): Shape => {
  const H = Math.max(2, Math.round(h))
  const f = ridgeFn(rand, W, [[1, 0.5], [3, 0.3], [7, 0.2]])
  return make(W, H, (x, y) => {
    const top = H * (0.45 - 0.4 * f(x))
    if (y < top) return null
    const heat = rand()
    return tones[Math.min(tones.length - 1, Math.floor(heat * heat * tones.length))] ?? null
  })
}
