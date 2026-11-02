export type ThemeId =
  | 'cloud-drift'
  | 'koi-pond'
  | 'jellyfish'
  | 'fireflies'
  | 'moonlit'
  | 'paper-boats'
  | 'snowfall'
  | 'sakura'
  | 'aurora'
  | 'ember'

/** What the person chose, kept in $.store across sessions. */
export type WallpaperSettings = {
  /** The applied wallpaper; null when wallpapers are off. */
  theme: ThemeId | null
  /** Show the wallpaper in a pane beside the chat. */
  panel: boolean
  /** Show a slim animated ribbon above the prompt. */
  ribbon: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'ascii-wallpapers': {
      settings: WallpaperSettings
      /** The tile the picker's focus ring is on, previewed large. */
      focused: ThemeId | null
    }
  }
}
