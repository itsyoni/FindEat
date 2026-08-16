import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WebThemeProvider } from './contexts/WebThemeProvider.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx'
import { AppConfirmProvider } from './components/AppConfirmProvider.tsx'
import { AppPromptProvider } from './components/AppPromptProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WebThemeProvider>
      <AppErrorBoundary>
        <AppConfirmProvider>
          <AppPromptProvider>
            <App />
          </AppPromptProvider>
        </AppConfirmProvider>
      </AppErrorBoundary>
    </WebThemeProvider>
  </StrictMode>,
)
