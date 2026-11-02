// The two renderers of a laid-out scene. On the apps every pixel of a sprite
// becomes a small rounded tile with a character inside, in animated SVG that
// the app plays by itself. In a terminal every pixel becomes two character
// cells, painted frame by frame.

import { at, hex, inkAt, inkOf, layout, mix, skyAt } from './scene'
import type { Item, Layout, Theme } from './scene'

// ---------------------------------------------------------------- SVG

/** One pixel, in SVG units. */
const P = 12
const GAP = 1
const TILE = P - GAP * 2
const SVG_LIMIT = 124_000

const n = (value: number) => String(Math.round(value * 100) / 100)

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const EASE = 'calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1"'

const loop = (dur: number, begin: number) =>
  `dur="${n(dur)}s" begin="${n(-(((begin % dur) + dur) % dur))}s" repeatCount="indefinite"`

const slide = (from: string, to: string, dur: number, begin: number) =>
  `<animateTransform attributeName="transform" type="translate" from="${from}" to="${to}" ${loop(dur, begin)}/>`

const breathe = (values: string, period: number, phase: number) =>
  `<animateTransform attributeName="transform" type="translate" values="${values}" ${EASE} ${loop(period, phase)}/>`

/** Seconds into a wrap at which the item stands where the layout put it. */
const wrapBegin = (start: number, speed: number, [lo, hi]: readonly [number, number]) =>
  speed > 0 ? (start - lo) / speed : (hi - start) / -speed

const tilePath = (cells: readonly (readonly [number, number])[], dx = 0, dy = 0) =>
  cells.map(([x, y]) => `M${x * P + GAP + dx} ${y * P + GAP + dy}h${TILE}v${TILE}h-${TILE}z`).join('')

const bodySvg = (item: Item, isLight: boolean): string => {
  const { shape } = item
  let out = ''

  if (item.glyph !== undefined) {
    const px = shape.px[0]
    if (!px) return ''
    const c = hex(px.c)
    if (item.tile) {
      return `<rect x="${GAP}" y="${GAP}" width="${TILE}" height="${TILE}" rx="2" fill="${c}"/>${isLight ? '' : `<text x="${P / 2}" y="${P * 0.78}" font-size="9" fill="${hex(inkOf(px.c))}">${escape(item.glyph)}</text>`}`
    }
    return `<text x="${P / 2}" y="${P * 0.86}" font-size="14" fill="${c}">${escape(item.glyph)}</text>`
  }

  if (item.shadow) {
    const all: [number, number][] = []
    shape.px.forEach((p, i) => p && all.push([i % shape.w, Math.floor(i / shape.w)]))
    out += `<path d="${tilePath(all, item.shadow[0] * P, item.shadow[1] * P)}" fill="#000" fill-opacity=".22"/>`
  }

  const groups = new Map<string, [number, number][]>()
  shape.px.forEach((p, i) => {
    if (!p) return
    const key = `${p.c}|${p.a}`
    let list = groups.get(key)
    if (!list) groups.set(key, (list = []))
    list.push([i % shape.w, Math.floor(i / shape.w)])
  })
  for (const [key, cells] of groups) {
    const [c, a] = key.split('|').map(Number) as [number, number]
    out += `<path d="${tilePath(cells)}" fill="${hex(c)}"${a < 1 ? ` fill-opacity="${a}"` : ''}/>`
  }

  if (!isLight && item.ink) {
    // characters, grouped by color and row: one <text> with an x per glyph
    const rows = new Map<string, { xs: number[]; chars: string; y: number; c: number }>()
    shape.px.forEach((p, i) => {
      if (!p || p.a < 0.5) return
      const x = i % shape.w
      const y = Math.floor(i / shape.w)
      const ink = inkOf(p.c)
      const key = `${ink}|${y}`
      let row = rows.get(key)
      if (!row) rows.set(key, (row = { xs: [], chars: '', y, c: ink }))
      row.xs.push(x * P + P / 2)
      row.chars += inkAt(item.ink, x, y)
    })
    for (const row of rows.values()) {
      out += `<text x="${row.xs.join(' ')}" y="${n(row.y * P + P * 0.76)}" fill="${hex(row.c)}">${escape(row.chars)}</text>`
    }
  }

  return out
}

const itemSvg = (item: Item, id: string, isLight: boolean): string => {
  const open: string[] = []
  const ypx = item.y * P

  if (item.dx) {
    const [lo, hi] = item.xr
    const y = item.dy ? 0 : ypx
    const [from, to] = item.dx > 0 ? [lo, hi] : [hi, lo]
    open.push(
      `<g>${slide(`${n(from * P)} ${n(y)}`, `${n(to * P)} ${n(y)}`, (hi - lo) / Math.abs(item.dx), wrapBegin(item.x, item.dx, item.xr))}`,
    )
  } else {
    open.push(`<g transform="translate(${n(item.x * P)} ${n(item.dy ? 0 : ypx)})">`)
  }

  if (item.dy) {
    const [lo, hi] = item.yr
    const [from, to] = item.dy > 0 ? [lo, hi] : [hi, lo]
    open.push(
      `<g>${slide(`0 ${n(from * P)}`, `0 ${n(to * P)}`, (hi - lo) / Math.abs(item.dy), wrapBegin(item.y, item.dy, item.yr))}`,
    )
  }

  if (item.bob) {
    const a = n(item.bob[0] * P)
    open.push(`<g>${breathe(`0 -${a};0 ${a};0 -${a}`, item.bob[1], item.phase)}`)
  }

  if (item.sway) {
    const a = n(item.sway[0] * P)
    open.push(`<g>${breathe(`-${a} 0;${a} 0;-${a} 0`, item.sway[1], item.phase)}`)
  }

  if (item.spin) {
    const cx = n((item.shape.w * P) / 2)
    const cy = n((item.shape.h * P) / 2)
    const [from, to] = item.spin > 0 ? [0, 360] : [360, 0]
    open.push(
      `<g><animateTransform attributeName="transform" type="rotate" from="${from} ${cx} ${cy}" to="${to} ${cx} ${cy}" ${loop(Math.abs(item.spin), item.phase)}/>`,
    )
  }

  const o = item.opacity
  const blink = item.blink
    ? `<animate attributeName="opacity" values="${n(o)};${n(o * item.blink[1])};${n(o)}" ${EASE} ${loop(item.blink[0], item.phase)}/>`
    : ''
  const filter = item.glow && !isLight ? ` filter="url(#g${id})"` : ''
  open.push(`<g opacity="${n(o)}"${filter}>${blink}`)

  return open.join('') + bodySvg(item, isLight) + '</g>'.repeat(open.length)
}

export type SvgOptions = {
  /** Scene width and height, in pixels. */
  W: number
  H: number
  /** Unique within a drawing: prefixes the gradient and filter ids. */
  id: string
  /** Particle density, 1 for a full scene. */
  density?: number
  /** Thumbnails skip the characters and the glow: cheap to draw ten at once. */
  isLight?: boolean
  /** Leave out sprites taller than this many pixels. */
  maxSpriteRows?: number
  /** `card` rounds the corners; `ribbon` fades out at both ends. */
  frame?: 'card' | 'ribbon'
  /** A title over a soft scrim at the bottom left. */
  caption?: { title: string; sub?: string }
  /** A check badge in the top right corner (the applied theme). */
  badge?: boolean
  /** Show only this many rows of the scene, a slice placed at the theme's `ribbonY`. */
  slice?: number
}

const svgOf = (theme: Theme, scene: Layout, o: SvgOptions): string => {
  const { id } = o
  const Wp = scene.W * P
  const Hp = scene.H * P
  const big = Math.max(Wp, Hp)
  const stops = theme.sky
    .map((c, i) => `<stop offset="${n(i / Math.max(1, theme.sky.length - 1))}" stop-color="${hex(c)}"/>`)
    .join('')
  const light = theme.light
  const rx = o.frame === 'ribbon' ? 0 : Math.round(Math.min(Wp, Hp) * 0.045 + 6)
  const defs = [
    `<linearGradient id="s${id}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>`,
    light
      ? `<radialGradient id="l${id}" gradientUnits="userSpaceOnUse" cx="${n(light.x * Wp)}" cy="${n(light.y * Hp)}" r="${n(light.r * big)}"><stop offset="0" stop-color="${hex(light.color)}" stop-opacity="${n(light.strength)}"/><stop offset=".45" stop-color="${hex(light.color)}" stop-opacity="${n(light.strength * 0.35)}"/><stop offset="1" stop-color="${hex(light.color)}" stop-opacity="0"/></radialGradient>`
      : '',
    `<radialGradient id="v${id}" cx=".5" cy=".45" r=".8"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></radialGradient>`,
    `<pattern id="p${id}" width="${P}" height="${P}" patternUnits="userSpaceOnUse"><rect x="${GAP}" y="${GAP}" width="${TILE}" height="${TILE}" rx="2" fill="#fff" fill-opacity=".028"/></pattern>`,
    `<filter id="g${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${P * 0.45}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
    o.frame === 'ribbon'
      ? `<linearGradient id="f${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".07" stop-color="#fff"/><stop offset=".93" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="m${id}"><rect width="${Wp}" height="${Hp}" fill="url(#f${id})"/></mask>`
      : `<clipPath id="c${id}"><rect width="${Wp}" height="${Hp}" rx="${rx}"/></clipPath>`,
    o.caption
      ? `<linearGradient id="t${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></linearGradient>`
      : '',
  ].join('')

  const fs = Math.round(Math.max(Wp, Hp * 1.6) * 0.034)
  const caption = o.caption
    ? [
        `<rect y="${n(Hp * 0.55)}" width="${Wp}" height="${n(Hp * 0.45)}" fill="url(#t${id})"/>`,
        `<g font-family="ui-sans-serif,-apple-system,'Segoe UI',system-ui,sans-serif" text-anchor="start">`,
        `<text x="${n(fs * 0.9)}" y="${n(Hp - fs * (o.caption.sub ? 1.55 : 0.75))}" font-size="${fs}" font-weight="700" fill="#fff" letter-spacing="-.01em">${escape(o.caption.title)}</text>`,
        o.caption.sub
          ? `<text x="${n(fs * 0.9)}" y="${n(Hp - fs * 0.62)}" font-size="${n(fs * 0.48)}" font-weight="500" fill="#fff" fill-opacity=".78">${escape(o.caption.sub)}</text>`
          : '',
        `<rect x="${n(fs * 0.9)}" y="${n(Hp - fs * (o.caption.sub ? 2.75 : 1.95))}" width="${n(fs * 1.4)}" height="${n(fs * 0.16)}" rx="${n(fs * 0.08)}" fill="${hex(theme.accent)}"/>`,
        '</g>',
      ].join('')
    : ''
  const br = Math.round(Math.min(Wp, Hp) * 0.11)
  const badge = o.badge
    ? `<g transform="translate(${Wp - br * 1.35} ${br * 1.35})"><circle r="${br}" fill="${hex(theme.accent)}" stroke="#fff" stroke-width="${n(br * 0.16)}"/><path d="M${n(-br * 0.45)} 0l${n(br * 0.3)} ${n(br * 0.3)} ${n(br * 0.6)} ${n(-br * 0.62)}" fill="none" stroke="#fff" stroke-width="${n(br * 0.22)}" stroke-linecap="round" stroke-linejoin="round"/></g>`
    : ''
  const holder = o.frame === 'ribbon' ? `mask="url(#m${id})"` : `clip-path="url(#c${id})"`
  const rows = o.slice ? Math.min(scene.H, o.slice) : scene.H
  const top = o.slice ? Math.round((scene.H - rows) * (theme.ribbonY ?? 0.5)) * P : 0

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Wp}" height="${rows * P}" viewBox="0 ${top} ${Wp} ${rows * P}" preserveAspectRatio="xMidYMid slice">`,
    `<defs>${defs}</defs>`,
    `<g ${holder}>`,
    `<rect width="${Wp}" height="${Hp}" fill="url(#s${id})"/>`,
    light ? `<rect width="${Wp}" height="${Hp}" fill="url(#l${id})"/>` : '',
    `<rect width="${Wp}" height="${Hp}" fill="url(#p${id})"/>`,
    `<g font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace" font-size="9" font-weight="700" text-anchor="middle">`,
    ...scene.items.map(item => itemSvg(item, id, o.isLight ?? false)),
    '</g>',
    `<rect width="${Wp}" height="${Hp}" fill="url(#v${id})"/>`,
    caption,
    badge,
    '</g>',
    o.frame === 'ribbon'
      ? ''
      : `<rect x=".5" y=".5" width="${Wp - 1}" height="${Hp - 1}" rx="${rx}" fill="none" stroke="#fff" stroke-opacity=".1"/>`,
    '</svg>',
  ].join('')
}

/** An animated SVG of the theme, kept under the Svg element's size limit. */
export const svgScene = (theme: Theme, o: SvgOptions): string => {
  let density = o.density ?? 1
  for (;;) {
    const scene = layout(theme, o.W, o.H, { density, maxSpriteRows: o.maxSpriteRows })
    const markup = svgOf(theme, scene, o)
    if (markup.length <= SVG_LIMIT || density < 0.05) return markup
    density *= 0.7
  }
}

// ---------------------------------------------------------------- terminal

const DEFAULT = 0x01000000

/**
 * A theme laid out for a terminal grid, two columns per pixel, its backdrop
 * painted once. A slice shows `rows` rows of a taller scene (the ribbon).
 */
export type Canvas = { scene: Layout; cols: number; rows: number; top: number; bg: Uint32Array }

const backdrop = (theme: Theme, cols: number, rows: number): Uint32Array => {
  const bg = new Uint32Array(cols * rows)
  const light = theme.light
  const big = Math.max(cols / 2, rows)
  for (let r = 0; r < rows; r++) {
    const row = skyAt(theme.sky, rows > 1 ? r / (rows - 1) : 0)
    for (let c = 0; c < cols; c++) {
      let color = row
      if (light) {
        const dx = (c + 0.5) / 2 - (light.x * cols) / 2
        const dy = r + 0.5 - light.y * rows
        const d = Math.hypot(dx, dy) / Math.max(1, light.r * big)
        const f = Math.max(0, 1 - d)
        color = mix(color, light.color, f * f * light.strength * 1.2)
      }
      const ex = c / Math.max(1, cols - 1) - 0.5
      const ey = r / Math.max(1, rows - 1) - 0.45
      color = mix(color, 0, Math.max(0, ex * ex + ey * ey - 0.1) * 0.7)
      bg[r * cols + c] = color
    }
  }

  return bg
}

export type CanvasOptions = { density?: number; slice?: boolean }

export const canvas = (theme: Theme, cols: number, rows: number, o: CanvasOptions = {}): Canvas => {
  const W = Math.max(1, Math.floor(cols / 2))
  const H = o.slice ? Math.max(rows * 4, 14) : rows
  return {
    scene: layout(theme, W, H, { density: o.density }),
    cols,
    rows,
    top: o.slice ? Math.round((H - rows) * (theme.ribbonY ?? 0.5)) : 0,
    bg: backdrop(theme, cols, H),
  }
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const base64 = (bytes: Uint8Array): string => {
  let out = ''
  let i = 0
  for (; i + 2 < bytes.length; i += 3) {
    const v = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += B64[(v >> 18) & 63]! + B64[(v >> 12) & 63]! + B64[(v >> 6) & 63]! + B64[v & 63]!
  }
  const rest = bytes.length - i
  if (rest === 1) {
    const v = (bytes[i] ?? 0) << 16
    out += `${B64[(v >> 18) & 63]!}${B64[(v >> 12) & 63]!}==`
  } else if (rest === 2) {
    const v = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8)
    out += `${B64[(v >> 18) & 63]!}${B64[(v >> 12) & 63]!}${B64[(v >> 6) & 63]!}=`
  }

  return out
}

/** One frame at `t` seconds, packed as `Raster` cells (base64). */
export const frame = ({ scene, cols, rows: shown, top: first, bg: base }: Canvas, t: number): string => {
  const rows = scene.H === shown ? shown : Math.round(base.length / cols)
  const bg = Uint32Array.from(base)
  const ch = new Uint32Array(cols * rows).fill(32)
  const fg = new Uint32Array(cols * rows).fill(DEFAULT)

  const paint = (col: number, row: number, glyph: string, color: number, alpha: number, isTile: boolean) => {
    if (col < 0 || col >= cols || row < 0 || row >= rows) return
    const cell = row * cols + col
    const under = bg[cell] ?? 0
    if (isTile) {
      bg[cell] = mix(under, color, alpha)
      if (glyph) {
        ch[cell] = glyph.codePointAt(0) ?? 32
        fg[cell] = mix(bg[cell] ?? under, inkOf(color), alpha)
      } else {
        ch[cell] = 32
      }
    } else {
      ch[cell] = glyph.codePointAt(0) ?? 32
      fg[cell] = mix(under, color, alpha)
    }
  }

  for (const item of scene.items) {
    const { x, y, opacity } = at(item, t)
    if (opacity < 0.05) continue
    const left = Math.round(x)
    const top = Math.round(y)
    const { shape } = item

    if (item.glyph !== undefined) {
      const p = shape.px[0]
      if (!p) continue
      paint(left * 2, top, item.glyph, p.c, opacity, item.tile)
      if (item.tile) paint(left * 2 + 1, top, '', p.c, opacity, true)
      continue
    }

    if (item.shadow) {
      const [sx, sy] = item.shadow
      shape.px.forEach((p, i) => {
        if (!p) return
        const px = left + (i % shape.w) + sx
        const py = top + Math.floor(i / shape.w) + sy
        for (const col of [px * 2, px * 2 + 1]) {
          if (col >= 0 && col < cols && py >= 0 && py < rows) {
            const cell = py * cols + col
            bg[cell] = mix(bg[cell] ?? 0, 0, 0.22 * opacity)
          }
        }
      })
    }

    shape.px.forEach((p, i) => {
      if (!p) return
      const sx = i % shape.w
      const sy = Math.floor(i / shape.w)
      const px = left + sx
      const py = top + sy
      const alpha = p.a * opacity
      const strong = p.a >= 0.5
      paint(px * 2, py, strong ? inkAt(item.ink, sx, sy) : '', p.c, alpha, true)
      paint(px * 2 + 1, py, strong ? inkAt(item.ink, sx + 101, sy) : '', p.c, alpha, true)
    })
  }

  const words = new Uint32Array(cols * shown * 3)
  for (let i = 0; i < cols * shown; i++) {
    const from = first * cols + i
    words[i * 3] = ch[from] ?? 32
    words[i * 3 + 1] = fg[from] ?? DEFAULT
    words[i * 3 + 2] = bg[from] ?? DEFAULT
  }

  return base64(new Uint8Array(words.buffer))
}
