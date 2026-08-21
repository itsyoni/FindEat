import { useState } from 'react'
import type { FormEvent } from 'react'
import { EyeIcon, EyeSlashIcon, MoonIcon, SunIcon } from '@phosphor-icons/react'
import { request } from '../lib/api'
import { useWebTheme } from '../hooks/useWebTheme'

type LoginPageProps = {
  onLogin: () => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const { resolvedTheme, setPreference } = useWebTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await request<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('findeat-business-token', result.accessToken)
      onLogin()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[radial-gradient(circle_at_15%_10%,#ffe3d8,transparent_35%)] bg-[#f7f5f1] p-6 text-ink before:pointer-events-none before:absolute before:right-[-160px] before:bottom-[-210px] before:size-120 before:rounded-full before:bg-[#ffb7912b] before:blur-[10px] dark:bg-[radial-gradient(circle_at_15%_10%,#3a211c,transparent_35%)] dark:bg-page">
      <button
        type="button"
        className="absolute top-6 right-6 z-2 grid size-11 place-items-center rounded-[14px] border border-line bg-surface/85 text-ink shadow-panel backdrop-blur-[14px] transition hover:-translate-y-px hover:bg-surface-hover"
        onClick={() => setPreference(resolvedTheme === 'dark' ? 'light' : 'dark')}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {resolvedTheme === 'dark'
          ? <SunIcon size={19} weight="fill" />
          : <MoonIcon size={19} weight="fill" />}
      </button>
      <section className="relative z-1 w-full max-w-117.5 rounded-[28px] border border-line bg-surface p-10.5 shadow-[0_24px_70px_#2f211418] max-[520px]:p-6">
        <div className="flex items-center gap-2.75">
          <span className="grid size-11.5 place-items-center overflow-hidden rounded-[15px] border border-line bg-[#fff8ef] shadow-[0_8px_22px_#4d2a1614]">
            <img className="size-12.5 object-contain" src="/findeat-favicon.svg" alt="" />
          </span>
          <strong className="text-[19px] tracking-[-.025em] text-ink">FindEat</strong>
        </div>
        <p className="mt-5 mb-2 text-xs font-extrabold tracking-[.12em] text-accent">FINDEAT FOR BUSINESS</p>
        <h1 className="mb-4 text-[42px] leading-[1.02] tracking-[-.04em] max-[520px]:text-4xl">Run your restaurant in one place.</h1>
        <p className="m-0 leading-[1.55] text-muted">Manage your public details and menus. Create official posts from the FindEat mobile app.</p>
        <form className="mt-7 grid gap-4.25" onSubmit={submit}>
          <label className="grid gap-2 text-[13px] font-bold text-ink">
            Email
            <input
              className="min-h-12 w-full rounded-xl border border-line bg-surface-subtle px-3.5 py-3 text-ink outline-none transition placeholder:text-muted/75 hover:border-ink/25 focus:border-accent focus:bg-surface focus:ring-3 focus:ring-accent/15"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="grid gap-2 text-[13px] font-bold text-ink">
            Password
            <span className="relative block">
              <input
                className="min-h-12 w-full rounded-xl border border-line bg-surface-subtle py-3 pr-12 pl-3.5 text-ink outline-none transition placeholder:text-muted/75 hover:border-ink/25 focus:border-accent focus:bg-surface focus:ring-3 focus:ring-accent/15"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                className="absolute top-1/2 right-1.75 grid size-9 -translate-y-1/2 place-items-center rounded-[10px] border-0 bg-transparent p-0 text-muted hover:bg-surface-hover hover:text-ink"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword
                  ? <EyeSlashIcon size={19} />
                  : <EyeIcon size={19} />}
              </button>
            </span>
          </label>
          {error && <p className="m-0 rounded-[11px] border border-[#e8545438] bg-[#fff0f0] px-3.25 py-2.75 text-[13px] leading-[1.4] text-[#b32727] dark:bg-danger-soft dark:text-danger" role="alert">{error}</p>}
          <button className="mt-0.5 min-h-12.25 rounded-xl border-0 bg-accent px-4 py-3 font-extrabold text-[#faf9f6] shadow-[0_10px_24px_color-mix(in_srgb,var(--accent)_25%,transparent)] transition hover:-translate-y-px hover:brightness-95 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  )
}
