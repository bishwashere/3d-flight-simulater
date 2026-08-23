import { lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import { HomeScreen } from './components/home/home-screen'
import {
  HOME_PATH,
  LEVEL_ONE_PATH,
  PANEL_PATHS,
} from './config/menu-routes'
import { useGameAmbience } from './hooks/use-game-ambience'

const LevelOneRoute = lazy(() =>
  import('./components/game/level-one-route').then((module) => ({
    default: module.LevelOneRoute,
  })),
)

function MenuRouteSlot() {
  return null
}

function LevelRouteFallback() {
  return (
    <main className="fixed inset-0 grid place-items-center bg-flight-950 text-flight-100">
      <div className="flex items-center gap-3 text-sm font-semibold tracking-[0.18em] text-hud">
        <span className="size-4 animate-spin rounded-full border-2 border-flight-700 border-t-hud" />
        LOADING LEVEL 1
      </div>
    </main>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path={HOME_PATH} element={<HomeScreen />}>
        <Route index element={<MenuRouteSlot />} />
        {Object.values(PANEL_PATHS).map((path) => (
          <Route key={path} path={path.slice(1)} element={<MenuRouteSlot />} />
        ))}
      </Route>
      <Route
        path={LEVEL_ONE_PATH}
        element={
          <Suspense fallback={<LevelRouteFallback />}>
            <LevelOneRoute />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
    </Routes>
  )
}

export function AppRouter() {
  useGameAmbience()

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
