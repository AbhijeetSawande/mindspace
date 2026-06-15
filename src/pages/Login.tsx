import { useState } from 'react'
import { Brain, Shield, Wifi, Smartphone } from 'lucide-react'
import { useAuth } from '@/store/authStore'

// ─── Firebase (uncomment when Firebase is configured) ────────────────────────
// import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
// import { auth } from '@/lib/firebase'

const HAS_FIREBASE = !!(import.meta.env.VITE_FIREBASE_API_KEY)

export function Login() {
  const { signIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      if (HAS_FIREBASE) {
        // ── Firebase Google Sign-in (uncomment when ready) ──────────────────
        // const provider = new GoogleAuthProvider()
        // const result = await signInWithPopup(auth, provider)
        // signIn({
        //   name: result.user.displayName || 'User',
        //   email: result.user.email || '',
        //   photo: result.user.photoURL || undefined,
        //   uid: result.user.uid,
        // })
        // ─── Remove the demo block below once Firebase is wired ────────────
        signIn({ name: 'Demo User', email: 'demo@cortex.app', uid: 'demo-001' })
      } else {
        // Demo mode — no Firebase configured yet
        await new Promise(r => setTimeout(r, 800))
        signIn({ name: 'Demo User', email: 'demo@cortex.app', uid: 'demo-001' })
      }
    } catch (e) {
      setError('Sign-in failed. Check your Firebase config.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4 shadow-[0_0_40px_hsl(var(--glow-1)/0.3)]">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Mindspace</h1>
          <p className="text-sm text-muted-foreground mt-1">Your Personal Second Brain</p>
        </div>

        {/* Feature chips */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {['Smart Todos', 'Rich Notes', 'AI Chat', '20+ modules'].map(f => (
            <span key={f} className="text-[10px] px-2.5 py-1 rounded-full glass border border-white/10 text-muted-foreground">
              {f}
            </span>
          ))}
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 border border-white/10">
          {!HAS_FIREBASE && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-[11px] text-amber-400 text-center">
                Firebase not configured — running in demo mode.{' '}
                <a href="https://github.com" className="underline">See README</a> to enable Google sign-in.
              </p>
            </div>
          )}

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold text-sm py-3 px-4 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {loading ? 'Signing in…' : HAS_FIREBASE ? 'Continue with Google' : 'Continue (Demo Mode)'}
          </button>

          {error && (
            <p className="text-xs text-red-400 text-center mt-3">{error}</p>
          )}

          <div className="mt-4 pt-4 border-t border-white/8 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Shield className="w-3 h-3 shrink-0" />
              <span>Your data stays in your Google Drive — we never see it</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Wifi className="w-3 h-3 shrink-0" />
              <span>Works offline — syncs when connected</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Smartphone className="w-3 h-3 shrink-0" />
              <span>Installable as a phone app (PWA)</span>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 mt-6">
          Mindspace — Personal OS
        </p>
      </div>
    </div>
  )
}
