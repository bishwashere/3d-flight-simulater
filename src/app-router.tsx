import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import { HomeScreen } from './components/home/home-screen'
import { HOME_PATH, PANEL_PATHS } from './config/menu-routes'

function MenuRouteSlot() {
  return null
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
      <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
    </Routes>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
