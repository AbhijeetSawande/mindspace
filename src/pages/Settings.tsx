import { useState, useEffect } from 'react'
import { useApp, type Theme } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { Check, Eye, EyeOff, Key, User, Palette, ExternalLink, ShieldCheck } from 'lucide-react'

const THEMES: { id: Theme; label: string; desc: string; colors: string[] }[] = [
  { id: 'dark', label: 'Dark', desc: 'Easy on the eyes', colors: ['#0f1117', '#8b5cf6', '#1a1b23'] },
  { id: 'light', label: 'Light', desc: 'Clean and bright', colors: ['#f5f6fa', '#7c3aed', '#e8eaf0'] },
]

const GEMINI_KEY = 'cortex-gemini-key'
const PROFILE_KEY = 'cortex-profile'

interface Profile { name: string; role: string }

function loadProfile(): Profile {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') } catch { return { name: '', role: '' } }
}

export function Settings() {
  const { theme, setTheme } = useApp()

  // ── Gemini key ──
  const [geminiKey, setGeminiKeyState] = useState(() => localStorage.getItem(GEMINI_KEY) || '')
  const [showKey, setShowKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const [keyError, setKeyError] = useState('')

  // ── Profile ──
  const [profile, setProfileState] = useState<Profile>(loadProfile)
  const [profileSaved, setProfileSaved] = useState(false)

  // Validate Gemini key format (starts with AIza, length >= 20)
  const isValidKeyFormat = (k: string) => !k || (k.startsWith('AIza') && k.length >= 20)

  const handleKeyChange = (value: string) => {
    const trimmed = value.trim()
    setGeminiKeyState(trimmed)
    setKeySaved(false)
    setKeyError('')
    if (trimmed && !isValidKeyFormat(trimmed)) {
      setKeyError('Gemini keys start with "AIza" and are at least 20 characters.')
    }
  }

  const saveKey = () => {
    if (keyError) return
    localStorage.setItem(GEMINI_KEY, geminiKey)
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2500)
  }

  const clearKey = () => {
    localStorage.removeItem(GEMINI_KEY)
    setGeminiKeyState('')
    setKeySaved(false)
    setKeyError('')
  }

  const handleProfileChange = (field: keyof Profile, value: string) => {
    const updated = { ...profile, [field]: value }
    setProfileState(updated)
    setProfileSaved(false)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated))
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 1500)
  }

  const maskedKey = geminiKey
    ? geminiKey.slice(0, 8) + '•'.repeat(Math.max(0, geminiKey.length - 8))
    : ''

  const isKeyStored = !!localStorage.getItem(GEMINI_KEY)

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── Theme ── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Theme</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Choose your visual style</p>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                'glass rounded-xl p-4 flex flex-col gap-2 border transition-all duration-200 text-left',
                theme === t.id ? 'border-primary/50 bg-primary/10' : 'border-transparent hover:border-white/10'
              )}
            >
              <div className="flex gap-1.5 mb-1">
                {t.colors.map((c, i) => (
                  <div key={i} className="w-5 h-5 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{t.label}</span>
                {theme === t.id && <Check className="w-3 h-3 text-primary" />}
              </div>
              <span className="text-[10px] text-muted-foreground">{t.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Gemini API Key ── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI Configuration</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Powers AI Chat, Health companion, Finance advisor, Vocabulary, Roadmaps, and Language practice.
        </p>
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Gemini API Key</label>
            {isKeyStored && (
              <span className="flex items-center gap-1 text-[10px] text-green-400">
                <ShieldCheck className="w-3 h-3" /> Saved
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={geminiKey}
              onChange={e => handleKeyChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              placeholder="AIza..."
              autoComplete="off"
              spellCheck={false}
              className={cn(
                'w-full bg-white/5 border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors',
                keyError ? 'border-red-500/50 focus:border-red-500/70' : 'border-white/10 focus:border-primary/50'
              )}
            />
            <button
              type="button"
              onClick={() => setShowKey(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {keyError && <p className="text-xs text-red-400">{keyError}</p>}

          <div className="flex items-center gap-2">
            <button
              onClick={saveKey}
              disabled={!!keyError || !geminiKey}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all',
                keySaved
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              {keySaved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : 'Save Key'}
            </button>
            {geminiKey && (
              <button onClick={clearKey} className="px-3 py-2 rounded-lg glass text-xs text-red-400/70 hover:text-red-400 transition-colors">
                Clear
              </button>
            )}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Get free key <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="glass rounded-lg px-3 py-2 space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium">Free tier includes:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {['1,500 requests/day', 'gemini-2.0-flash model', 'No credit card needed', 'Resets daily at midnight'].map(f => (
                <div key={f} className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                  <div className="w-1 h-1 rounded-full bg-green-400/60 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 text-[10px] text-muted-foreground/60">
            <ShieldCheck className="w-3 h-3 shrink-0 mt-0.5 text-green-400/60" />
            <span>Your API key is stored only in this browser's localStorage. It is never sent to any server — only directly to Google's Gemini API from your browser.</span>
          </div>
        </div>
      </section>

      {/* ── Profile ── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Profile</h3>
          {profileSaved && (
            <span className="flex items-center gap-1 text-[10px] text-green-400 ml-2">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">Used by AI features to give you personalised responses</p>
        <div className="glass rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Display Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={e => handleProfileChange('name', e.target.value)}
              placeholder="Your name"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Role / Context</label>
            <input
              type="text"
              value={profile.role}
              onChange={e => handleProfileChange('role', e.target.value)}
              placeholder="e.g. SDE2 Data Engineer at Deloitte"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <p className="text-[10px] text-muted-foreground/60 mt-1.5">AI assistants use this context to tailor responses to your field and goals.</p>
          </div>
        </div>
      </section>

      {/* ── Google Integration (coming later) ── */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1">Google Integration</h3>
        <p className="text-xs text-muted-foreground mb-4">Sync Google Calendar and Drive</p>
        <div className="glass rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg">G</div>
          <div>
            <p className="text-sm font-medium text-foreground">Sign in with Google</p>
            <p className="text-xs text-muted-foreground">Coming soon — Calendar, Drive, Gmail</p>
          </div>
          <button className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-white/5 text-muted-foreground border border-white/10 cursor-not-allowed" disabled>
            Soon
          </button>
        </div>
      </section>
    </div>
  )
}
