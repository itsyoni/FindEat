import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WebThemeProvider } from './contexts/WebThemeProvider.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WebThemeProvider>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </WebThemeProvider>
  </StrictMode>,
)
