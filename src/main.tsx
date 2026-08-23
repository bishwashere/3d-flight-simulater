import { createRoot } from 'react-dom/client'
import '@fontsource-variable/google-sans-flex/wght.css'
import './index.css'
import { AppRouter } from './app-router'

// Babylon owns an imperative renderer on the game canvas. Mounting that canvas
// twice in React's development StrictMode starts overlapping GPU engines and
// asset requests, so the shell uses a single deterministic root lifecycle.
createRoot(document.getElementById('root')!).render(<AppRouter />)
