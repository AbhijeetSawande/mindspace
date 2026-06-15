import { useState, useEffect, useRef } from 'react'
import {
  CheckSquare, Zap, Target, Plus, X, ArrowRight, Check, Flame,
  Calendar, Activity, Link2, ChevronLeft, ChevronRight,
  Search, MapPin, Loader2, Brain, Heart, Droplets, Moon, Footprints,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'
import { useAuth } from '@/store/authStore'
import { TaskPanel } from '@/pages/Todos'

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'high' | 'medium' | 'low'

interface TodoItem {
  id: string; title: string; done: boolean; priority: Priority
  tags: string[]; dueDate?: string
  subtasks: { id: string; text: string; done: boolean }[]
  createdAt: string; completedAt?: string; notes?: string; projectId?: string
}
interface Habit { id: string; name: string; emoji: string; completions: Record<string, boolean> }
interface Milestone { id: string; text: string; done: boolean }
interface Goal {
  id: string; title: string; category: string; deadline: string
  description: string; milestones: Milestone[]
}
interface QuickNote { text: string; ts: number }
interface QuickLink { id: string; title: string; url: string; emoji: string }
interface WeatherLoc { name: string; lat: number; lon: number; country: string }
interface WeatherData { temp: number; code: number; fetchedAt: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso() { return new Date().toISOString().split('T')[0] }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }
function relativeTime(ts: number) {
  const s = (Date.now() - ts) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function loadLS<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback }
  catch { return fallback }
}
function saveLS<T>(key: string, v: T) { localStorage.setItem(key, JSON.stringify(v)) }

function weatherEmoji(code: number) {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '🌨️'
  if (code <= 82) return '🌦️'
  return '⛈️'
}
function weatherDesc(code: number) {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Cloudy'
  if (code <= 48) return 'Foggy'
  if (code <= 67) return 'Rainy'
  if (code <= 77) return 'Snowy'
  if (code <= 82) return 'Showers'
  return 'Stormy'
}

const CAT_COLORS: Record<string, string> = {
  Career:        'bg-violet-500/15 border-violet-500/30 text-violet-400',
  Finance:       'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  Health:        'bg-red-500/15 border-red-500/30 text-red-400',
  Learning:      'bg-blue-500/15 border-blue-500/30 text-blue-400',
  Travel:        'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
  Personal:      'bg-pink-500/15 border-pink-500/30 text-pink-400',
  Relationships: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
}
function catStyle(cat: string) {
  return CAT_COLORS[cat] ?? 'bg-primary/15 border-primary/20 text-primary'
}

// ─── WeatherWidget ────────────────────────────────────────────────────────────

function WeatherWidget() {
  const [loc, setLoc] = useState<WeatherLoc | null>(() => loadLS('cortex-weather-loc', null))
  const [weather, setWeather] = useState<WeatherData | null>(() => loadLS('cortex-weather-data', null))
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WeatherLoc[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [loadingWeather, setLoadingWeather] = useState(false)
  const [weatherError, setWeatherError] = useState(false)
  const [searched, setSearched] = useState(false)

  const doSearch = async () => {
    if (!query.trim()) return
    setLoadingSearch(true)
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await r.json()
      setSearched(true)
      setResults(data.map((d: Record<string, unknown>) => {
        const addr = d.address as Record<string, string> | undefined
        return {
          name: addr?.city || addr?.town || addr?.village || (d.display_name as string).split(',')[0].trim(),
          lat: parseFloat(d.lat as string),
          lon: parseFloat(d.lon as string),
          country: addr?.country_code?.toUpperCase() || '',
        }
      }))
    } catch { setResults([]) }
    setLoadingSearch(false)
  }

  const fetchWeather = async (l: WeatherLoc) => {
    setLoadingWeather(true)
    setWeatherError(false)
    try {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${l.lat}&longitude=${l.lon}&current_weather=true`
      )
      if (!r.ok) throw new Error('Weather fetch failed')
      const d = await r.json()
      if (!d.current_weather) throw new Error('Invalid response')
      const w: WeatherData = {
        temp: Math.round(d.current_weather.temperature),
        code: d.current_weather.weathercode,
        fetchedAt: Date.now(),
      }
      setWeather(w); saveLS('cortex-weather-data', w)
    } catch {
      setWeatherError(true)
    }
    setLoadingWeather(false)
  }

  const selectLoc = (l: WeatherLoc) => {
    setLoc(l); saveLS('cortex-weather-loc', l)
    setResults([]); setSearching(false); setQuery('')
    fetchWeather(l)
  }

  useEffect(() => {
    if (loc && (!weather || Date.now() - weather.fetchedAt > 30 * 60 * 1000)) fetchWeather(loc)
  }, []) // eslint-disable-line

  const searchBox = (
    <div className="relative flex items-center gap-1.5">
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') doSearch(); if (e.key === 'Escape') { setSearching(false); setResults([]) } }}
        placeholder="Search city..."
        className="bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 w-36"
      />
      <button onClick={doSearch} disabled={loadingSearch} className="text-primary shrink-0">
        {loadingSearch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
      </button>
      <button onClick={() => { setSearching(false); setResults([]); setSearched(false) }} className="text-muted-foreground shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
      {(results.length > 0 || (searched && !loadingSearch && results.length === 0)) && (
        <div className="absolute top-9 right-0 z-50 w-60 glass rounded-xl border border-white/10 shadow-2xl overflow-hidden">
          {results.length === 0
            ? <p className="px-3 py-2.5 text-xs text-muted-foreground">No cities found for "{query}"</p>
            : results.map((r, i) => (
                <button key={i} onClick={() => selectLoc(r)}
                  className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-white/10 flex items-center gap-2 border-b border-white/5 last:border-0 transition-colors">
                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{r.name}{r.country ? `, ${r.country}` : ''}</span>
                </button>
              ))
          }
        </div>
      )}
    </div>
  )

  if (!loc) {
    return (
      <div>
        {searching ? searchBox : (
          <button onClick={() => setSearching(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-white/10 rounded-xl px-3 py-1.5 hover:border-white/20 transition-all">
            <MapPin className="w-3.5 h-3.5" />
            Set weather location
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {loadingWeather ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Fetching…</span>
        </div>
      ) : weatherError ? (
        <div className="flex items-center gap-2 text-muted-foreground/60">
          <span className="text-xs">⚠ Couldn't fetch weather</span>
          <button onClick={() => loc && fetchWeather(loc)} className="text-[10px] text-primary hover:underline">retry</button>
        </div>
      ) : weather ? (
        <div className="flex items-center gap-2.5">
          <span className="text-3xl leading-none">{weatherEmoji(weather.code)}</span>
          <div>
            <p className="text-2xl font-black text-foreground tabular-nums leading-none">{weather.temp}°C</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {weatherDesc(weather.code)} · {loc.name}
            </p>
          </div>
        </div>
      ) : null}
      {searching ? searchBox : (
        <button onClick={() => setSearching(true)} title="Change location"
          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
          <MapPin className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ─── StatusPills ──────────────────────────────────────────────────────────────

function StatusPills({
  habits, streak, overdue, onAiBriefing,
}: {
  habits: Habit[]; streak: number; overdue: number; onAiBriefing: () => void
}) {
  const today = todayIso()
  const habitsToday = habits.filter(h => h.completions[today]).length

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={cn(
        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium',
        streak > 0 ? 'bg-orange-500/10 border-orange-500/25 text-orange-400' : 'bg-white/5 border-white/10 text-muted-foreground'
      )}>
        <Flame className="w-3 h-3" /> {streak}d streak
      </span>
      <span className={cn(
        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium',
        habitsToday > 0 ? 'bg-green-500/10 border-green-500/25 text-green-400' : 'bg-white/5 border-white/10 text-muted-foreground'
      )}>
        <Check className="w-3 h-3" /> {habitsToday}/{habits.length} habits
      </span>
      {overdue > 0 && (
        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border bg-red-500/10 border-red-500/25 text-red-400 font-medium">
          ⚠ {overdue} overdue
        </span>
      )}
      <button onClick={onAiBriefing}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border bg-primary/10 border-primary/25 text-primary font-medium hover:bg-primary/20 transition-colors">
        <Brain className="w-3 h-3" /> AI Briefing
      </button>
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, gradient, iconClass, valueClass }: {
  icon: React.ElementType; label: string; value: string | number; sub: string
  gradient: string; iconClass: string; valueClass: string
}) {
  return (
    <div className="glass rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-200 cursor-default">
      <div className={cn('h-1 w-full', gradient)} />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{label}</span>
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', iconClass)}>
            <Icon className="w-[15px] h-[15px]" />
          </div>
        </div>
        <div>
          <p className={cn('text-3xl font-black tabular-nums leading-none', valueClass)}>{value}</p>
          <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>
        </div>
      </div>
    </div>
  )
}

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ todos }: { todos: TodoItem[] }) {
  const realToday = new Date()
  const [view, setView] = useState(() => new Date(realToday.getFullYear(), realToday.getMonth(), 1))

  const year = view.getFullYear()
  const month = view.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const taskDays = new Set(
    todos
      .filter(t => { if (!t.dueDate) return false; const d = new Date(t.dueDate); return d.getFullYear() === year && d.getMonth() === month })
      .map(t => new Date(t.dueDate!).getDate())
  )
  const doneDays = new Set(
    todos
      .filter(t => { if (!t.dueDate || !t.done) return false; const d = new Date(t.dueDate); return d.getFullYear() === year && d.getMonth() === month })
      .map(t => new Date(t.dueDate!).getDate())
  )

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const isToday = (day: number) =>
    day === realToday.getDate() && month === realToday.getMonth() && year === realToday.getFullYear()

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground">
          {view.toLocaleString('en-US', { month: 'long' })} {year}
        </span>
        <div className="flex gap-1">
          <button onClick={() => setView(new Date(year, month - 1, 1))}
            className="w-6 h-6 rounded-lg glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setView(new Date(year, month + 1, 1))}
            className="w-6 h-6 rounded-lg glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-0.5">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground/50 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => (
          <div key={i} className="flex flex-col items-center py-0.5">
            {day !== null && (
              <>
                <div className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full text-[11px] font-medium transition-all',
                  isToday(day)
                    ? 'bg-primary text-white font-bold shadow-lg shadow-primary/30'
                    : taskDays.has(day)
                      ? 'text-foreground hover:bg-white/10'
                      : 'text-foreground/60 hover:bg-white/5'
                )}>
                  {day}
                </div>
                {taskDays.has(day) && !isToday(day) && (
                  <div className={cn('w-1 h-1 rounded-full -mt-0.5', doneDays.has(day) ? 'bg-green-400' : 'bg-primary')} />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── QuickCapture ─────────────────────────────────────────────────────────────

function QuickCapture({
  onConvertRequest,
}: {
  onConvertRequest: (note: QuickNote, removeNote: () => void) => void
}) {
  const [notes, setNotes] = useState<QuickNote[]>(() => loadLS('cortex-quick-capture', []))
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const saveNotes = (n: QuickNote[]) => { setNotes(n); saveLS('cortex-quick-capture', n) }
  const add = () => {
    const text = input.trim(); if (!text) return
    saveNotes([{ text, ts: Date.now() }, ...notes]); setInput('')
  }
  const del = (ts: number) => saveNotes(notes.filter(n => n.ts !== ts))

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Plus className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Quick Capture</span>
        {notes.length > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground bg-white/5 rounded-full px-2 py-0.5 border border-white/8">{notes.length}</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Capture a thought, idea, or reminder… (Enter)"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
        />
        <button onClick={add} className="px-3 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 text-xs transition-colors shrink-0">
          Save
        </button>
      </div>
      {notes.slice(0, 5).map(note => (
        <div key={note.ts} className="group flex items-start gap-2 mt-2 p-2.5 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-colors">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground leading-snug">{note.text}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{relativeTime(note.ts)}</p>
          </div>
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onConvertRequest(note, () => del(note.ts))}
              className="flex items-center gap-0.5 text-[10px] px-1.5 py-1 rounded bg-primary/10 text-primary border border-primary/15 hover:bg-primary/20 whitespace-nowrap transition-colors">
              <ArrowRight className="w-2.5 h-2.5" /> → Todo
            </button>
            <button onClick={() => del(note.ts)}
              className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Calendar Section (today's tasks + overdue) ──────────────────────────────

function CalendarSection({ todos, onTodosChange, onViewAll }: {
  todos: TodoItem[]; onTodosChange: (t: TodoItem[]) => void; onViewAll: () => void
}) {
  const today = todayIso()
  const todayTasks = todos.filter(t => t.dueDate === today)
  const overdue = todos.filter(t => !t.done && t.dueDate && t.dueDate < today)

  const toggle = (id: string) => {
    const updated = todos.map(t => {
      if (t.id !== id) return t
      const done = !t.done
      return { ...t, done, completedAt: done ? new Date().toISOString() : undefined }
    })
    onTodosChange(updated); saveLS('cortex-todos', updated)
  }

  const priorityDot = (p: Priority) => {
    if (p === 'high') return 'bg-red-400'
    if (p === 'medium') return 'bg-yellow-400'
    return 'bg-blue-400/60'
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Calendar</span>
        <button onClick={onViewAll} className="ml-auto text-xs text-primary hover:underline flex items-center gap-0.5">
          View all <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {overdue.length > 0 && (
        <div className="mb-3 p-3 rounded-xl bg-red-500/8 border border-red-500/20">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">⚠ Overdue</p>
          <div className="space-y-1.5">
            {overdue.slice(0, 3).map(t => (
              <div key={t.id} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span className="text-xs text-red-300/90 flex-1 truncate">{t.title}</span>
                <span className="text-[10px] text-red-400/60 shrink-0">{t.dueDate}</span>
              </div>
            ))}
            {overdue.length > 3 && (
              <p className="text-[10px] text-red-400/60 mt-1">+{overdue.length - 3} more overdue</p>
            )}
          </div>
        </div>
      )}

      {todayTasks.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <Calendar className="w-8 h-8 text-muted-foreground/25 mx-auto" />
          <p className="text-xs text-muted-foreground">No tasks scheduled for today</p>
          <p className="text-[11px] text-muted-foreground/50">Connect Google Calendar in Settings to sync events</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todayTasks.map(t => (
            <div key={t.id} className={cn(
              'flex items-center gap-2.5 p-2.5 rounded-xl border transition-all',
              t.done ? 'opacity-60 bg-white/2 border-white/5' : 'bg-white/3 border-white/8 hover:border-white/15'
            )}>
              <div className={cn('w-1 self-stretch rounded-full shrink-0', t.done ? 'bg-green-400/40' : priorityDot(t.priority))} />
              <button
                onClick={() => toggle(t.id)}
                className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                  t.done ? 'bg-green-500 border-green-500' : 'border-muted-foreground/40 hover:border-primary'
                )}
              >
                {t.done && <Check className="w-2.5 h-2.5 text-white" />}
              </button>
              <span className={cn('text-xs flex-1 truncate', t.done && 'line-through text-muted-foreground')}>
                {t.title}
              </span>
              {t.priority === 'high' && !t.done && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 shrink-0">HIGH</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Quick Links ──────────────────────────────────────────────────────────────

function QuickLinksWidget({ onViewAll }: { onViewAll: () => void }) {
  const [links, setLinks] = useState<QuickLink[]>(() => loadLS('cortex-links', []))
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', url: '', emoji: '🔗' })

  const save = () => {
    if (!form.url.trim()) return
    const title = form.title.trim() || form.url.replace(/^https?:\/\//, '').split('/')[0]
    const newLink: QuickLink = { id: uid(), title, url: form.url.trim(), emoji: form.emoji || '🔗' }
    const updated = [newLink, ...links]; setLinks(updated); saveLS('cortex-links', updated)
    setForm({ title: '', url: '', emoji: '🔗' }); setAdding(false)
  }

  const del = (id: string) => {
    const updated = links.filter(l => l.id !== id); setLinks(updated); saveLS('cortex-links', updated)
  }

  return (
    <div className="glass rounded-2xl p-5 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Quick Links</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={onViewAll} className="text-xs text-primary hover:underline flex items-center gap-0.5">
            All <ArrowRight className="w-3 h-3" />
          </button>
          <button onClick={() => setAdding(!adding)}
            className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {adding && (
        <div className="mb-3 p-3 bg-white/3 rounded-xl border border-white/8 space-y-2">
          <input
            autoFocus placeholder="URL (e.g. https://notion.so)"
            value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && save()}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
          <div className="flex gap-2">
            <input
              placeholder="Title (optional)" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
            />
            <input
              placeholder="🔗" value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
              className="w-10 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:border-primary/40"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
              Save Link
            </button>
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {links.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground text-center py-4">No links yet. Click + to add your first quick link.</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {links.slice(0, 8).map(link => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
              className="group flex items-center gap-2 p-2.5 rounded-xl bg-white/3 border border-white/5 hover:border-primary/25 hover:bg-primary/5 transition-all">
              <span className="text-base shrink-0 leading-none">{link.emoji}</span>
              <span className="text-xs text-foreground truncate flex-1">{link.title}</span>
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); del(link.id) }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all ml-auto shrink-0">
                <X className="w-3 h-3" />
              </button>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Health Mini ──────────────────────────────────────────────────────────────

const MOOD_MAP: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😞', label: 'Bad',    color: 'text-red-400' },
  2: { emoji: '😐', label: 'Meh',    color: 'text-orange-400' },
  3: { emoji: '🙂', label: 'Okay',   color: 'text-yellow-400' },
  4: { emoji: '😊', label: 'Good',   color: 'text-green-400' },
  5: { emoji: '🔥', label: 'Pumped', color: 'text-emerald-400' },
}

function HealthMini({ onViewAll }: { onViewAll: () => void }) {
  const raw = loadLS<{ logs: { date: string; water: number; sleep: number; steps: number; mood: number }[]; profile: { waterTarget: number; sleepTarget: number; stepsTarget: number } }>(
    'cortex-health',
    { logs: [], profile: { waterTarget: 8, sleepTarget: 8, stepsTarget: 8000 } }
  )

  const today = todayIso()
  const log = raw.logs.find(l => l.date === today)
  const profile = raw.profile
  const mood = log ? (MOOD_MAP[log.mood] ?? MOOD_MAP[3]) : null

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="w-4 h-4 text-red-400" />
        <span className="text-sm font-semibold text-foreground">Health Today</span>
        <button onClick={onViewAll} className="ml-auto text-xs text-primary hover:underline flex items-center gap-0.5">
          details <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {!log ? (
        <div className="text-center py-4 space-y-2">
          <p className="text-2xl">🩺</p>
          <p className="text-xs text-muted-foreground">Nothing logged yet</p>
          <button onClick={onViewAll}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
            Log your day
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mood pill */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/3 border border-white/5">
            <span className="text-xl leading-none">{mood!.emoji}</span>
            <div>
              <p className={cn('text-xs font-bold', mood!.color)}>{mood!.label}</p>
              <p className="text-[10px] text-muted-foreground">Mood</p>
            </div>
          </div>

          {/* Water */}
          <div className="flex items-center gap-2">
            <Droplets className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-[11px] text-muted-foreground w-12 shrink-0">Water</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-blue-400 transition-all duration-500"
                style={{ width: `${Math.min((log.water / profile.waterTarget) * 100, 100)}%` }} />
            </div>
            <span className="text-[11px] text-blue-400 font-semibold shrink-0 w-10 text-right">
              {log.water}/{profile.waterTarget}
            </span>
          </div>

          {/* Sleep */}
          <div className="flex items-center gap-2">
            <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-[11px] text-muted-foreground w-12 shrink-0">Sleep</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                style={{ width: `${Math.min((log.sleep / profile.sleepTarget) * 100, 100)}%` }} />
            </div>
            <span className="text-[11px] text-indigo-400 font-semibold shrink-0 w-10 text-right">
              {log.sleep}h
            </span>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2">
            <Footprints className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] text-muted-foreground w-12 shrink-0">Steps</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min((log.steps / profile.stepsTarget) * 100, 100)}%` }} />
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold shrink-0 w-10 text-right">
              {log.steps >= 1000 ? `${(log.steps / 1000).toFixed(1)}k` : log.steps}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Top Goal ─────────────────────────────────────────────────────────────────

function TopGoalMini({ goals, onViewAll }: { goals: Goal[]; onViewAll: () => void }) {
  const top = goals[0]
  const total = top?.milestones.length ?? 0
  const done = top?.milestones.filter(m => m.done).length ?? 0
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-semibold text-foreground">Top Goal</span>
        {goals.length > 0 && (
          <button onClick={onViewAll} className="ml-auto text-xs text-primary hover:underline">
            all {goals.length}
          </button>
        )}
      </div>
      {!top ? (
        <p className="text-xs text-muted-foreground text-center py-3">No goals set. Head to Goals to add one.</p>
      ) : (
        <>
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full border inline-flex mb-2', catStyle(top.category))}>
            {top.category}
          </span>
          <p className="text-sm font-semibold text-foreground mb-3 leading-snug" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {top.title}
          </p>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-700"
                style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-bold text-violet-400 shrink-0">{pct}%</span>
          </div>
          {top.deadline && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Due {new Date(top.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
          )}
          {goals.length > 1 && (
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">+{goals.length - 1} more active</p>
          )}
        </>
      )}
    </div>
  )
}

// ─── AI Insight ───────────────────────────────────────────────────────────────

interface BriefingProps {
  onOpen: () => void
  briefing: string
  loading: boolean
  hasKey: boolean
}

function AiInsight({ onOpen, briefing, loading, hasKey }: BriefingProps) {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.10), hsl(var(--primary)/0.04))', border: '1px solid hsl(var(--primary)/0.25)' }}>
      <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)/0.15), transparent 70%)' }} />
      <div className="relative flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-bold text-foreground">AI Briefing</span>
            {hasKey && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">LIVE</span>}
            {!hasKey && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">BETA</span>}
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
              Generating your briefing…
            </div>
          ) : briefing ? (
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{briefing}</p>
          ) : hasKey ? (
            <p className="text-sm text-muted-foreground">Click below to get your daily AI briefing based on your tasks, habits, and goals.</p>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Add your Gemini API key in{' '}
              <span className="text-primary font-medium">Settings → AI</span>{' '}
              to unlock personalised daily briefings.
            </p>
          )}
        </div>
      </div>
      <button
        onClick={onOpen}
        className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors font-medium"
      >
        <Brain className="w-3 h-3" />
        {loading ? 'Generating…' : briefing ? 'Refresh Briefing' : hasKey ? 'Generate Briefing' : 'Set up in Settings'}
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { setPage } = useApp()
  const { user } = useAuth()

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const [todos, setTodos] = useState<TodoItem[]>(() => loadLS('cortex-todos', []))
  const [convertNote, setConvertNote] = useState<{ note: QuickNote; removeNote: () => void } | null>(null)
  const [habits] = useState<Habit[]>(() => loadLS('cortex-habits', []))
  const [goals] = useState<Goal[]>(() => loadLS('cortex-goals', []))
  const [briefing, setBriefing] = useState('')
  const [briefingLoading, setBriefingLoading] = useState(false)

  const today = todayIso()
  const todayTasks = todos.filter(t => t.dueDate === today)
  const todayDone = todayTasks.filter(t => t.done).length
  const todayTotal = todayTasks.length
  const doneToday = todos.filter(t => t.done && t.completedAt?.startsWith(today)).length
  const habitsToday = habits.filter(h => h.completions[today]).length
  const overdue = todos.filter(t => !t.done && t.dueDate && t.dueDate < today).length

  const streak = (() => {
    let s = 0; const d = new Date()
    while (s < 365) {
      const iso = d.toISOString().split('T')[0]
      if (!habits.some(h => h.completions[iso])) break
      s++; d.setDate(d.getDate() - 1)
    }
    return s
  })()

  const geminiKey = localStorage.getItem('cortex-gemini-key') || ''

  const generateBriefing = async () => {
    if (!geminiKey) { setPage('settings'); return }
    setBriefingLoading(true)
    const profile = (() => { try { return JSON.parse(localStorage.getItem('cortex-profile') || '{}') } catch { return {} } })()
    const overdueTasks = todos.filter(t => !t.done && t.dueDate && t.dueDate < today)
    const todayPending = todayTasks.filter(t => !t.done)
    const habitsToday = habits.filter(h => h.completions[today]).length
    const activeGoals = goals.filter(g => !g.done)
    const context = [
      `Today is ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}.`,
      profile.name ? `User: ${profile.name}` : '',
      profile.role ? `Role: ${profile.role}` : '',
      `Habit streak: ${streak} days.`,
      `Habits completed today: ${habitsToday}/${habits.length}.`,
      overdueTasks.length > 0 ? `Overdue tasks (${overdueTasks.length}): ${overdueTasks.slice(0, 3).map(t => t.title).join(', ')}.` : 'No overdue tasks.',
      todayPending.length > 0 ? `Due today: ${todayPending.slice(0, 3).map(t => t.title).join(', ')}.` : 'No tasks due today.',
      activeGoals.length > 0 ? `Active goals: ${activeGoals.slice(0, 3).map(g => g.title).join(', ')}.` : '',
    ].filter(Boolean).join('\n')
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `${context}\n\nGive me a short, motivating morning briefing (3-4 sentences max). Highlight the most important thing I should focus on today, acknowledge any overdue items without being negative, and end with one actionable tip.` }] }] }),
      })
      const data = await res.json()
      setBriefing(data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate briefing.')
    } catch { setBriefing('Failed to connect to Gemini. Check your API key in Settings.') }
    setBriefingLoading(false)
  }

  const topGoal = goals[0]
  const topGoalPct = topGoal
    ? topGoal.milestones.length === 0
      ? 0
      : Math.round((topGoal.milestones.filter(m => m.done).length / topGoal.milestones.length) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* ── Hero: Greeting + Time + Weather ── */}
      <div className="glass rounded-2xl p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight leading-tight">
              {getGreeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
            </h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <StatusPills habits={habits} streak={streak} overdue={overdue} onAiBriefing={generateBriefing} />
          </div>
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <p className="text-3xl md:text-4xl font-black text-foreground tabular-nums leading-none">
              {formatTime(now)}
            </p>
            <WeatherWidget />
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={CheckSquare} label="Tasks Today"
          value={todayTotal > 0 ? `${todayDone}/${todayTotal}` : '—'}
          sub={todayTotal === 0 ? 'No tasks due today' : `${todayTotal - todayDone} remaining`}
          gradient="bg-gradient-to-r from-blue-500 to-indigo-500"
          iconClass="bg-blue-500/15 text-blue-400" valueClass="text-blue-400"
        />
        <StatCard
          icon={Activity} label="Habits"
          value={habits.length > 0 ? `${habitsToday}/${habits.length}` : '0'}
          sub={habits.length > 0 ? 'completed today' : 'No habits tracked'}
          gradient="bg-gradient-to-r from-green-500 to-emerald-500"
          iconClass="bg-green-500/15 text-green-400" valueClass="text-green-400"
        />
        <StatCard
          icon={Target} label="Top Goal"
          value={goals.length > 0 ? `${topGoalPct}%` : '—'}
          sub={topGoal ? topGoal.title : 'No goals set yet'}
          gradient="bg-gradient-to-r from-violet-500 to-purple-500"
          iconClass="bg-violet-500/15 text-violet-400" valueClass="text-violet-400"
        />
        <StatCard
          icon={Zap} label="Done Today"
          value={doneToday}
          sub={doneToday === 0 ? 'Nothing completed yet' : 'Great progress! 🎉'}
          gradient="bg-gradient-to-r from-amber-500 to-orange-500"
          iconClass="bg-amber-500/15 text-amber-400" valueClass="text-amber-400"
        />
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start lg:items-stretch">
        {/* Left: main content */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full">
          <QuickCapture
            onConvertRequest={(note, removeNote) => setConvertNote({ note, removeNote })}
          />
          <CalendarSection todos={todos} onTodosChange={setTodos} onViewAll={() => setPage('todos')} />
          <div className="flex-1 min-h-0">
            <QuickLinksWidget onViewAll={() => setPage('links')} />
          </div>
        </div>

        {/* Right: sidebar widgets */}
        <div className="flex flex-col gap-4">
          <MiniCalendar todos={todos} />
          <HealthMini onViewAll={() => setPage('health')} />
          <TopGoalMini goals={goals} onViewAll={() => setPage('goals')} />
        </div>
      </div>

      {/* ── AI Insight ── */}
      <AiInsight onOpen={generateBriefing} briefing={briefing} loading={briefingLoading} hasKey={!!geminiKey} />

      {/* ── Quick Capture → Todo panel ── */}
      {convertNote && (
        <TaskPanel
          mode="add"
          initial={{
            id: '', createdAt: '', completedAt: undefined,
            title: convertNote.note.text,
            done: false, priority: 'medium',
            tags: [], subtasks: [],
            dueDate: undefined, notes: undefined, projectId: undefined,
          }}
          onSave={(data) => {
            const newTodo: TodoItem = { ...data, id: uid(), createdAt: new Date().toISOString() }
            const updated = [newTodo, ...todos]
            setTodos(updated)
            saveLS('cortex-todos', updated)
            convertNote.removeNote()
            setConvertNote(null)
          }}
          onClose={() => setConvertNote(null)}
        />
      )}
    </div>
  )
}
