# ASCII Wallpapers

Ten live pixel-art wallpapers for Claude Code, painted in character tiles and
always moving.

`/wallpaper` (or `/themes`) opens a picker: a large live preview over a grid of
ten animated thumbnails. Tap a theme to apply it; with a keyboard, Tab moves
between them (the preview follows), Enter applies, Esc closes, and 1-9 and 0 jump
straight to one. Or just ask Claude: "change my wallpaper to koi". Your choice is
remembered across sessions. It works in the desktop and mobile apps, VS Code and
the terminal.

The theme you apply plays in a side panel beside the chat, and as a slim ribbon
above the prompt. Either can be turned off from the picker.

## Themes

1. Cloud Drift: puffy clouds sail over green hills on a bright noon
2. Koi Pond: koi glide under lily pads through slow green water
3. Jellyfish: soft glowing jellies pulse upward through deep blue
4. Fireflies: a dark meadow at the edge of the woods, blinking with light
5. Moonlit: a crescent moon over sleeping hills and one warm window
6. Paper Boats: a little fleet of paper boats bobbing over teal water
7. Snowfall: quiet snow over pines, peaks and a warm cabin
8. Sakura: cherry blossoms drift across a pink mountain dusk
9. Aurora: green and violet curtains ripple over a frozen lake
0. Ember: a slow, breathing spark over glowing coals, embers rising

## Commands

| Command | What it does |
| --- | --- |
| `/wallpaper` | Open the picker |
| `/wallpaper koi`, `/wallpaper 2` | Apply a theme by name or number |
| `/wallpaper next`, `/wallpaper random` | Cycle, or pick a surprise |
| `/wallpaper panel`, `/wallpaper ribbon` | Show or hide the side panel or the ribbon |
| `/wallpaper off` | Turn wallpapers off |
| `/wallpaper list` | List the themes |

`/themes` works the same. In a terminal, `/theme` opens the picker too, and
`/theme colors` reaches Claude Code's own color theme; the apps keep `/theme`
for themselves.

## How it works

Each theme is data: a sky gradient, a soft light, and layers of procedural
pixel art (clouds, koi, jellyfish, pines, ridges, aurora curtains) plus particle
fields (stars, petals, embers), each with motion: drift, rise, bob, sway, blink
and spin. Every pixel is drawn as a small tile with a character inside. Shapes
are made for the size being drawn, so the same theme fills a tall side panel,
a wide preview and a slim ribbon. On the desktop app, mobile and VS Code it
becomes an animated SVG the app plays by itself; in a terminal each pixel is two
character cells, redrawn about twelve times a second.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install ascii-wallpapers --marketplace imk70sw/astro-blog-starter-template
```

From a shell:

```
claude plugin install ascii-wallpapers --marketplace imk70sw/astro-blog-starter-template
```

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace
with `imk70sw/astro-blog-starter-template`, then Add plugin.

## Files

- `hooks/register.tsx`: the command, picker, panel, ribbon and saved settings
- `hooks/themes.ts`: the ten themes
- `hooks/art.ts`: the procedural pixel art
- `hooks/scene.ts`: the layout and motion engine
- `hooks/render.ts`: the SVG and terminal renderers
- `tests/wallpapers.test.tsx`: tests on all four surfaces (`claude plugin test .`)
