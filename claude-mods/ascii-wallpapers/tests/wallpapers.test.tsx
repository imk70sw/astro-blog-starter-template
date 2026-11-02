import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { canvas, frame, svgScene } from '../hooks/render'
import { THEMES } from '../hooks/themes'

const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const
const AS_TYPED = { origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const
const run = (command: string, args: string) => ({ command, args, ...AS_TYPED })

/** The accessible labels of every Svg drawn. */
const alts = async (ui: { findAll: (q: { type: string }) => Promise<{ props: Record<string, unknown> }[]> }) =>
  (await ui.findAll({ type: 'Svg' })).map(svg => String(svg.props.alt))

const pane = (requestId: string, title: string) =>
  ({
    plugin: 'ascii-wallpapers',
    component: 'Pane',
    requestId,
    props: {
      title,
      isFocused: true,
      bodyColumns: 96,
      placement: 'dock',
      scroll: { offset: 0, bodyRows: 30 },
      view: {},
    },
  }) as const

/** Stands in for the engine beneath the plugin, and records what it was asked. */
const engine = (on: On, stored?: Record<string, unknown>) => {
  const opened: string[] = []
  const closed: string[] = []
  const builtinRuns: string[] = []
  const store: Record<string, unknown> = { ...stored }
  on('store.get', (_, e) => ({ value: store[e.key] }))
  on('store.set', (_, e) => {
    store[e.key] = e.value
    return { value: undefined }
  })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('tool.register', (_, e) => ({ value: { tool: `mcp__ascii-wallpapers__${e.name}` } }))
  on('ui.open', (_, e) => {
    opened.push(`${e.id}:${e.title ?? ''}`)
    return { value: { isPlaced: true } }
  })
  on('ui.close', (_, e) => {
    closed.push(e.id)
    return { value: undefined }
  })
  on('ui.panes', () => ({
    value: opened.map(o => ({
      id: o.split(':')[0] ?? '',
      title: '',
      isShown: true,
      isFocused: false,
      isPlaced: true,
    })),
  }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.blit', () => ({ value: {} }))
  on('clock.every', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.run', (_, e) => {
    builtinRuns.push(`${e.command} ${e.args}`.trim())
    return { text: 'built-in' }
  })

  return { opened, closed, builtinRuns, store }
}

test('the picker draws all ten themes on every surface', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...pane('theme-picker', 'Theme'), surface })
    const buttons = await ui.findAll({ type: 'Button' })
    for (const theme of THEMES) {
      expect(buttons.some(b => b.key === theme.id)).toBe(true)
    }
    await ui.unmount()
  }
})

test('pressing a tile applies it, closes the picker and remembers it', async ($, on) => {
  const { opened, closed, store } = engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...pane('theme-picker', 'Theme'), surface: 'desktop' })
  await ui.press({ key: 'koi-pond' })
  await ui.unmount()

  expect(closed).toContain('theme-picker')
  expect(opened).toContain('wallpaper:Koi Pond')
  expect(store.settings).toMatchObject({ theme: 'koi-pond', panel: true, ribbon: true })

  // The applied tile is marked when the picker opens again.
  const again = await $.ui.mount({ ...pane('theme-picker', 'Theme'), surface: 'desktop' })
  expect(await alts(again)).toContain('Koi Pond, applied')
  await again.unmount()
})

test('a remembered theme comes back when a session starts', async ($, on) => {
  const { opened } = engine(on, { settings: { theme: 'aurora', panel: true, ribbon: false } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(opened).toContain('wallpaper:Aurora')
  const ui = await $.ui.mount({ ...pane('wallpaper', 'Aurora'), surface: 'desktop' })
  expect((await alts(ui)).some(alt => alt.startsWith('Aurora wallpaper'))).toBe(true)
  await ui.unmount()
})

test('/theme takes names and numbers, and hands colors to the built-in', async ($, on) => {
  const { opened, builtinRuns, store } = engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const byName = await $.command.run(run('theme', 'jelly'))
  expect(byName.text).toContain('Jellyfish')
  const byNumber = await $.command.run(run('theme', '0'))
  expect(byNumber.text).toContain('Ember')
  const unknown = await $.command.run(run('theme', 'volcano'))
  expect(unknown.text).toContain('No wallpaper called')

  await $.command.run(run('theme', 'colors'))
  expect(builtinRuns).toContain('theme')

  await $.command.run(run('theme', ''))
  expect(opened).toContain('theme-picker:Theme')

  const off = await $.command.run(run('wallpaper', 'off'))
  expect(off.text).toContain('off')
  expect(store.settings).toMatchObject({ theme: null })
})

test('the wallpaper pane and the ribbon draw the applied theme', async ($, on) => {
  engine(on, { settings: { theme: 'moonlit', panel: true, ribbon: true } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...pane('wallpaper', 'Moonlit'), surface })
    if (surface === 'terminal') {
      expect(await ui.find({ type: 'Text', text: /Moonlit/ })).toBeDefined()
      expect(await ui.find({ type: 'Raster' })).toBeDefined()
    } else {
      expect((await alts(ui)).some(alt => alt.startsWith('Moonlit wallpaper'))).toBe(true)
    }
    await ui.unmount()
  }

  const band = await $.ui.mount({
    plugin: 'ascii-wallpapers',
    component: 'AbovePrompt',
    surface: 'desktop',
    requestId: 'band',
    props: {
      hasSurvey: false,
      isWorking: false,
      maxRows: 10,
      bodyColumns: 100,
      scroll: { offset: 0, bodyRows: 10 },
      view: {},
    },
  })
  expect(await band.find({ type: 'Svg' })).toBeDefined()
  await band.unmount()
})

test('/themes and the wallpaper tool work where /theme is the app\'s own', async ($, on) => {
  const { opened, store } = engine(on)
  await $.session.start({ cwd: '/', surface: 'mobile', isInteractive: true })

  await $.command.run(run('themes', ''))
  expect(opened).toContain('theme-picker:Theme')

  const viaTool = await $.tool.call({ tool: 'mcp__ascii-wallpapers__wallpaper', action: 'apply', theme: 'sakura' })
  expect(viaTool.text ?? JSON.stringify(viaTool.result)).toContain('Sakura')
  expect(store.settings).toMatchObject({ theme: 'sakura' })

  await $.tool.call({ tool: 'mcp__ascii-wallpapers__wallpaper', action: 'off' })
  expect(store.settings).toMatchObject({ theme: null })
})

test('every theme renders within the limits, at every size the mod draws', async () => {
  for (const theme of THEMES) {
    for (const o of [
      { W: 72, H: 26, caption: { title: theme.name, sub: theme.blurb } },
      { W: 44, H: 25, isLight: true, badge: true },
      { W: 84, H: 22, slice: 6, frame: 'ribbon' as const },
      { W: 22, H: 16 },
      { W: 40, H: 84 },
      { W: 40, H: 16 },
    ]) {
      const markup = svgScene(theme, { id: 't', ...o })
      expect(markup.length).toBeLessThan(131072)
      expect(markup.startsWith('<svg')).toBe(true)
    }
    // 3 little-endian u32 words per cell, base64.
    expect(frame(canvas(theme, 80, 24), 12.5).length).toBe(Math.ceil((80 * 24 * 12) / 3) * 4)
    expect(frame(canvas(theme, 120, 3, { slice: true }), 3).length).toBe(Math.ceil((120 * 3 * 12) / 3) * 4)
  }
})
