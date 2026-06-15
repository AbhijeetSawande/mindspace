import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Play, Pause, RotateCcw, Bell, BellOff, Clock } from 'lucide-react'

type Mode = 'focus' | 'short' | 'long'

interface FocusSession {
  task: string
  duration: number
  completedAt: string
}

const MODE_DEFAULTS: Record<Mode, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
}

const MODE_LABELS: Record<Mode, string> = {
  focus: 'Focus',
  short: 'Short Break',
  long: 'Long Break',
}

function loadSessions(): FocusSession[] {
  try {
    return JSON.parse(localStorage.getItem('cortex-focus-sessions') || '[]')
  } catch {
    return []
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function fmtTime(secs: number) {
  return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`
}

export function FocusTimer() {
  const [mode, setMode] = useState<Mode>('focus')
  const [totalSecs, setTotalSecs] = useState(MODE_DEFAULTS.focus)
  const [remaining, setRemaining] = useState(MODE_DEFAULTS.focus)
  const [running, setRunning] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [task, setTask] = useState('')
  const [customMins, setCustomMins] = useState('')
  const [sessions, setSessions] = useState<FocusSession[]>(loadSessions)
  const [focusCount, setFocusCount] = useState(0)

  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            if (mode === 'focus') {
              const newSession: FocusSession = {
                task: task || 'Untitled session',
                duration: Math.floor(totalSecs / 60),
                completedAt: new Date().toISOString(),
              }
              const updated = [newSession, ...sessions].slice(0, 50)
              setSessions(updated)
              localStorage.setItem('cortex-focus-sessions', JSON.stringify(updated))
              setFocusCount((c) => c + 1)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, mode, task, totalSecs, sessions])

  function switchMode(m: Mode) {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    setMode(m)
    setTotalSecs(MODE_DEFAULTS[m])
    setRemaining(MODE_DEFAULTS[m])
    setCustomMins('')
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    setRemaining(totalSecs)
  }

  function applyCustom() {
    const mins = parseInt(customMins, 10)
    if (!mins || mins < 1 || mins > 180) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    const secs = mins * 60
    setTotalSecs(secs)
    setRemaining(secs)
  }

  const pct = totalSecs > 0 ? ((totalSecs - remaining) / totalSecs) * 100 : 0
  const sessionInCycle = (focusCount % 4) + 1
  const todaySessions = sessions.filter((s) => s.completedAt.startsWith(new Date().toISOString().split('T')[0]))

  const ringColor = mode === 'focus' ? 'text-primary' : mode === 'short' ? 'text-green-400' : 'text-blue-400'
  const ringBg = mode === 'focus' ? 'bg-primary/15' : mode === 'short' ? 'bg-green-400/15' : 'bg-blue-400/15'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Focus Timer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pomodoro-powered deep work</p>
        </div>
        <button
          onClick={() => setSoundOn((s) => !s)}
          className="glass rounded-xl p-2.5 text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-white/10"
          title={soundOn ? 'Sound on' : 'Sound off'}
        >
          {soundOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Timer column */}
        <div className="lg:col-span-3 space-y-5">
          {/* Mode tabs */}
          <div className="glass rounded-2xl p-1.5 flex gap-1">
            {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-xs font-semibold transition-all',
                  mode === m
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Circle timer */}
          <div className="glass rounded-2xl p-8 flex flex-col items-center gap-6">
            <div
              className={cn(
                'w-52 h-52 rounded-full flex items-center justify-center relative',
                ringBg,
                'border-4',
                mode === 'focus' ? 'border-primary/30' : mode === 'short' ? 'border-green-400/30' : 'border-blue-400/30'
              )}
              style={{
                background: `conic-gradient(hsl(var(--primary)) ${pct * 3.6}deg, transparent 0deg)`,
                ...(mode !== 'focus' ? {} : {}),
              }}
            >
              <div className={cn(
                'w-44 h-44 rounded-full flex flex-col items-center justify-center',
                'bg-[hsl(var(--background))]'
              )}>
                <span className={cn('text-5xl font-bold tabular-nums tracking-tight', ringColor)}>
                  {fmtTime(remaining)}
                </span>
                <span className="text-xs text-muted-foreground mt-1">{MODE_LABELS[mode]}</span>
              </div>
            </div>

            {/* Session counter */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className={cn(
                    'w-2.5 h-2.5 rounded-full transition-all',
                    n <= (focusCount % 4) ? 'bg-primary' : 'bg-white/10'
                  )}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-2">
                Session {sessionInCycle} of 4
              </span>
            </div>

            {/* Task input */}
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="What are you focusing on?"
              disabled={running}
              className="w-full text-center bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-white/10 pb-1 disabled:opacity-50"
            />

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={reset}
                className="p-3 rounded-xl glass border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRunning((r) => !r)}
                className={cn(
                  'flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-all',
                  'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                )}
              >
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {running ? 'Pause' : 'Start'}
              </button>
            </div>

            {/* Custom duration */}
            {!running && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={customMins}
                  onChange={(e) => setCustomMins(e.target.value)}
                  placeholder="Custom mins"
                  min={1}
                  max={180}
                  className="w-32 text-center bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border border-white/10 rounded-lg px-2 py-1.5"
                />
                <button
                  onClick={applyCustom}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
                >
                  Set
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sessions log */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Today's Sessions ({todaySessions.length})
          </h3>
          {todaySessions.length === 0 ? (
            <div className="glass rounded-2xl p-5 text-center text-xs text-muted-foreground">
              No sessions yet. Start your first focus session!
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
              {todaySessions.map((s, i) => (
                <div key={i} className="glass rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground truncate flex-1">{s.task}</span>
                    <span className="text-xs text-primary ml-2 shrink-0">{s.duration}m</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(s.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
