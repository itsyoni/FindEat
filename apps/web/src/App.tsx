import { useCallback, useEffect, useState } from 'react'
import { DashboardPage } from './pages/DashboardPage'
import { legalPageKind } from './lib/legalRoutes'
import { PublicLegalPage } from './pages/LegalPage'
import { LoginPage } from './pages/LoginPage'
import { navigateTo, usePathname } from './lib/navigation'
import { invalidateRequestCache } from './lib/api'
import { adminSectionFromPath, businessSectionFromPath } from './lib/navigation'
import { ErrorPage } from './components/ErrorPage'
import { KnownIssuesPage } from './pages/KnownIssuesPage'

export default function App() {
  const pathname = usePathname()
  const [authenticated, setAuthenticated] = useState(
    () => Boolean(localStorage.getItem('findeat-business-token')),
  )
  const legalPage = legalPageKind(pathname)
  const knownIssuesPage = pathname === '/known-issues' || pathname === '/status'
  const knownDashboardPath = Boolean(
    businessSectionFromPath(pathname) || adminSectionFromPath(pathname),
  )
  const notFound = !legalPage
    && !knownIssuesPage
    && pathname !== '/'
    && pathname !== '/login'
    && !knownDashboardPath

  useEffect(() => {
    if (legalPage || knownIssuesPage || notFound) return
    if (authenticated && (pathname === '/' || pathname === '/login')) {
      navigateTo('/home', true)
    } else if (!authenticated && pathname !== '/login') {
      navigateTo('/login', true)
    }
  }, [authenticated, knownIssuesPage, legalPage, notFound, pathname])

  const logout = useCallback(() => {
    invalidateRequestCache()
    localStorage.removeItem('findeat-business-token')
    setAuthenticated(false)
    navigateTo('/login', true)
  }, [])

  if (legalPage) {
    return <PublicLegalPage kind={legalPage} />
  }
  if (knownIssuesPage) {
    return <KnownIssuesPage />
  }
  if (notFound) {
    return (
      <ErrorPage
        status={404}
        primaryAction={{
          label: authenticated ? 'Back to dashboard' : 'Go to sign in',
          onClick: () => navigateTo(authenticated ? '/home' : '/login'),
        }}
        secondaryAction={{
          label: 'Go back',
          onClick: () => {
            if (window.history.length > 1) window.history.back()
            else navigateTo(authenticated ? '/home' : '/login')
          },
        }}
      />
    )
  }

  return authenticated
    ? <DashboardPage onLogout={logout} />
    : <LoginPage onLogin={() => {
      setAuthenticated(true)
      navigateTo('/home', true)
    }} />
}
