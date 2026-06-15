import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Calendar, Save, Flame, Eye, Pencil } from 'lucide-react'

type MoodKey = '😴' | '😞' | '😐' | '😊' | '🔥'

interface JournalEntry {
  body: string
  mood: MoodKey
  updatedAt: string
}

type JournalData = Record<string, JournalEntry>

const MOODS: { emoji: MoodKey; label: string }[] = [
  { emoji: '😴', label: 'Tired' },
  { emoji: '😞', label: 'Low' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😊', label: 'Good' },
  { emoji: '🔥', label: 'Pumped' },
]

function toISO(d: Date) {
  return d.toISOString().split('T')[0]
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function load(): JournalData {
  try {
    return JSON.parse(localStorage.getItem('cortex-journal') || '{}')
  } catch {
    return {}
  }
}

function save(data: JournalData) {
  localStorage.setItem('cortex-journal', JSON.stringify(data))
}

function calcStreak(data: JournalData): number {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = toISO(d)
    if (data[key]?.body?.trim()) {
      streak++
    } else {
      break
    }
  }
  return streak
}

export function Journal() {
  const [data, setData] = useState<JournalData>(load)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewingDate, setViewingDate] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isoDate = toISO(currentDate)
  const entry = data[isoDate] || { body: '', mood: '😐' as MoodKey, updatedAt: '' }

  const viewEntry = viewingDate ? data[viewingDate] : null
  const streak = calcStreak(data)

  const pastEntries = Object.entries(data)
    .filter(([d]) => d !== isoDate)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 20)

  function updateEntry(patch: Partial<JournalEntry>) {
    const updated: JournalData = {
      ...data,
      [isoDate]: { ...entry, ...patch, updatedAt: new Date().toISOString() },
    }
    setData(updated)
    save(updated)
  }

  function handleBlur() {
    if (entry.body.trim()) updateEntry({})
  }

  useEffect(() => {
    setViewingDate(null)
    setEditing(false)
  }, [isoDate])

  const wordCount = entry.body.trim() ? entry.body.trim().split(/\s+/).length : 0

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Journal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your private space to reflect</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass rounded-xl px-3 py-1.5 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-foreground">{streak} day streak</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Date nav */}
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <button
              onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d) }}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{formatDate(currentDate)}</span>
              {toISO(currentDate) !== toISO(new Date()) && (
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="text-xs px-2 py-0.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
                >
                  Today
                </button>
              )}
            </div>
            <button
              onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d) }}
              disabled={toISO(currentDate) >= toISO(new Date())}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View past entry */}
          {viewingDate && viewEntry && !editing ? (
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {new Date(viewingDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-xl">{viewEntry.mood}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => { setViewingDate(null); setEditing(false) }}
                    className="text-xs px-3 py-1.5 rounded-lg glass border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{viewEntry.body}</p>
            </div>
          ) : (
            <div className="glass rounded-2xl p-5 space-y-4">
              {/* Mood selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">Mood:</span>
                {MOODS.map(({ emoji, label }) => (
                  <button
                    key={emoji}
                    title={label}
                    onClick={() => updateEntry({ mood: emoji })}
                    className={cn(
                      'text-xl rounded-xl p-1.5 transition-all border',
                      entry.mood === emoji
                        ? 'bg-primary/20 border-primary/40 scale-110'
                        : 'border-transparent hover:bg-white/10'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <textarea
                ref={textareaRef}
                value={entry.body}
                onChange={(e) => updateEntry({ body: e.target.value })}
                onBlur={handleBlur}
                placeholder={`What's on your mind today?`}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed min-h-[280px]"
              />

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-xs text-muted-foreground">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                <button
                  onClick={() => updateEntry({})}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
                >
                  <Save className="w-3 h-3" /> Save
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Past entries sidebar */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Past Entries</h3>
          {pastEntries.length === 0 ? (
            <div className="glass rounded-2xl p-4 text-center text-xs text-muted-foreground">
              No past entries yet. Start writing!
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto scrollbar-hide">
              {pastEntries.map(([date, e]) => (
                <button
                  key={date}
                  onClick={() => { setViewingDate(date); setEditing(false) }}
                  className={cn(
                    'w-full glass rounded-xl p-3 text-left transition-all hover:border-primary/30 border border-transparent',
                    viewingDate === date && 'border-primary/40 bg-primary/5'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{e.mood}</span>
                      <Eye className="w-3 h-3 text-muted-foreground/50" />
                    </div>
                  </div>
                  <p className="text-xs text-foreground/70 line-clamp-2">
                    {e.body.slice(0, 80)}{e.body.length > 80 ? '…' : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
