import { useState, useEffect } from 'react'
import { Target, Plus, X, Check, Trash2, Edit2, Sparkles, Loader2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const LS_KEY = 'cortex-goals'
const GEMINI_LS_KEY = 'cortex-gemini-key'

type Category = 'Career' | 'Finance' | 'Health' | 'Learning' | 'Travel' | 'Personal' | 'Relationships'

interface Milestone {
  id: string
  text: string
  done: boolean
}

interface Goal {
  id: string
  title: string
  why: string
  category: Category
  deadline: string
  milestones: Milestone[]
  createdAt: string
}

const CATEGORIES: { name: Category; color: string; bg: string; border: string; icon: string; gradient: string }[] = [
  { name: 'Career',        color: 'text-violet-400',  bg: 'bg-violet-500/15',  border: 'border-violet-500/30',  icon: '💼', gradient: 'from-violet-500 to-purple-500' },
  { name: 'Finance',       color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', icon: '💰', gradient: 'from-emerald-500 to-green-500' },
  { name: 'Health',        color: 'text-red-400',     bg: 'bg-red-500/15',     border: 'border-red-500/30',     icon: '❤️', gradient: 'from-red-500 to-rose-500' },
  { name: 'Learning',      color: 'text-blue-400',    bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    icon: '📚', gradient: 'from-blue-500 to-cyan-500' },
  { name: 'Travel',        color: 'text-yellow-400',  bg: 'bg-yellow-500/15',  border: 'border-yellow-500/30',  icon: '✈️', gradient: 'from-yellow-500 to-amber-500' },
  { name: 'Personal',      color: 'text-pink-400',    bg: 'bg-pink-500/15',    border: 'border-pink-500/30',    icon: '🌟', gradient: 'from-pink-500 to-fuchsia-500' },
  { name: 'Relationships', color: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  icon: '🤝', gradient: 'from-orange-500 to-amber-500' },
]

function catMeta(name: Category) {
  return CATEGORIES.find((c) => c.name === name) ?? CATEGORIES[0]
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch { /* ignore */ }
  return []
}

function saveGoals(goals: Goal[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(goals))
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, gradient }: { value: number; gradient: string }) {
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500 bg-gradient-to-r', gradient)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

// ─── GoalCard ─────────────────────────────────────────────────────────────────
function GoalCard({
  goal,
  onToggleMilestone,
  onDelete,
  onEdit,
  onAddMilestone,
}: {
  goal: Goal
  onToggleMilestone: (gid: string, mid: string) => void
  onDelete: (id: string) => void
  onEdit: (g: Goal) => void
  onAddMilestone: (gid: string, text: string) => void
}) {
  const [milestoneInput, setMilestoneInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMsg, setAiMsg] = useState('')

  const meta = catMeta(goal.category)
  const total = goal.milestones.length
  const done = goal.milestones.filter((m) => m.done).length
  const progress = total === 0 ? 0 : Math.round((done / total) * 100)

  const addMilestone = () => {
    const t = milestoneInput.trim()
    if (!t) return
    onAddMilestone(goal.id, t)
    setMilestoneInput('')
  }

  const handleAiRoadmap = async () => {
    const key = localStorage.getItem(GEMINI_LS_KEY)?.trim()
    if (!key) {
      setAiMsg('Add your Gemini API key in Settings to auto-generate milestones.')
      setTimeout(() => setAiMsg(''), 4000)
      return
    }
    setAiLoading(true)
    setAiMsg('')
    try {
      const prompt = `Generate 5 specific, actionable milestones for this goal: ${goal.title}. Why: ${goal.why}. Deadline: ${goal.deadline}. Return only a JSON array of strings: ["milestone1", "milestone2", ...]`
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )
      if (!res.ok) throw new Error('Gemini API error')
      const data = await res.json()
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('No JSON array found')
      const arr: string[] = JSON.parse(match[0])
      arr.forEach((t) => {
        if (typeof t === 'string' && t.trim()) {
          onAddMilestone(goal.id, t.trim())
        }
      })
      setAiMsg(`Added ${arr.length} milestones!`)
      setTimeout(() => setAiMsg(''), 3000)
    } catch {
      setAiMsg('Failed to generate milestones. Check your API key.')
      setTimeout(() => setAiMsg(''), 4000)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="glass rounded-2xl overflow-hidden transition-all duration-200 hover:border-white/12">
      {/* Accent top bar */}
      <div className={cn('h-0.5 bg-gradient-to-r', meta.gradient)} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-xl mt-0.5 shrink-0">{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground leading-snug">{goal.title}</h3>
              {goal.why && (
                <p className="text-xs text-muted-foreground italic mt-1 leading-relaxed">
                  Because {goal.why.replace(/^because\s+/i, '')}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={cn('text-[11px] px-2 py-0.5 rounded-full border', meta.bg, meta.border, meta.color)}>
                  {goal.category}
                </span>
                {goal.deadline && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    📅 {goal.deadline}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(goal)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground">
              {total === 0 ? 'No milestones yet' : `${done} / ${total} done`}
            </span>
            <span className={cn('text-[11px] font-semibold', meta.color)}>{progress}%</span>
          </div>
          <ProgressBar value={progress} gradient={meta.gradient} />
        </div>

        {/* Milestones */}
        {total > 0 && (
          <div className="space-y-2">
            {goal.milestones.map((m) => (
              <button
                key={m.id}
                onClick={() => onToggleMilestone(goal.id, m.id)}
                className="w-full flex items-center gap-2.5 group text-left"
              >
                <div className={cn(
                  'w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all',
                  m.done
                    ? cn('border-transparent', meta.bg)
                    : 'border-muted-foreground group-hover:border-primary'
                )}>
                  {m.done && <Check className={cn('w-2.5 h-2.5', meta.color)} />}
                </div>
                <span className={cn(
                  'text-xs flex-1 text-left transition-colors',
                  m.done ? 'line-through text-muted-foreground' : 'text-foreground group-hover:text-primary'
                )}>
                  {m.text}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Add milestone inline */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={milestoneInput}
            onChange={(e) => setMilestoneInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMilestone()}
            placeholder="Add a milestone..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
          />
          <button
            onClick={addMilestone}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* AI Roadmap */}
        <div className="pt-1 border-t border-white/5 flex items-center justify-between">
          <button
            onClick={handleAiRoadmap}
            disabled={aiLoading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            {aiLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Sparkles className="w-3.5 h-3.5" />}
            AI Roadmap
          </button>
          {aiMsg && (
            <span className={cn(
              'text-[11px]',
              aiMsg.startsWith('Added') ? 'text-emerald-400' : 'text-amber-400'
            )}>
              {aiMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── GoalForm (add/edit panel) ────────────────────────────────────────────────
function GoalForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Goal
  onSave: (g: Goal) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [why, setWhy] = useState(initial?.why ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? 'Career')
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [milestonesText, setMilestonesText] = useState(
    initial ? initial.milestones.map((m) => m.text).join('\n') : ''
  )

  const handleSave = () => {
    const t = title.trim()
    if (!t) return
    const milestonesArr: Milestone[] = milestonesText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text, i) => ({
        id: initial?.milestones[i]?.id ?? uid(),
        text,
        done: initial?.milestones[i]?.done ?? false,
      }))
    const goal: Goal = {
      id: initial?.id ?? uid(),
      title: t,
      why: why.trim(),
      category,
      deadline: deadline.trim(),
      milestones: milestonesArr,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    }
    onSave(goal)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end" onClick={onCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      {/* Panel */}
      <div
        className="relative w-full max-w-md glass border-l border-white/10 flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
          <h2 className="text-base font-bold text-foreground">
            {initial ? 'Edit Goal' : 'New Goal'}
          </h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Goal title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Get promoted to SDE3"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Why this goal? (motivation)</label>
            <input
              type="text"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="What's your deeper motivation..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name} className="bg-[hsl(var(--card))]">
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Deadline</label>
              <input
                type="text"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="Dec 2027, Q2 2026..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">
              Milestones <span className="opacity-60">(one per line)</span>
            </label>
            <textarea
              value={milestonesText}
              onChange={(e) => setMilestonesText(e.target.value)}
              placeholder={`Research role requirements\nBuild a portfolio project\nGet manager feedback\n...`}
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>

        <div className="px-6 pb-6 pt-3 border-t border-white/5 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="text-xs px-4 py-2 rounded-xl border border-white/10 text-muted-foreground hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex items-center gap-2 text-xs px-5 py-2 rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-3.5 h-3.5" />
            {initial ? 'Save changes' : 'Create goal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Goals page ──────────────────────────────────────────────────────────
type FilterTab = Category | 'All'

export function Goals() {
  const [goals, setGoals] = useState<Goal[]>(loadGoals)
  const [filterTab, setFilterTab] = useState<FilterTab>('All')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Goal | undefined>(undefined)

  useEffect(() => { saveGoals(goals) }, [goals])

  const saveGoal = (g: Goal) => {
    setGoals((prev) => {
      const idx = prev.findIndex((x) => x.id === g.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = g
        return next
      }
      return [g, ...prev]
    })
    setShowForm(false)
    setEditing(undefined)
  }

  const deleteGoal = (id: string) => setGoals((prev) => prev.filter((g) => g.id !== id))

  const toggleMilestone = (gid: string, mid: string) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id !== gid
          ? g
          : { ...g, milestones: g.milestones.map((m) => (m.id === mid ? { ...m, done: !m.done } : m)) }
      )
    )
  }

  const addMilestone = (gid: string, text: string) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id !== gid ? g : { ...g, milestones: [...g.milestones, { id: uid(), text, done: false }] }
      )
    )
  }

  const openEdit = (g: Goal) => { setEditing(g); setShowForm(true) }
  const openNew = () => { setEditing(undefined); setShowForm(true) }

  const TABS: FilterTab[] = ['All', ...CATEGORIES.map((c) => c.name as FilterTab)]
  const filteredGoals = filterTab === 'All' ? goals : goals.filter((g) => g.category === filterTab)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Goals</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {goals.length === 0
              ? 'Set your first goal'
              : `${goals.length} goal${goals.length !== 1 ? 's' : ''} · ${goals.filter((g) => g.milestones.length > 0 && g.milestones.every((m) => m.done)).length} completed`}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Goal
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((tab) => {
          const meta = tab !== 'All' ? catMeta(tab as Category) : null
          const count = tab === 'All' ? goals.length : goals.filter((g) => g.category === tab).length
          if (tab !== 'All' && count === 0) return null
          return (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5',
                filterTab === tab
                  ? meta
                    ? cn(meta.bg, meta.border, meta.color)
                    : 'bg-primary/20 text-primary border-primary/40'
                  : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/8 hover:text-foreground'
              )}
            >
              {meta && <span>{meta.icon}</span>}
              {tab}
              <span className="opacity-50">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Empty state */}
      {filteredGoals.length === 0 ? (
        <div className="glass rounded-2xl p-14 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Target className="w-8 h-8 text-primary/60" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              {filterTab === 'All' ? 'Set your first goal.' : `No ${filterTab} goals yet.`}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {filterTab === 'All'
                ? 'Break it into milestones. Achieve it.'
                : 'Add a goal above with this category.'}
            </p>
          </div>
          {filterTab === 'All' && (
            <button
              onClick={openNew}
              className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors font-medium"
            >
              <ChevronRight className="w-4 h-4" />
              Set your first goal
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onToggleMilestone={toggleMilestone}
              onDelete={deleteGoal}
              onEdit={openEdit}
              onAddMilestone={addMilestone}
            />
          ))}
        </div>
      )}

      {/* Add/Edit panel */}
      {showForm && (
        <GoalForm
          initial={editing}
          onSave={saveGoal}
          onCancel={() => { setShowForm(false); setEditing(undefined) }}
        />
      )}
    </div>
  )
}
