import type { MenuPanelId } from '../types/menu'

export const HOME_PATH = '/'
export const LEVEL_ONE_PATH = '/game/level-1'

export const PANEL_PATHS: Readonly<Record<MenuPanelId, string>> = {
  controls: '/controls',
  credits: '/credits',
  levels: '/play',
  settings: '/settings',
}

export const MENU_ROUTE_PATHS = [HOME_PATH, ...Object.values(PANEL_PATHS)]

const PANELS_BY_PATH = new Map(
  Object.entries(PANEL_PATHS).map(([panel, path]) => [
    path,
    panel as MenuPanelId,
  ]),
)

export function getMenuPanelFromPath(pathname: string): MenuPanelId | null {
  return PANELS_BY_PATH.get(pathname) ?? null
}
