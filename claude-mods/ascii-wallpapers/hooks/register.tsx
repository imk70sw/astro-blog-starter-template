import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { WallpaperSettings, ThemeId } from '../types'
import { canvas, frame, svgScene } from './render'
import type { Canvas, CanvasOptions } from './render'
import type { Theme } from './scene'
import { findTheme, THEME_IDS, themeById, THEMES } from './themes'

type $ = EngineInterface

const PICKER = 'theme-picker'
const WALL = 'wallpaper'
const DEFAULTS: WallpaperSettings = { theme: null, panel: true, ribbon: true }
const RIBBON_ROWS = 6

// Every read goes through sanitize, so a value an older version stored still reads.
const settings = atom({ plugin: 'ascii-wallpapers', key: 'settings' } as const, DEFAULTS)
const focused = atom({ plugin: 'ascii-wallpapers', key: 'focused' } as const, null)

const readSettings = async ($: $) => sanitize(await read<WallpaperSettings>($, settings))
const readFocused = async ($: $) => themeById(await read<ThemeId | null>($, focused))

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value))
const hotkeyOf = (index: number) => String((index + 1) % 10)
const first = THEMES[0] as Theme

/** A stored value, read defensively: anything unknown falls back. */
const sanitize = (stored: unknown): WallpaperSettings => {
  const s = (stored ?? {}) as Partial<Record<keyof WallpaperSettings, unknown>>

  return {
    theme: themeById(typeof s.theme === 'string' ? s.theme : null)?.id ?? null,
    panel: typeof s.panel === 'boolean' ? s.panel : DEFAULTS.panel,
    ribbon: typeof s.ribbon === 'boolean' ? s.ribbon : DEFAULTS.ribbon,
  }
}

// ---------------------------------------------------------------- caches

type Kind = 'thumb' | 'preview' | 'wall' | 'ribbon'

// SVG markup is pure in its inputs, so each one is built once per module load.
const svgCache = new Map<string, string>()
const svgFor = (theme: Theme, kind: Kind, W: number, H: number, isApplied = false) => {
  const key = `${theme.id}:${kind}:${W}x${H}:${isApplied}`
  let markup = svgCache.get(key)
  if (!markup) {
    markup = svgScene(theme, {
      W,
      H,
      id: `${kind[0]}${theme.id.replace(/-/g, '')}`,
      density: kind === 'thumb' ? 0.7 : 1,
      isLight: kind === 'thumb',
      frame: kind === 'ribbon' ? 'ribbon' : 'card',
      slice: kind === 'ribbon' ? RIBBON_ROWS : undefined,
      caption:
        kind === 'preview'
          ? { title: theme.name, sub: theme.blurb }
          : kind === 'wall'
            ? { title: theme.name, sub: '/wallpaper to change' }
            : undefined,
      badge: isApplied && kind !== 'ribbon' && kind !== 'wall',
    })
    if (svgCache.size > 80) svgCache.clear()
    svgCache.set(key, markup)
  }

  return markup
}

const canvasCache = new Map<string, Canvas>()
const canvasFor = (theme: Theme, cols: number, rows: number, o: CanvasOptions = {}) => {
  const key = `${theme.id}:${cols}x${rows}:${o.density ?? 1}:${o.slice ?? false}`
  let made = canvasCache.get(key)
  if (!made) {
    made = canvas(theme, cols, rows, o)
    if (canvasCache.size > 40) canvasCache.clear()
    canvasCache.set(key, made)
  }

  return made
}

// ---------------------------------------------------------------- terminal animation

// Terminal Rasters animate by blitting new cells on a timer; the apps animate
// the SVG themselves, so nothing ticks for them.
type Live = { requestId: string; key: string; canvas: Canvas }
const live = new Map<string, Live>()
let ticker: { cancel: () => void } | undefined
const now = () => Date.now() / 1000

const animate = ($: $, requestId: string, key: string, made: Canvas) => {
  live.set(`${requestId}/${key}`, { requestId, key, canvas: made })
  if (ticker) return
  ticker = $.clock.every(83, () => {
    void (async () => {
      const t = now()
      for (const [id, entry] of live) {
        const result = await $.ui.blit({
          requestId: entry.requestId,
          key: entry.key,
          cells: frame(entry.canvas, t),
          columns: entry.canvas.cols,
          rows: entry.canvas.rows,
        })
        if (result.deny) live.delete(id)
      }
      if (live.size === 0) {
        ticker?.cancel()
        ticker = undefined
      }
    })()
  })
}

// ---------------------------------------------------------------- actions

const change = async ($: $, fn: (s: WallpaperSettings) => WallpaperSettings): Promise<WallpaperSettings> => {
  let next = DEFAULTS
  await update($, settings, current => (next = fn(sanitize(current))))
  await $.store.set('settings', next)

  return next
}

/** Opens, retitles or closes the wallpaper pane to match the settings. */
const syncWallpaper = async ($: $, s: WallpaperSettings) => {
  const theme = themeById(s.theme)
  if (theme && s.panel) {
    await $.ui.open({ id: WALL, title: theme.name })
  } else if ((await $.ui.panes()).some(pane => pane.id === WALL)) {
    await $.ui.close({ id: WALL })
  }
}

const apply = async ($: $, id: ThemeId | null) => {
  const s = await change($, current => ({ ...current, theme: id }))
  await syncWallpaper($, s)

  return s
}

const openPicker = async ($: $) => {
  const s = await readSettings($)
  await update($, focused, () => s.theme ?? first.id)
  return $.ui.open({
    id: PICKER,
    title: 'Theme',
    focus: true,
    closeOnEscape: true,
    holdToasts: true,
    rows: 26,
  })
}

// Some apps (the phone app among them) show the chat but not the panels a mod draws.
const WHERE_IT_SHOWS =
  "If nothing appears, this app doesn't draw mod panels: the picker and wallpapers show in Claude Code in a terminal, the desktop app and VS Code."

const choose = async ($: $, id: ThemeId | null) => {
  await $.ui.close({ id: PICKER })
  const s = await apply($, id)
  const theme = themeById(id)
  $.ui.toast(theme ? `${theme.name} is on` : 'Wallpaper off')

  return s
}

const toggle = async ($: $, what: 'panel' | 'ribbon') => {
  const s = await change($, current => ({ ...current, [what]: !current[what] }))
  if (what === 'panel') await syncWallpaper($, s)

  return s
}

const step = (current: ThemeId | null, by: number): ThemeId => {
  const index = current ? THEME_IDS.indexOf(current) : -1
  return THEME_IDS[(index + by + THEME_IDS.length) % THEME_IDS.length] ?? first.id
}

const USAGE = [
  '/wallpaper            open the picker (tap a theme, or Tab and Enter; Esc closes)',
  '/wallpaper <name|1-0> apply one, e.g. /wallpaper koi',
  '/wallpaper next       the next one; /wallpaper random for a surprise',
  '/wallpaper panel      show or hide the side panel',
  '/wallpaper ribbon     show or hide the ribbon above the prompt',
  '/wallpaper off        turn wallpapers off',
  '/themes works the same, or just ask Claude: "change my wallpaper to koi".',
].join('\n')

const TOOL = 'wallpaper'
const TOOL_ID = 'mcp__ascii-wallpapers__wallpaper'
const ACTIONS = ['open', 'apply', 'next', 'random', 'off', 'list', 'panel', 'ribbon'] as const

const runTheme = async ($: $, args: string): Promise<{ text: string }> => {
  const a = args.trim().toLowerCase()
  const s = await readSettings($)

  if (a === '' || a === 'pick') {
    const opened = await openPicker($)
    return {
      text: opened.isPlaced
        ? `Opened the wallpaper picker. ${WHERE_IT_SHOWS}`
        : `The picker can't be shown here (${opened.reason}). ${WHERE_IT_SHOWS}`,
    }
  }
  if (a === 'help' || a === '?') return { text: USAGE }
  if (a === 'list') {
    return {
      text: THEMES.map(
        (t, i) => `${hotkeyOf(i)}  ${t.name}${t.id === s.theme ? ' (on)' : ''}: ${t.blurb}`,
      ).join('\n'),
    }
  }
  if (a === 'off' || a === 'none' || a === 'stop') {
    await apply($, null)
    return { text: 'Wallpaper off. /wallpaper brings it back.' }
  }
  if (a === 'panel' || a === 'ribbon') {
    const after = await toggle($, a)
    return { text: `${a === 'panel' ? 'Side panel' : 'Ribbon'} ${after[a] ? 'on' : 'off'}.` }
  }
  if (a === 'next' || a === 'prev' || a === 'previous' || a === 'random' || a === 'shuffle') {
    const id =
      a === 'next'
        ? step(s.theme, 1)
        : a === 'random' || a === 'shuffle'
          ? step(s.theme, 1 + Math.floor(Math.random() * (THEME_IDS.length - 1)))
          : step(s.theme, -1)
    await apply($, id)
    return { text: `Wallpaper: ${themeById(id)?.name ?? id}.` }
  }

  const theme = findTheme(a)
  if (!theme) return { text: `No wallpaper called "${args.trim()}".\n\n${USAGE}` }
  await apply($, theme.id)
  return { text: `Wallpaper: ${theme.name}. ${theme.blurb}` }
}

// ---------------------------------------------------------------- hooks

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // /theme is Claude Code's own color theme command, and the apps keep it,
    // so the mod's own names are /wallpaper and /themes, plus a tool Claude
    // calls when the person just asks.
    await $.command.register({
      name: 'wallpaper',
      description: 'Live pixel-art wallpapers: open the picker or apply one',
      argumentHint: '[name|next|random|off]',
    })
    await $.command.register({
      name: 'themes',
      description: 'Live pixel-art wallpapers (same as /wallpaper)',
      argumentHint: '[name|next|random|off]',
    })
    await $.tool.register({
      name: TOOL,
      description: [
        "Changes the person's live pixel-art chat wallpaper (the ascii-wallpapers mod).",
        'Use it whenever they ask about wallpapers, chat themes or backgrounds: to open the picker, apply one, cycle, or turn it off.',
        `Themes: ${THEMES.map(t => t.name).join(', ')}.`,
        "Not Claude Code's color theme: that is the /theme command.",
      ].join(' '),
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: [...ACTIONS],
            description: 'open the picker; apply a theme (with `theme`); next; random; off; list; panel or ribbon to show or hide those',
          },
          theme: { type: 'string', description: 'For apply: a theme name, e.g. "Koi Pond" or "koi"' },
        },
        required: ['action'],
      },
      isDeferred: false,
    })
    const s = sanitize(await $.store.get('settings'))
    await update($, settings, () => s)
    const theme = themeById(s.theme)
    if (theme && s.panel) void $.ui.open({ id: WALL, title: theme.name })

    return next(e)
  })

  // /theme is the built-in color theme command: this mod answers it with the
  // wallpaper picker, and hands `/theme colors` to the built-in.
  on('command.describe', { command: 'theme' }, ($, e, next) =>
    next({
      ...e,
      description: 'Color theme, or live wallpapers in a terminal (/wallpaper everywhere)',
      argumentHint: '[name|next|off|colors]',
    }),
  )

  on('command.run', { command: 'theme' }, async ($, e, next) => {
    const a = e.args.trim().toLowerCase()
    if (a === 'colors' || a === 'color' || a === 'colours') return next({ ...e, args: '' })

    return runTheme($, e.args)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'wallpaper' }, ($, e) => runTheme($, e.args))
  on('command.run', { command: 'themes' }, ($, e) => runTheme($, e.args))

  on('tool.call', { tool: TOOL_ID }, async ($, e) => {
    const input = e as unknown as { action?: unknown; theme?: unknown }
    const action = typeof input.action === 'string' ? input.action : 'open'
    const theme = typeof input.theme === 'string' ? input.theme : ''
    const args = action === 'open' ? '' : action === 'apply' ? theme : action
    const { text } = await runTheme($, args)

    return { result: text }
  })

  on('ui.focus', { requestId: PICKER }, async ($, e, next) => {
    const result = await next(e)
    const theme = themeById(e.element)
    if (!result.deny && theme) await update($, focused, () => theme.id)

    return result
  }).catch(($, e, next) => next(e))

  on('ui.close', { id: PICKER }, async ($, e, next) => {
    const result = await next(e)
    await update($, focused, () => null)

    return result
  }).catch(($, e, next) => next(e))

  // ---------------------------------------------------------- the picker

  on('ui.render', { component: 'Pane', requestId: PICKER }, async ($, e) => {
    const s = await readSettings($)
    const preview = (await readFocused($)) ?? themeById(s.theme) ?? first
    const isOn = (t: Theme) => t.id === s.theme
    const position = `${THEMES.indexOf(preview) + 1}/${THEMES.length}`

    if (e.surface === 'terminal') {
      const { Box, Text, Button, Raster } = $.ui.resolve(e)
      const width = Math.max(24, e.props.bodyColumns)
      const big = canvasFor(preview, width, 9)
      animate($, PICKER, 'preview', big)

      return (
        <Box flexDirection="column" gap={1}>
          <Box justifyContent="space-between">
            <Text>
              <Text bold color="claude">/wallpaper</Text>
              <Text bold>  Live wallpapers</Text>
              <Text dimColor>  {position}</Text>
            </Text>
            <Text dimColor>tab move · ↵ apply · esc close</Text>
          </Box>
          <Raster key="preview" columns={width} rows={9} cells={frame(big, now())} />
          <Text>
            <Text bold>{preview.name}</Text>
            {isOn(preview) && <Text color="success"> ✓ applied</Text>}
            <Text dimColor>  {preview.blurb}</Text>
          </Text>
          <Box flexDirection="row" flexWrap="wrap" columnGap={2} rowGap={1}>
            {THEMES.map((t, i) => (
              <Box key={`tile-${t.id}`} flexDirection="column" width={18}>
                <Raster key={`thumb-${t.id}`} columns={18} rows={5} cells={frame(canvasFor(t, 18, 5, { density: 0.8 }), 2)} />
                <Button
                  key={t.id}
                  plain
                  hotkey={hotkeyOf(i)}
                  autoFocus={t.id === preview.id || undefined}
                  variant={isOn(t) ? 'primary' : undefined}
                  onPress={() => void choose($, t.id)}
                >
                  {t.name}
                  {isOn(t) ? ' ✓' : ''}
                </Button>
              </Box>
            ))}
          </Box>
          <Box gap={2}>
            <Button key="toggle-panel" dimColor onPress={() => void toggle($, 'panel')}>
              {s.panel ? '[x]' : '[ ]'} Side panel
            </Button>
            <Button key="toggle-ribbon" dimColor onPress={() => void toggle($, 'ribbon')}>
              {s.ribbon ? '[x]' : '[ ]'} Ribbon
            </Button>
            <Button key="off" dimColor onPress={() => void choose($, null)}>
              Turn off
            </Button>
            <Button key="colors" dimColor onPress={() => void $.command.run({ command: 'theme', args: 'colors' })}>
              Color theme…
            </Button>
          </Box>
        </Box>
      )
    }

    const { Box, Text, Button, Svg } = $.ui.resolve(e)

    return (
      <Box flexDirection="column" gap="md">
        <Box justifyContent="space-between" alignItems="center">
          <Box gap="sm" alignItems="center">
            <Text mono weight="bold" color="claude">
              /wallpaper
            </Text>
            <Text weight="semibold">Live wallpapers</Text>
            <Text size="footnote" dimColor tabular>
              {position}
            </Text>
          </Box>
          <Text mono size="footnote" dimColor>
            tab move · ↵ apply · esc close
          </Text>
        </Box>
        <Svg
          source={svgFor(preview, 'preview', 72, 26, isOn(preview))}
          alt={`${preview.name}: ${preview.blurb}`}
          isInteractive
        />
        <Box flexDirection="row" flexWrap="wrap" gap="sm">
          {THEMES.map((t, i) => (
            <Box key={`tile-${t.id}`} flexDirection="column" gap="xs" width={152}>
              <Svg source={svgFor(t, 'thumb', 44, 25, isOn(t))} alt={isOn(t) ? `${t.name}, applied` : t.name} width={152} height={86} isInteractive />
              <Button
                key={t.id}
                hotkey={hotkeyOf(i)}
                autoFocus={t.id === preview.id || undefined}
                variant={isOn(t) ? 'primary' : undefined}
                onPress={() => void choose($, t.id)}
              >
                {t.name}
              </Button>
            </Box>
          ))}
        </Box>
        <Box justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="sm">
          <Box gap="sm" alignItems="center">
            <Button key="toggle-panel" dimColor onPress={() => void toggle($, 'panel')}>
              {s.panel ? '☑' : '☐'} Side panel
            </Button>
            <Button key="toggle-ribbon" dimColor onPress={() => void toggle($, 'ribbon')}>
              {s.ribbon ? '☑' : '☐'} Ribbon above prompt
            </Button>
          </Box>
          <Box gap="sm" alignItems="center">
            <Button key="off" dimColor onPress={() => void choose($, null)}>
              Turn off
            </Button>
            <Button key="colors" dimColor onPress={() => void $.command.run({ command: 'theme', args: 'colors' })}>
              Color theme…
            </Button>
          </Box>
        </Box>
      </Box>
    )
  })

  // ---------------------------------------------------------- the wallpaper pane

  on('ui.render', { component: 'Pane', requestId: WALL }, async ($, e) => {
    const s = await readSettings($)
    const theme = themeById(s.theme)
    const columns = Math.max(16, e.props.bodyColumns)
    const roomRows = Math.max(8, e.props.scroll.bodyRows)

    if (e.surface === 'terminal') {
      const { Box, Text, Raster } = $.ui.resolve(e)
      if (!theme) return <Text dimColor>No wallpaper. Run /wallpaper to pick one.</Text>
      const rows = roomRows - 1
      const made = canvasFor(theme, columns, rows)
      animate($, WALL, 'wall', made)

      return (
        <Box flexDirection="column">
          <Raster key="wall" columns={columns} rows={rows} cells={frame(made, now())} />
          <Box justifyContent="space-between">
            <Text bold>{theme.name}</Text>
            <Text dimColor>/wallpaper to change</Text>
          </Box>
        </Box>
      )
    }

    const { Text, Svg } = $.ui.resolve(e)
    if (!theme) return <Text dimColor>No wallpaper. Run /wallpaper to pick one.</Text>
    // A cell is about twice as tall as it is wide: keep the panel's shape, in
    // tiles a little larger than the transcript's characters.
    const W = clamp(Math.round(columns * 0.62), 22, 40)
    const H = clamp(Math.round((W * 2 * roomRows) / columns), 16, 84)

    return <Svg source={svgFor(theme, 'wall', W, H)} alt={`${theme.name} wallpaper: ${theme.blurb}`} isInteractive />
  })

  // ---------------------------------------------------------- the ribbon

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await readSettings($)
    const theme = themeById(s.theme)
    if (!theme || !s.ribbon || e.props.hasSurvey) return next(e)

    if (e.surface === 'terminal') {
      const { Raster } = $.ui.resolve(e)
      const columns = Math.max(10, e.props.bodyColumns)
      const made = canvasFor(theme, columns, 3, { slice: true })
      animate($, e.requestId, 'ribbon', made)

      return <Raster key="ribbon" columns={columns} rows={3} cells={frame(made, now())} />
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={svgFor(theme, 'ribbon', 84, 22)} alt={`${theme.name} ribbon`} isInteractive />
  })
}
