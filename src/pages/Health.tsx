import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Droplets, Moon, Footprints, Dumbbell, Save, Settings2,
  Bot, Send, Cpu, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useApp } from '@/store/appStore'

// ─── Types ───────────────────────────────────────────────────────────────────

type MoodLevel = 1 | 2 | 3 | 4 | 5

interface DailyLog {
  date: string
  water: number
  sleep: number
  steps: number
  workout: number
  mood: MoodLevel
  stress: number
  meals: string[]
}

interface HealthProfile {
  waterTarget: number
  sleepTarget: number
  stepsTarget: number
  workoutTarget: number
}

interface HealthData {
  logs: DailyLog[]
  profile: HealthProfile
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'cortex-health'
const GEMINI_KEY_LS = 'cortex-gemini-key'
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const MOODS: { level: MoodLevel; emoji: string; label: string }[] = [
  { level: 1, emoji: '😞', label: 'Bad' },
  { level: 2, emoji: '😐', label: 'Meh' },
  { level: 3, emoji: '🙂', label: 'Okay' },
  { level: 4, emoji: '😊', label: 'Good' },
  { level: 5, emoji: '🔥', label: 'Pumped' },
]

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

const DEFAULT_PROFILE: HealthProfile = {
  waterTarget: 8,
  sleepTarget: 8,
  stepsTarget: 8000,
  workoutTarget: 30,
}

const HEALTH_SUGGESTIONS = [
  'Am I sleeping enough?',
  'How\'s my stress this week?',
  'What should I focus on today?',
  'How can I improve my energy?',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

function todayISO(): string {
  return toISO(new Date())
}

function loadData(): HealthData {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { logs: [], profile: { ...DEFAULT_PROFILE } }
    const parsed = JSON.parse(raw) as Partial<HealthData>
    return {
      logs: parsed.logs ?? [],
      profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) },
    }
  } catch {
    return { logs: [], profile: { ...DEFAULT_PROFILE } }
  }
}

function saveData(data: HealthData): void {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

function getEmptyLog(date: string): DailyLog {
  return { date, water: 0, sleep: 0, steps: 0, workout: 0, mood: 3, stress: 5, meals: [] }
}

function moodEmoji(level: MoodLevel): string {
  return MOODS.find(m => m.level === level)?.emoji ?? '🙂'
}

function stressColor(stress: number): string {
  if (stress <= 3) return 'text-green-400'
  if (stress <= 6) return 'text-yellow-400'
  return 'text-red-400'
}

function stressTrackColor(stress: number): string {
  if (stress <= 3) return '#4ade80'
  if (stress <= 6) return '#facc15'
  return '#f87171'
}

function last7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(toISO(d))
  }
  return days
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BarProgress({ value, max, color = 'bg-primary' }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0)
  return (
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function WaterDots({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'w-3 h-3 rounded-full transition-all',
            i < filled ? 'bg-blue-400' : 'bg-white/15'
          )}
        />
      ))}
    </div>
  )
}

// ─── Tab: Daily Log ────────────────────────────────────────────────────────────

function DailyLogTab({ data, onSave }: { data: HealthData; onSave: (log: DailyLog) => void }) {
  const today = todayISO()
  const existing = data.logs.find(l => l.date === today)
  const [log, setLog] = useState<DailyLog>(existing ?? getEmptyLog(today))

  // Sync if data changes externally
  useEffect(() => {
    const found = data.logs.find(l => l.date === today)
    if (found) setLog(found)
  }, [data, today])

  function patch(partial: Partial<DailyLog>) {
    setLog(prev => ({ ...prev, ...partial }))
  }

  function toggleMeal(meal: string) {
    setLog(prev => ({
      ...prev,
      meals: prev.meals.includes(meal)
        ? prev.meals.filter(m => m !== meal)
        : [...prev.meals, meal],
    }))
  }

  const { profile } = data

  return (
    <div className="space-y-4">
      {/* Date header */}
      <div className="glass rounded-xl px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        <span className="text-xs text-muted-foreground">Today</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Water */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-foreground">Water</span>
            </div>
            <span className="text-xs text-muted-foreground">{log.water}/{profile.waterTarget} glasses</span>
          </div>
          <WaterDots filled={log.water} total={profile.waterTarget} />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => patch({ water: Math.max(0, log.water - 1) })}
              className="w-8 h-8 rounded-lg glass border border-white/10 text-foreground hover:bg-white/10 transition-colors flex items-center justify-center text-lg font-light"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className="flex-1 text-center text-lg font-bold text-foreground">{log.water}</span>
            <button
              onClick={() => patch({ water: Math.min(12, log.water + 1) })}
              className="w-8 h-8 rounded-lg glass border border-white/10 text-foreground hover:bg-white/10 transition-colors flex items-center justify-center"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sleep */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-medium text-foreground">Sleep</span>
            </div>
            <span className="text-xs text-muted-foreground">{log.sleep}/{profile.sleepTarget} hrs</span>
          </div>
          <BarProgress value={log.sleep} max={profile.sleepTarget} color="bg-indigo-400" />
          <input
            type="number"
            min={0}
            max={12}
            step={0.5}
            value={log.sleep || ''}
            onChange={e => patch({ sleep: Math.min(12, Math.max(0, parseFloat(e.target.value) || 0)) })}
            placeholder="0"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
          />
        </div>

        {/* Steps */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Footprints className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-foreground">Steps</span>
            </div>
            <span className="text-xs text-muted-foreground">{log.steps.toLocaleString()}/{profile.stepsTarget.toLocaleString()}</span>
          </div>
          <BarProgress value={log.steps} max={profile.stepsTarget} color="bg-green-400" />
          <input
            type="number"
            min={0}
            value={log.steps || ''}
            onChange={e => patch({ steps: Math.max(0, parseInt(e.target.value) || 0) })}
            placeholder="0"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
          />
        </div>

        {/* Workout */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-foreground">Workout</span>
            </div>
            <span className="text-xs text-muted-foreground">{log.workout}/{profile.workoutTarget} min</span>
          </div>
          <BarProgress value={log.workout} max={profile.workoutTarget} color="bg-orange-400" />
          <input
            type="number"
            min={0}
            value={log.workout || ''}
            onChange={e => patch({ workout: Math.max(0, parseInt(e.target.value) || 0) })}
            placeholder="0"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
          />
        </div>
      </div>

      {/* Mood */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <span className="text-sm font-medium text-foreground">Mood</span>
        <div className="flex gap-3 flex-wrap">
          {MOODS.map(m => (
            <button
              key={m.level}
              onClick={() => patch({ mood: m.level })}
              title={m.label}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all',
                log.mood === m.level
                  ? 'bg-primary/20 border-primary/40 scale-105'
                  : 'border-white/10 glass hover:bg-white/10'
              )}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-[10px] text-muted-foreground">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stress */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Stress Level</span>
          <span className={cn('text-sm font-bold', stressColor(log.stress))}>{log.stress}/10</span>
        </div>
        <div className="relative">
          <input
            type="range"
            min={1}
            max={10}
            value={log.stress}
            onChange={e => patch({ stress: parseInt(e.target.value) })}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${stressTrackColor(log.stress)} ${(log.stress - 1) * 11.11}%, rgba(255,255,255,0.1) ${(log.stress - 1) * 11.11}%)`,
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Relaxed</span>
          <span>Moderate</span>
          <span>High Stress</span>
        </div>
      </div>

      {/* Meals */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <span className="text-sm font-medium text-foreground">Meals Logged</span>
        <div className="flex gap-2 flex-wrap">
          {MEALS.map(meal => (
            <button
              key={meal}
              onClick={() => toggleMeal(meal)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                log.meals.includes(meal)
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'glass border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20'
              )}
            >
              {meal}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={() => onSave(log)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/30 transition-colors"
      >
        <Save className="w-4 h-4" />
        Save Today's Log
      </button>
    </div>
  )
}

// ─── Tab: History ─────────────────────────────────────────────────────────────

function HistoryTab({ data }: { data: HealthData }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const days = last7Days()
  const logMap = Object.fromEntries(data.logs.map(l => [l.date, l]))

  const weekLogs = days.map(d => logMap[d] ?? null)
  const validLogs = weekLogs.filter(Boolean) as DailyLog[]

  const avgWater = validLogs.length ? (validLogs.reduce((s, l) => s + l.water, 0) / validLogs.length).toFixed(1) : '—'
  const avgSleep = validLogs.length ? (validLogs.reduce((s, l) => s + l.sleep, 0) / validLogs.length).toFixed(1) : '—'
  const avgMoodNum = validLogs.length ? validLogs.reduce((s, l) => s + l.mood, 0) / validLogs.length : null
  const avgMood = avgMoodNum !== null ? moodEmoji(Math.round(avgMoodNum) as MoodLevel) : '—'

  const selected = selectedDate ? logMap[selectedDate] : null

  return (
    <div className="space-y-4">
      {/* 7-day row */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(date => {
          const log = logMap[date]
          const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)
          const dayNum = new Date(date + 'T12:00:00').getDate()
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(selectedDate === date ? null : date)}
              className={cn(
                'glass rounded-xl p-2 flex flex-col items-center gap-1 border transition-all hover:border-primary/30',
                selectedDate === date ? 'border-primary/50 bg-primary/10' : 'border-transparent',
                !log && 'opacity-50'
              )}
            >
              <span className="text-[10px] text-muted-foreground font-medium">{dayLabel}</span>
              <span className="text-xs font-bold text-foreground">{dayNum}</span>
              {log ? (
                <>
                  <div className="flex flex-wrap justify-center gap-0.5">
                    {Array.from({ length: Math.min(log.water, 4) }).map((_, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    ))}
                  </div>
                  <span className="text-[11px]">{moodEmoji(log.mood)}</span>
                  <span className="text-[10px] text-muted-foreground">{log.sleep}h</span>
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground/50">—</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Weekly average */}
      <div className="glass rounded-2xl p-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Avg Water</p>
          <p className="text-lg font-bold text-blue-400">{avgWater}</p>
          <p className="text-[10px] text-muted-foreground">glasses/day</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Avg Sleep</p>
          <p className="text-lg font-bold text-indigo-400">{avgSleep}</p>
          <p className="text-[10px] text-muted-foreground">hours/night</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Avg Mood</p>
          <p className="text-2xl">{avgMood}</p>
        </div>
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {new Date(selected.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <span className="text-2xl">{moodEmoji(selected.mood)}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Water', value: `${selected.water} glasses`, icon: '💧' },
              { label: 'Sleep', value: `${selected.sleep} hrs`, icon: '😴' },
              { label: 'Steps', value: selected.steps.toLocaleString(), icon: '👟' },
              { label: 'Workout', value: `${selected.workout} min`, icon: '🏋️' },
            ].map(item => (
              <div key={item.label} className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xl mb-1">{item.icon}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Stress:</span>
            <span className={cn('text-sm font-bold', stressColor(selected.stress))}>{selected.stress}/10</span>
            <span className="text-xs text-muted-foreground ml-2">Meals:</span>
            <span className="text-xs text-foreground">{selected.meals.length > 0 ? selected.meals.join(', ') : 'None logged'}</span>
          </div>
        </div>
      )}

      {validLogs.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">
          No logs yet. Start tracking in the Daily Log tab.
        </div>
      )}
    </div>
  )
}

// ─── Tab: AI Companion ────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

function AICompanionTab({ data }: { data: HealthData }) {
  const { setPage } = useApp()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const apiKey = localStorage.getItem(GEMINI_KEY_LS) || ''
  const hasKey = Boolean(apiKey)

  const today = todayISO()
  const todayLog = data.logs.find(l => l.date === today)
  const { profile } = data

  const last7 = last7Days()
  const weekLogs = last7.map(d => data.logs.find(l => l.date === d)).filter(Boolean) as DailyLog[]

  function buildContext(): string {
    const lines: string[] = [
      'You are Mindspace Health AI, a personal health and wellness companion. Be warm, concise, and actionable.',
      '',
      `User health profile — targets: Water ${profile.waterTarget} glasses, Sleep ${profile.sleepTarget}h, Steps ${profile.stepsTarget.toLocaleString()}, Workout ${profile.workoutTarget} min.`,
      '',
    ]
    if (todayLog) {
      lines.push(`Today (${today}): water=${todayLog.water}/${profile.waterTarget}, sleep=${todayLog.sleep}h, steps=${todayLog.steps.toLocaleString()}, workout=${todayLog.workout}min, mood=${moodEmoji(todayLog.mood)}, stress=${todayLog.stress}/10, meals=[${todayLog.meals.join(', ')}].`)
    } else {
      lines.push('Today: No log recorded yet.')
    }
    if (weekLogs.length > 0) {
      const avgSleep = (weekLogs.reduce((s, l) => s + l.sleep, 0) / weekLogs.length).toFixed(1)
      const avgStress = (weekLogs.reduce((s, l) => s + l.stress, 0) / weekLogs.length).toFixed(1)
      const avgWater = (weekLogs.reduce((s, l) => s + l.water, 0) / weekLogs.length).toFixed(1)
      lines.push(`Weekly averages (${weekLogs.length} days): sleep=${avgSleep}h, stress=${avgStress}/10, water=${avgWater} glasses.`)
    }
    return lines.join('\n')
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(userText?: string) {
    const text = (userText ?? input).trim()
    if (!text || loading || !hasKey) return
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)
    setError('')

    try {
      const systemCtx = buildContext()
      const contents = history.map((m, idx) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: idx === 0 && m.role === 'user' ? systemCtx + '\n\nUser: ' + m.text : m.text }],
      }))
      const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`)
      }
      const responseData = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
      const reply = responseData.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response received.'
      setMessages([...history, { id: (Date.now() + 1).toString(), role: 'assistant', text: reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get response.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[520px]">
      {/* Header */}
      <div className="glass rounded-2xl p-3 flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Health AI Companion</p>
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Gemini 2.0 Flash</span>
              <span className={cn('w-1.5 h-1.5 rounded-full', hasKey ? 'bg-green-400' : 'bg-red-400')} />
            </div>
          </div>
        </div>
      </div>

      {!hasKey && (
        <div className="glass rounded-xl p-3 mb-3 flex items-center justify-between border border-yellow-400/25 shrink-0">
          <p className="text-xs text-yellow-400">Add Gemini API key in Settings to enable AI</p>
          <button
            onClick={() => setPage('settings')}
            className="text-xs px-3 py-1.5 rounded-lg bg-yellow-400/15 text-yellow-400 border border-yellow-400/25 hover:bg-yellow-400/25 transition-colors shrink-0 ml-2"
          >
            Settings
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pb-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
            <Bot className="w-10 h-10 text-primary/50" />
            <p className="text-xs text-muted-foreground">Ask your health companion anything about your vitals, habits, and wellness goals.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {HEALTH_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  disabled={!hasKey}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-xl glass border border-white/10 text-muted-foreground hover:text-foreground hover:border-primary/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-primary" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary/20 border border-primary/25 text-foreground rounded-tr-sm'
                  : 'glass border border-white/10 text-foreground rounded-tl-sm'
              )}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Bot className="w-3 h-3 text-primary" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm px-3 py-2 border border-white/10">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map(delay => (
                  <span key={delay} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="glass rounded-xl p-2 border border-red-400/25 text-xs text-red-400 text-center">{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="glass rounded-xl p-2.5 flex items-end gap-2 shrink-0 mt-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={hasKey ? 'Ask about your health...' : 'Add API key in Settings'}
          disabled={!hasKey || loading}
          rows={1}
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed disabled:opacity-50"
        />
        <button
          onClick={() => send()}
          disabled={!hasKey || loading || !input.trim()}
          className="p-2 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────

function SettingsTab({ data, onSaveProfile }: { data: HealthData; onSaveProfile: (p: HealthProfile) => void }) {
  const [profile, setProfile] = useState<HealthProfile>({ ...data.profile })

  function patchProfile(partial: Partial<HealthProfile>) {
    setProfile(prev => ({ ...prev, ...partial }))
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="glass rounded-2xl p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          Daily Targets
        </h3>

        {([
          { key: 'waterTarget', label: '💧 Water Target', unit: 'glasses', min: 1, max: 20 },
          { key: 'sleepTarget', label: '😴 Sleep Target', unit: 'hours', min: 4, max: 12 },
          { key: 'stepsTarget', label: '👟 Steps Target', unit: 'steps', min: 1000, max: 30000 },
          { key: 'workoutTarget', label: '🏋️ Workout Target', unit: 'minutes', min: 5, max: 180 },
        ] as { key: keyof HealthProfile; label: string; unit: string; min: number; max: number }[]).map(field => (
          <div key={field.key} className="space-y-1">
            <label className="text-xs text-muted-foreground">{field.label}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={field.min}
                max={field.max}
                value={profile[field.key]}
                onChange={e => patchProfile({ [field.key]: Math.max(field.min, parseInt(e.target.value) || field.min) })}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
              />
              <span className="text-xs text-muted-foreground w-16">{field.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSaveProfile(profile)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/20 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/30 transition-colors"
      >
        <Save className="w-4 h-4" />
        Save Settings
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'log' | 'history' | 'ai' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'log', label: 'Daily Log' },
  { id: 'history', label: 'History' },
  { id: 'ai', label: 'AI Companion' },
  { id: 'settings', label: 'Settings' },
]

export function Health() {
  const [tab, setTab] = useState<Tab>('log')
  const [data, setData] = useState<HealthData>(loadData)
  const [savedMsg, setSavedMsg] = useState('')

  function handleSaveLog(log: DailyLog) {
    const updated: HealthData = {
      ...data,
      logs: [
        ...data.logs.filter(l => l.date !== log.date),
        log,
      ],
    }
    setData(updated)
    saveData(updated)
    setSavedMsg('Log saved!')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  function handleSaveProfile(profile: HealthProfile) {
    const updated: HealthData = { ...data, profile }
    setData(updated)
    saveData(updated)
    setSavedMsg('Settings saved!')
    setTimeout(() => setSavedMsg(''), 2000)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Health</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your daily vitals and wellness</p>
        </div>
        {savedMsg && (
          <div className="glass rounded-xl px-3 py-1.5 border border-green-400/25 text-xs text-green-400">
            {savedMsg}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="glass rounded-2xl p-1 flex gap-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all',
              tab === t.id
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'log' && <DailyLogTab data={data} onSave={handleSaveLog} />}
      {tab === 'history' && <HistoryTab data={data} />}
      {tab === 'ai' && <AICompanionTab data={data} />}
      {tab === 'settings' && <SettingsTab data={data} onSaveProfile={handleSaveProfile} />}
    </div>
  )
}
