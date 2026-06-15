import { useState, useEffect } from 'react'
import { Activity, Plus, Flame, X, AlertTriangle, BookOpen, BarChart3, Edit2, Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type HabitCategory = 'mind' | 'body' | 'productivity' | 'relationships' | 'finance' | 'growth'
type HabitFrequency = 'daily' | 'weekly'

interface Habit {
  id: string
  name: string
  emoji: string
  category: HabitCategory
  identityStatement: string
  frequency: HabitFrequency
  cue?: string
  completions: Record<string, boolean>
  addedAt: string
}

interface HabitPreset {
  name: string
  emoji: string
  category: HabitCategory
  identityStatement: string
  frequency: HabitFrequency
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'cortex-habits'

const CATEGORY_META: Record<HabitCategory, { label: string; emoji: string }> = {
  mind:          { label: 'Mind & Focus',  emoji: '🧠' },
  body:          { label: 'Body & Health', emoji: '💪' },
  productivity:  { label: 'Productivity',  emoji: '⚡' },
  relationships: { label: 'Relationships', emoji: '🤝' },
  finance:       { label: 'Finance',       emoji: '💰' },
  growth:        { label: 'Growth',        emoji: '🌱' },
}

const HABIT_PRESETS: HabitPreset[] = [
  // Mind & Focus
  { name: 'Read 20 pages',             emoji: '📚', category: 'mind',          identityStatement: 'I am a lifelong learner',          frequency: 'daily'  },
  { name: 'Meditate 10 minutes',       emoji: '🧘', category: 'mind',          identityStatement: 'I am someone who finds clarity',   frequency: 'daily'  },
  { name: 'Journal 5 minutes',         emoji: '✍️', category: 'mind',          identityStatement: 'I am someone who reflects',        frequency: 'daily'  },
  { name: 'No phone first 30 min',     emoji: '📵', category: 'mind',          identityStatement: 'I own my mornings',                frequency: 'daily'  },
  { name: 'Review goals',              emoji: '🎯', category: 'mind',          identityStatement: 'I am intentional about my life',   frequency: 'daily'  },
  // Body & Health
  { name: 'Drink 8 glasses of water',  emoji: '💧', category: 'body',          identityStatement: 'I fuel my body',                   frequency: 'daily'  },
  { name: 'Exercise 30 minutes',       emoji: '🏃', category: 'body',          identityStatement: 'I am an active person',            frequency: 'daily'  },
  { name: 'Sleep by 11 PM',            emoji: '😴', category: 'body',          identityStatement: 'I prioritize recovery',            frequency: 'daily'  },
  { name: 'Walk 10,000 steps',         emoji: '🚶', category: 'body',          identityStatement: 'I keep my body moving',            frequency: 'daily'  },
  { name: 'Cold shower',               emoji: '❄️', category: 'body',          identityStatement: 'I embrace discomfort',             frequency: 'daily'  },
  { name: 'Eat a healthy meal',        emoji: '🥗', category: 'body',          identityStatement: 'I nourish my body',                frequency: 'daily'  },
  // Productivity
  { name: 'Plan tomorrow tonight',     emoji: '📋', category: 'productivity',  identityStatement: 'I run my day, not the reverse',    frequency: 'daily'  },
  { name: 'Complete #1 priority',      emoji: '✅', category: 'productivity',  identityStatement: 'I focus on what matters most',     frequency: 'daily'  },
  { name: 'No social media before 10', emoji: '🚫', category: 'productivity',  identityStatement: 'I protect my deep work',           frequency: 'daily'  },
  { name: 'Weekly review',             emoji: '📊', category: 'productivity',  identityStatement: 'I am intentional about my work',   frequency: 'weekly' },
  { name: 'Clear inbox',               emoji: '📥', category: 'productivity',  identityStatement: 'I stay on top of things',          frequency: 'weekly' },
  // Relationships
  { name: '3 things I\'m grateful for',emoji: '🙏', category: 'relationships', identityStatement: 'I see abundance everywhere',       frequency: 'daily'  },
  { name: 'Reach out to someone',      emoji: '💬', category: 'relationships', identityStatement: 'I invest in relationships',        frequency: 'daily'  },
  { name: 'Do one kind thing',         emoji: '💝', category: 'relationships', identityStatement: 'I am a generous person',           frequency: 'daily'  },
  // Finance
  { name: 'Track expenses',            emoji: '💰', category: 'finance',       identityStatement: 'I am financially aware',           frequency: 'daily'  },
  { name: 'No impulse purchase',       emoji: '🛑', category: 'finance',       identityStatement: 'I spend with intention',           frequency: 'daily'  },
  { name: 'Review investments',        emoji: '📈', category: 'finance',       identityStatement: 'I build wealth steadily',          frequency: 'weekly' },
  // Growth
  { name: 'Learn something new',       emoji: '🌍', category: 'growth',        identityStatement: 'I am always growing',              frequency: 'daily'  },
  { name: 'Practice a skill 30 min',   emoji: '💻', category: 'growth',        identityStatement: 'I am a craftsman',                 frequency: 'daily'  },
  { name: 'Practice a language',       emoji: '🗣️', category: 'growth',        identityStatement: 'I am a global citizen',            frequency: 'daily'  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function todayIso(): string { return isoDate(new Date()) }

function getWeekStartIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1))
  return isoDate(d)
}

function isCompletedThisWeek(completions: Record<string, boolean>): boolean {
  const ws = getWeekStartIso()
  const we = new Date(ws); we.setDate(we.getDate() + 7)
  const weStr = isoDate(we)
  return Object.keys(completions).some(k => k >= ws && k < weStr && completions[k])
}

function calcStreak(completions: Record<string, boolean>): number {
  const today = new Date()
  const start = completions[isoDate(today)] ? 0 : 1
  let s = 0
  for (let i = start; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    if (completions[isoDate(d)]) s++; else break
  }
  return s
}

function calcWeeklyStreak(completions: Record<string, boolean>): number {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  const start = isCompletedThisWeek(completions) ? 0 : 1
  let s = 0
  for (let w = start; w < 52; w++) {
    const ws = new Date(monday); ws.setDate(monday.getDate() - w * 7)
    const we = new Date(ws); we.setDate(ws.getDate() + 7)
    const done = Object.keys(completions).some(k => k >= isoDate(ws) && k < isoDate(we) && completions[k])
    if (done) s++; else break
  }
  return s
}

function calc30DayRate(completions: Record<string, boolean>): number {
  let n = 0
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    if (completions[isoDate(d)]) n++
  }
  return Math.round((n / 30) * 100)
}

function needsNeverMissTwice(habit: Habit): boolean {
  if (habit.frequency === 'weekly') return false
  const yest = new Date(); yest.setDate(yest.getDate() - 1)
  const hasHistory = Object.keys(habit.completions).length > 0
  return hasHistory && !habit.completions[isoDate(yest)] && !habit.completions[todayIso()]
}

function calcWeeklyRate(completions: Record<string, boolean>): number {
  const today = new Date()
  const dow = today.getDay()
  const thisMon = new Date(today)
  thisMon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  let doneWeeks = 0
  for (let w = 0; w < 4; w++) {
    const ws = new Date(thisMon); ws.setDate(thisMon.getDate() - w * 7)
    const we = new Date(ws); we.setDate(ws.getDate() + 7)
    if (Object.keys(completions).some(k => k >= isoDate(ws) && k < isoDate(we) && completions[k])) doneWeeks++
  }
  return Math.round((doneWeeks / 4) * 100)
}

function streakColor(n: number) {
  if (n >= 30) return 'text-orange-400'
  if (n >= 7)  return 'text-green-400'
  if (n >= 1)  return 'text-yellow-400'
  return 'text-muted-foreground'
}

function streakBg(n: number) {
  if (n >= 30) return 'bg-orange-500/15 border-orange-500/20'
  if (n >= 7)  return 'bg-green-500/15 border-green-500/20'
  if (n >= 1)  return 'bg-yellow-500/15 border-yellow-500/20'
  return 'bg-white/5 border-white/10'
}

function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((h: Partial<Habit>): Habit => ({
          category: 'growth' as HabitCategory,
          identityStatement: 'I am someone who shows up',
          frequency: 'daily' as HabitFrequency,
          addedAt: new Date().toISOString(),
          name: '',
          emoji: '⭐',
          ...h,
          id: h.id ?? `${Date.now()}-${Math.random()}`,
          completions: h.completions ?? {},
        }))
      }
    }
  } catch {}
  return []
}

function saveHabits(habits: Habit[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(habits))
}

// ─── EditHabitModal ───────────────────────────────────────────────────────────

function EditHabitModal({
  habit,
  onClose,
  onSave,
}: {
  habit: Habit
  onClose: () => void
  onSave: (id: string, patch: Partial<Habit>) => void
}) {
  const [identity, setIdentity] = useState(habit.identityStatement)
  const [cue, setCue] = useState(habit.cue ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl p-6 w-full max-w-sm space-y-4 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{habit.emoji}</span>
            <h2 className="text-sm font-bold text-foreground truncate">{habit.name}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Identity statement</label>
          <input
            value={identity}
            onChange={e => setIdentity(e.target.value)}
            placeholder="I am..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
          <p className="text-[10px] text-muted-foreground/50 mt-1">Who are you becoming by doing this habit?</p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Habit stack — plan after</label>
          <input
            value={cue}
            onChange={e => setCue(e.target.value)}
            placeholder="After I [existing habit], I will do this"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
          <p className="text-[10px] text-muted-foreground/50 mt-1">Linking to an existing habit makes it stick</p>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(habit.id, {
                identityStatement: identity.trim() || habit.identityStatement,
                cue: cue.trim() || undefined,
              })
              onClose()
            }}
            className="flex-1 py-2.5 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AddCustomModal ───────────────────────────────────────────────────────────

function AddCustomModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (h: Omit<Habit, 'id' | 'completions' | 'addedAt'>) => void
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [category, setCategory] = useState<HabitCategory>('growth')
  const [identity, setIdentity] = useState('')
  const [frequency, setFrequency] = useState<HabitFrequency>('daily')
  const [cue, setCue] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl p-6 w-full max-w-md space-y-4 border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Custom Habit</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            placeholder="😀"
            maxLength={2}
            className="w-14 text-center text-xl bg-white/5 border border-white/10 rounded-xl py-2.5 focus:outline-none focus:border-primary/40"
          />
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Habit name"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
        </div>

        <input
          value={identity}
          onChange={e => setIdentity(e.target.value)}
          placeholder="I am... (your identity statement)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as HabitCategory)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
            >
              {Object.entries(CATEGORY_META).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Frequency</label>
            <div className="flex gap-1">
              {(['daily', 'weekly'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-medium border transition-colors',
                    frequency === f
                      ? 'bg-primary/20 border-primary/30 text-primary'
                      : 'bg-white/5 border-white/10 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {f === 'daily' ? 'Daily' : 'Weekly'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Habit stack — plan after (optional)</label>
          <input
            value={cue}
            onChange={e => setCue(e.target.value)}
            placeholder="After I [existing habit], I will do this"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!name.trim()) return
              onAdd({
                name: name.trim(),
                emoji: emoji.trim() || '⭐',
                category,
                identityStatement: identity.trim() || 'I am someone who shows up',
                frequency,
                cue: cue.trim() || undefined,
              })
              onClose()
            }}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-40"
          >
            Add Habit
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── TodayHabitCard ───────────────────────────────────────────────────────────

function TodayHabitCard({
  habit,
  onToggle,
  onDelete,
  onEdit,
}: {
  habit: Habit
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (habit: Habit) => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const today = todayIso()
  const isWeekly = habit.frequency === 'weekly'
  const doneToday = isWeekly ? isCompletedThisWeek(habit.completions) : !!habit.completions[today]
  const streak = isWeekly ? calcWeeklyStreak(habit.completions) : calcStreak(habit.completions)
  const missed = needsNeverMissTwice(habit)
  const catMeta = CATEGORY_META[habit.category]

  return (
    <div className={cn(
      'glass rounded-2xl p-5 transition-all space-y-4',
      missed && 'ring-1 ring-amber-500/30',
      doneToday && 'opacity-80'
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-2xl shrink-0 mt-0.5">{habit.emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground truncate">{habit.name}</p>
              {isWeekly && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">Weekly</span>
              )}
            </div>
            <p className="text-xs text-primary/70 italic mt-0.5 truncate">{habit.identityStatement}</p>
            {habit.cue && (
              <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                After: {habit.cue}
              </p>
            )}
            <span className="text-[10px] text-muted-foreground/50">{catMeta.emoji} {catMeta.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className={cn('flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold', streakBg(streak))}>
            <Flame className={cn('w-3 h-3', streakColor(streak))} />
            <span className={streakColor(streak)}>{streak}{isWeekly ? 'w' : 'd'}</span>
          </div>
          <button
            onClick={() => onEdit(habit)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Edit habit"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          {confirmDel ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDelete(habit.id)}
                className="text-[10px] px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/20 text-red-400 hover:bg-red-500/25 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Never miss twice warning */}
      {missed && (
        <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-xs text-amber-400">Never miss twice — recover the chain today</span>
        </div>
      )}

      {/* Mark complete */}
      <button
        onClick={() => onToggle(habit.id)}
        className={cn(
          'w-full text-xs py-2.5 rounded-xl border font-medium transition-all duration-200 flex items-center justify-center gap-2',
          doneToday
            ? 'bg-green-500/15 border-green-500/30 text-green-400 hover:bg-green-500/20'
            : missed
            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            : 'bg-primary/15 border-primary/30 text-primary hover:bg-primary/25'
        )}
      >
        {doneToday && <Check className="w-3.5 h-3.5" />}
        {doneToday
          ? `Done ${isWeekly ? 'this week' : 'today'} — tap to undo`
          : `Mark ${isWeekly ? 'done this week' : 'complete today'}`}
      </button>
    </div>
  )
}

// ─── LibraryView ─────────────────────────────────────────────────────────────

function LibraryView({
  habits,
  onAddPreset,
  onAddCustom,
}: {
  habits: Habit[]
  onAddPreset: (preset: HabitPreset) => void
  onAddCustom: () => void
}) {
  const addedNames = new Set(habits.map(h => h.name))
  const categories = Object.keys(CATEGORY_META) as HabitCategory[]

  return (
    <div className="space-y-6">
      {/* Intro card */}
      <div className="glass rounded-2xl p-5 border border-primary/10 space-y-1">
        <p className="text-sm font-semibold text-foreground">Inspired by Atomic Habits</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Every habit below comes with an <span className="text-primary italic">identity statement</span> — because lasting change starts with who you believe you are, not what you do. Pick habits that reflect the person you want to become.
        </p>
      </div>

      {categories.map(cat => {
        const presets = HABIT_PRESETS.filter(p => p.category === cat)
        const meta = CATEGORY_META[cat]
        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">{meta.emoji}</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{meta.label}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {presets.map(preset => {
                const added = addedNames.has(preset.name)
                return (
                  <div
                    key={preset.name}
                    className={cn(
                      'glass rounded-xl p-4 flex items-start justify-between gap-3 transition-all',
                      added && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-xl shrink-0">{preset.emoji}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{preset.name}</p>
                          {preset.frequency === 'weekly' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Weekly</span>
                          )}
                        </div>
                        <p className="text-xs text-primary/70 italic mt-0.5">{preset.identityStatement}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => !added && onAddPreset(preset)}
                      disabled={added}
                      className={cn(
                        'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        added
                          ? 'bg-green-500/10 border-green-500/20 text-green-400 cursor-default'
                          : 'bg-primary/15 border-primary/20 text-primary hover:bg-primary/25'
                      )}
                    >
                      {added ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Custom habit CTA */}
      <div className="glass rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Don't see yours?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Add a custom habit with your own identity and cue</p>
        </div>
        <button
          onClick={onAddCustom}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors text-sm font-medium shrink-0"
        >
          <Plus className="w-4 h-4" /> Custom
        </button>
      </div>
    </div>
  )
}

// ─── InsightsView ─────────────────────────────────────────────────────────────

function InsightsView({ habits }: { habits: Habit[] }) {
  const today = todayIso()
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i)); return isoDate(d)
  })

  if (habits.length === 0) {
    return (
      <div className="glass rounded-2xl p-16 text-center space-y-3">
        <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto" />
        <p className="text-sm font-semibold text-foreground">No habits to analyse yet.</p>
        <p className="text-xs text-muted-foreground">Add habits from the Library tab to see your insights.</p>
      </div>
    )
  }

  const overallRate = Math.round(
    habits.reduce((sum, h) => sum + (h.frequency === 'weekly' ? calcWeeklyRate(h.completions) : calc30DayRate(h.completions)), 0) / habits.length
  )
  let bestStreak = 0
  let bestStreakIsWeekly = false
  habits.forEach(h => {
    const s = h.frequency === 'weekly' ? calcWeeklyStreak(h.completions) : calcStreak(h.completions)
    if (s > bestStreak) { bestStreak = s; bestStreakIsWeekly = h.frequency === 'weekly' }
  })
  const totalCompletions = habits.reduce((sum, h) => sum + Object.values(h.completions).filter(Boolean).length, 0)

  return (
    <div className="space-y-4">
      {/* Overview stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Avg 30-day',   value: `${overallRate}%`, color: overallRate >= 70 ? 'text-green-400' : overallRate >= 40 ? 'text-yellow-400' : 'text-red-400' },
          { label: 'Best streak',  value: `${bestStreak}${bestStreakIsWeekly ? 'w' : 'd'}`,  color: streakColor(bestStreak) },
          { label: 'Total days',   value: totalCompletions,  color: 'text-primary' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl px-4 py-3 text-center">
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Compact per-habit rows */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 border-b border-white/5">
          <span className="text-[10px] text-muted-foreground font-medium">Habit</span>
          <span className="text-[10px] text-muted-foreground font-medium text-right w-24 hidden sm:block">Last 14 days</span>
          <span className="text-[10px] text-muted-foreground font-medium text-right w-10">Streak</span>
          <span className="text-[10px] text-muted-foreground font-medium text-right w-10">30d %</span>
        </div>

        {habits.map((habit, idx) => {
          const isWeekly = habit.frequency === 'weekly'
          const streak = isWeekly ? calcWeeklyStreak(habit.completions) : calcStreak(habit.completions)
          const rate = isWeekly ? calcWeeklyRate(habit.completions) : calc30DayRate(habit.completions)
          const doneToday = isWeekly ? isCompletedThisWeek(habit.completions) : !!habit.completions[today]

          return (
            <div
              key={habit.id}
              className={cn(
                'grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4 py-3 transition-colors hover:bg-white/[0.03]',
                idx < habits.length - 1 && 'border-b border-white/5'
              )}
            >
              {/* Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base shrink-0">{habit.emoji}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-foreground truncate">{habit.name}</p>
                    {isWeekly && <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/15 text-blue-400 shrink-0">W</span>}
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', doneToday ? 'bg-green-400' : 'bg-white/20')} />
                  </div>
                  <p className="text-[10px] text-primary/60 italic truncate">{habit.identityStatement}</p>
                </div>
              </div>

              {/* 14-day dots */}
              <div className="flex gap-0.5 w-24 hidden sm:flex">
                {last14.map(dateKey => (
                  <div
                    key={dateKey}
                    title={dateKey}
                    className={cn(
                      'w-3 h-3 rounded-sm',
                      habit.completions[dateKey] ? 'bg-primary/80' : dateKey === today ? 'bg-white/15' : 'bg-white/5'
                    )}
                  />
                ))}
              </div>

              {/* Streak */}
              <p className={cn('text-xs font-semibold text-right w-10', streakColor(streak))}>
                {streak}{isWeekly ? 'w' : 'd'}
              </p>

              {/* 30-day rate */}
              <p className={cn(
                'text-xs font-semibold text-right w-10',
                rate >= 70 ? 'text-green-400' : rate >= 40 ? 'text-yellow-400' : 'text-muted-foreground'
              )}>
                {rate}%
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Habits ──────────────────────────────────────────────────────────────

export function Habits() {
  const [habits, setHabits] = useState<Habit[]>(loadHabits)
  const [tab, setTab] = useState<'today' | 'library' | 'insights'>('today')
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)

  useEffect(() => { saveHabits(habits) }, [habits])

  function toggleHabit(id: string) {
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h
      const today = todayIso()
      const updated = { ...h.completions }
      if (h.frequency === 'daily') {
        if (updated[today]) delete updated[today]
        else updated[today] = true
      } else {
        if (isCompletedThisWeek(updated)) {
          const ws = getWeekStartIso()
          const we = new Date(ws); we.setDate(we.getDate() + 7)
          const weStr = isoDate(we)
          Object.keys(updated).forEach(k => { if (k >= ws && k < weStr) delete updated[k] })
        } else {
          updated[today] = true
        }
      }
      return { ...h, completions: updated }
    }))
  }

  function deleteHabit(id: string) {
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  function addPreset(preset: HabitPreset) {
    const habit: Habit = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...preset,
      completions: {},
      addedAt: new Date().toISOString(),
    }
    setHabits(prev => [...prev, habit])
    setTab('today')
  }

  function addCustom(data: Omit<Habit, 'id' | 'completions' | 'addedAt'>) {
    const habit: Habit = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...data,
      completions: {},
      addedAt: new Date().toISOString(),
    }
    setHabits(prev => [...prev, habit])
    setTab('today')
  }

  function updateHabit(id: string, patch: Partial<Habit>) {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...patch } : h))
  }

  const today = todayIso()
  const daily = habits.filter(h => h.frequency === 'daily')
  const weekly = habits.filter(h => h.frequency === 'weekly')
  const doneDaily = daily.filter(h => !!h.completions[today]).length
  const doneWeekly = weekly.filter(h => isCompletedThisWeek(h.completions)).length
  const allDone = habits.length > 0 && doneDaily === daily.length && doneWeekly === weekly.length
  const totalMissedTwice = habits.filter(h => needsNeverMissTwice(h)).length

  return (
    <div className="space-y-6">
      {/* Modals */}
      {showCustomModal && (
        <AddCustomModal onClose={() => setShowCustomModal(false)} onAdd={addCustom} />
      )}
      {editingHabit && (
        <EditHabitModal
          habit={editingHabit}
          onClose={() => setEditingHabit(null)}
          onSave={(id, patch) => updateHabit(id, patch)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Habits</h1>
          {habits.length > 0 && (
            <span className="text-xs text-muted-foreground">({habits.length})</span>
          )}
        </div>
        <button
          onClick={() => setTab('library')}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Add Habit
        </button>
      </div>

      {/* Tab bar */}
      <div className="glass rounded-2xl p-1.5 flex gap-1">
        {([
          { key: 'today',    label: 'Today',    icon: <Activity className="w-3.5 h-3.5" /> },
          { key: 'library',  label: 'Library',  icon: <BookOpen className="w-3.5 h-3.5" /> },
          { key: 'insights', label: 'Insights', icon: <BarChart3 className="w-3.5 h-3.5" /> },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all',
              tab === t.key
                ? 'bg-primary/20 text-primary border border-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Today tab ── */}
      {tab === 'today' && (
        <div className="space-y-6">
          {habits.length === 0 ? (
            <div className="glass rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
              <span className="text-5xl">🌱</span>
              <p className="text-base font-semibold text-foreground">No habits yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">Start building routines that last. Browse the library to find habits that match the person you want to become.</p>
              <button
                onClick={() => setTab('library')}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors text-sm font-medium"
              >
                <BookOpen className="w-4 h-4" /> Browse Library
              </button>
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className={cn(
                'glass rounded-2xl p-4 flex items-center gap-4',
                allDone && 'border border-green-500/20 bg-green-500/5'
              )}>
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
                  allDone ? 'bg-green-500/20' : 'bg-primary/15'
                )}>
                  {allDone
                    ? <span className="text-xl">🔥</span>
                    : <span className="text-xl font-bold text-primary">{doneDaily + doneWeekly}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {allDone
                      ? 'All habits done — perfect day!'
                      : `${doneDaily} of ${daily.length} daily · ${doneWeekly} of ${weekly.length} weekly`}
                  </p>
                  {totalMissedTwice > 0 && (
                    <p className="text-xs text-amber-400 mt-0.5">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      {totalMissedTwice} habit{totalMissedTwice > 1 ? 's' : ''} — don't miss twice today
                    </p>
                  )}
                </div>
                {/* Progress bar */}
                <div className="w-20 shrink-0">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', allDone ? 'bg-green-400' : 'bg-primary')}
                      style={{ width: `${habits.length > 0 ? Math.round(((doneDaily + doneWeekly) / habits.length) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right mt-1">
                    {habits.length > 0 ? Math.round(((doneDaily + doneWeekly) / habits.length) * 100) : 0}%
                  </p>
                </div>
              </div>

              {/* Daily habits */}
              {daily.length > 0 && (
                <div className="space-y-3">
                  {daily.length > 0 && weekly.length > 0 && (
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Daily</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {daily.map(h => (
                      <TodayHabitCard key={h.id} habit={h} onToggle={toggleHabit} onDelete={deleteHabit} onEdit={setEditingHabit} />
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly habits */}
              {weekly.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This Week</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {weekly.map(h => (
                      <TodayHabitCard key={h.id} habit={h} onToggle={toggleHabit} onDelete={deleteHabit} onEdit={setEditingHabit} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Library tab ── */}
      {tab === 'library' && (
        <LibraryView
          habits={habits}
          onAddPreset={addPreset}
          onAddCustom={() => setShowCustomModal(true)}
        />
      )}

      {/* ── Insights tab ── */}
      {tab === 'insights' && (
        <InsightsView habits={habits} />
      )}
    </div>
  )
}
