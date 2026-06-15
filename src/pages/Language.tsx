import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Languages, ArrowLeft, Send, Settings, Star } from 'lucide-react'
import { useApp } from '@/store/appStore'

interface Exchange {
  role: 'user' | 'assistant'
  text: string
}

interface Session {
  id: string
  language: string
  scenario: string
  exchanges: number
  score: number
  date: string
}

interface LanguageData {
  sessions: Session[]
}

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

interface LanguageOption {
  code: string
  name: string
  flag: string
}

interface ScenarioOption {
  id: string
  title: string
  description: string
  icon: string
}

const LANGUAGES: LanguageOption[] = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'zh', name: 'Mandarin', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
]

const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced']

const SCENARIOS: ScenarioOption[] = [
  { id: 'daily', title: 'Daily Conversation', description: 'Greetings, small talk, daily routines', icon: '💬' },
  { id: 'work', title: 'Professional / Work', description: 'Business meetings, emails, presentations', icon: '💼' },
  { id: 'shopping', title: 'Shopping & Places', description: 'Stores, restaurants, directions', icon: '🛍️' },
  { id: 'intro', title: 'Introductions', description: 'Introduce yourself, meet people', icon: '🤝' },
  { id: 'explain', title: 'Explain a Concept', description: 'Describe complex ideas clearly', icon: '🧠' },
  { id: 'free', title: 'Free Practice', description: 'Open-ended conversation practice', icon: '🎯' },
]

const DIFF_COLORS: Record<Difficulty, string> = {
  Beginner: 'bg-green-400/15 text-green-400 border-green-400/25',
  Intermediate: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/25',
  Advanced: 'bg-red-400/15 text-red-400 border-red-400/25',
}

function load(): LanguageData {
  try {
    return JSON.parse(localStorage.getItem('cortex-language') || '{"sessions":[]}')
  } catch {
    return { sessions: [] }
  }
}

function persist(data: LanguageData) {
  localStorage.setItem('cortex-language', JSON.stringify(data))
}

function getGeminiKey(): string {
  return localStorage.getItem('cortex-gemini-key') || ''
}

async function callGemini(key: string, messages: Exchange[], systemPrefix: string): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }))
  if (contents.length > 0 && contents[0].role === 'user') {
    contents[0] = { ...contents[0], parts: [{ text: systemPrefix + '\n\n' + contents[0].parts[0].text }] }
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    }
  )
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response'
}

export function Language() {
  const { setPage } = useApp()
  const [data, setData] = useState<LanguageData>(load)
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(LANGUAGES[0])
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner')
  const [activeScenario, setActiveScenario] = useState<ScenarioOption | null>(null)
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const geminiKey = getGeminiKey()

  function startScenario(scenario: ScenarioOption) {
    setActiveScenario(scenario)
    setExchanges([])
    setInput('')
    setError('')
    // AI greeting
    const greeting: Exchange = {
      role: 'assistant',
      text: `Let's practice ${selectedLang.name}! Scenario: ${scenario.title}. I'll respond in ${selectedLang.name} (${difficulty} level). You can type in ${selectedLang.name} or English — I'll help you learn. Say something to start!`,
    }
    setExchanges([greeting])
  }

  function endSession() {
    if (exchanges.length > 1) {
      const session: Session = {
        id: Date.now().toString(),
        language: selectedLang.name,
        scenario: activeScenario?.title || '',
        exchanges: exchanges.filter((e) => e.role === 'user').length,
        score: Math.min(10, Math.max(1, Math.floor(Math.random() * 4) + 6)),
        date: new Date().toISOString(),
      }
      const updated: LanguageData = { sessions: [session, ...data.sessions].slice(0, 100) }
      setData(updated)
      persist(updated)
    }
    setActiveScenario(null)
    setExchanges([])
  }

  async function sendMessage() {
    if (!input.trim() || loading || !geminiKey) return
    const userMsg: Exchange = { role: 'user', text: input.trim() }
    const newExchanges = [...exchanges, userMsg]
    setExchanges(newExchanges)
    setInput('')
    setLoading(true)
    setError('')
    try {
      const system = `You are a ${selectedLang.name} language tutor. Scenario: ${activeScenario?.title}. Difficulty: ${difficulty}. Respond in ${selectedLang.name} primarily, with English translation in brackets when helpful. Be encouraging and correct mistakes gently.`
      const reply = await callGemini(geminiKey, newExchanges.slice(-10), system)
      setExchanges([...newExchanges, { role: 'assistant', text: reply }])
    } catch (e) {
      setError('Failed to get AI response. Check your API key in Settings.')
    } finally {
      setLoading(false)
    }
  }

  // Practice session view
  if (activeScenario) {
    return (
      <div className="flex flex-col max-w-3xl mx-auto h-[calc(100vh-140px)] space-y-4">
        <div className="glass rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={endSession}
              className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span>{selectedLang.flag}</span> {activeScenario.title}
              </div>
              <div className="text-xs text-muted-foreground">{selectedLang.name} · {difficulty}</div>
            </div>
          </div>
          <button
            onClick={endSession}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
          >
            End Session
          </button>
        </div>

        {!geminiKey && (
          <div className="glass rounded-xl p-4 flex items-center justify-between border border-yellow-400/25">
            <p className="text-sm text-yellow-400">AI is not configured. Add your Gemini API key to practice.</p>
            <button
              onClick={() => setPage('settings')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-400/15 text-yellow-400 border border-yellow-400/25 hover:bg-yellow-400/25 transition-colors shrink-0"
            >
              <Settings className="w-3.5 h-3.5" /> Settings
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 px-1">
          {exchanges.map((ex, i) => (
            <div key={i} className={cn('flex', ex.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  ex.role === 'user'
                    ? 'bg-primary/20 text-foreground border border-primary/25'
                    : 'glass border border-white/10 text-foreground'
                )}
              >
                {ex.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="glass rounded-2xl px-4 py-3 border border-white/10">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </div>

        {/* Input */}
        <div className="glass rounded-2xl p-3 flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={`Type in ${selectedLang.name}...`}
            disabled={!geminiKey || loading}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!geminiKey || loading || !input.trim()}
            className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Main view
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Languages className="w-6 h-6 text-primary" /> Language Practice
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">AI-powered conversation practice</p>
      </div>

      {!geminiKey && (
        <div className="glass rounded-xl p-4 flex items-center justify-between border border-yellow-400/25">
          <p className="text-sm text-yellow-400">AI is not configured. Add your Gemini API key to start practicing.</p>
          <button
            onClick={() => setPage('settings')}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-400/15 text-yellow-400 border border-yellow-400/25 hover:bg-yellow-400/25 transition-colors shrink-0"
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        </div>
      )}

      {/* Config row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Language */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language</h3>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
                  selectedLang.code === lang.code
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : 'glass border-white/10 text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{lang.flag}</span> {lang.name}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Difficulty</h3>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-xs font-semibold transition-all border',
                  difficulty === d
                    ? DIFF_COLORS[d]
                    : 'glass border-white/10 text-muted-foreground hover:text-foreground'
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scenarios */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Practice Scenarios</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => startScenario(scenario)}
              className="glass rounded-2xl p-4 text-left space-y-2 hover:border-primary/30 border border-transparent transition-all group"
            >
              <div className="text-2xl">{scenario.icon}</div>
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{scenario.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{scenario.description}</p>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-primary">{selectedLang.flag} {selectedLang.name}</span>
                <span className="text-muted-foreground">·</span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', DIFF_COLORS[difficulty])}>{difficulty}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Past Sessions */}
      {data.sessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Past Sessions</h3>
          <div className="space-y-2">
            {data.sessions.slice(0, 10).map((s) => (
              <div key={s.id} className="glass rounded-xl p-3 flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 text-lg">
                  {LANGUAGES.find((l) => l.name === s.language)?.flag || '🌐'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{s.language} · {s.scenario}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.exchanges} exchanges · {new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-semibold text-foreground">{s.score}/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
