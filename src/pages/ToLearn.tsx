import { useState, useEffect, useRef } from 'react'
import {
  Plus, ChevronUp, ChevronDown, Trash2, PlayCircle, CheckCircle2,
  GraduationCap, X, Sparkles, Check, Link, RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type LearnStatus = 'queued' | 'in-progress' | 'done'

type LearnCategory =
  | 'Programming'
  | 'Design'
  | 'Finance'
  | 'Language'
  | 'Business'
  | 'Science'
  | 'Other'

interface Milestone {
  text: string
  done: boolean
}

interface LearnItem {
  id: string
  title: string
  category: LearnCategory
  status: LearnStatus
  estimatedTime: string
  notes: string
  resources: string[]
  milestones: Milestone[]
  order: number
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cortex-tolearn'

const CATEGORIES: LearnCategory[] = [
  'Programming', 'Design', 'Finance', 'Language', 'Business', 'Science', 'Other',
]

const CAT_COLORS: Record<LearnCategory, string> = {
  Programming: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  Design:      'bg-pink-500/15 text-pink-400 border-pink-500/20',
  Finance:     'bg-green-500/15 text-green-400 border-green-500/20',
  Language:    'bg-purple-500/15 text-purple-400 border-purple-500/20',
  Business:    'bg-amber-500/15 text-amber-400 border-amber-500/20',
  Science:     'bg-teal-500/15 text-teal-400 border-teal-500/20',
  Other:       'bg-gray-500/15 text-gray-400 border-gray-500/20',
}

const STATUS_COLORS: Record<LearnStatus, string> = {
  queued:      'bg-white/5 text-muted-foreground border-white/10',
  'in-progress':'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  done:        'bg-green-500/15 text-green-400 border-green-500/20',
}

const STATUS_LABELS: Record<LearnStatus, string> = {
  queued:      'Queued',
  'in-progress':'In Progress',
  done:        'Done',
}

type TabFilter = 'all' | LearnStatus

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'queued',      label: 'Queued' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'done',        label: 'Done' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function load(): LearnItem[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function persist(items: LearnItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2)}` }

// ─── Add Item form ────────────────────────────────────────────────────────────

interface AddFormState {
  title: string
  category: LearnCategory
  estimatedTime: string
  notes: string
  resourceInput: string
  resources: string[]
}

function initAddForm(): AddFormState {
  return { title: '', category: 'Programming', estimatedTime: '', notes: '', resourceInput: '', resources: [] }
}

interface AddItemPanelProps {
  onClose: () => void
  onAdd: (item: LearnItem) => void
  nextOrder: number
}

function AddItemPanel({ onClose, onAdd, nextOrder }: AddItemPanelProps) {
  const [form, setForm] = useState<AddFormState>(initAddForm)

  const set = <K extends keyof AddFormState>(key: K, val: AddFormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const addResource = () => {
    const r = form.resourceInput.trim()
    if (!r) return
    set('resources', [...form.resources, r])
    set('resourceInput', '')
  }

  const removeResource = (idx: number) =>
    set('resources', form.resources.filter((_, i) => i !== idx))

  const submit = () => {
    if (!form.title.trim()) return
    const item: LearnItem = {
      id: uid(),
      title: form.title.trim(),
      category: form.category,
      status: 'queued',
      estimatedTime: form.estimatedTime.trim(),
      notes: form.notes.trim(),
      resources: form.resources,
      milestones: [],
      order: nextOrder,
      createdAt: new Date().toISOString(),
    }
    onAdd(item)
    onClose()
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4 border border-primary/20">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" /> New Learning Item
        </p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Topic title *"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors sm:col-span-2"
        />
        <select
          value={form.category}
          onChange={(e) => set('category', e.target.value as LearnCategory)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors appearance-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-background">{c}</option>
          ))}
        </select>
        <input
          type="text"
          value={form.estimatedTime}
          onChange={(e) => set('estimatedTime', e.target.value)}
          placeholder="Estimated time (e.g. 2 hours, 1 week)"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      <textarea
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
        placeholder="Notes (optional)..."
        rows={2}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors resize-none"
      />

      {/* Resources */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Resources (URLs or book names)</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.resourceInput}
            onChange={(e) => set('resourceInput', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addResource())}
            placeholder="Add URL or resource name…"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
          />
          <button
            onClick={addResource}
            className="px-3 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors text-xs"
          >
            Add
          </button>
        </div>
        {form.resources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.resources.map((r, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                <Link className="w-3 h-3" />
                <span className="max-w-[180px] truncate">{r}</span>
                <button onClick={() => removeResource(i)} className="hover:text-red-400 transition-colors ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!form.title.trim()}
          className="px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add Item
        </button>
      </div>
    </div>
  )
}

// ─── Item detail overlay ───────────────────────────────────────────────────────

interface ItemDetailProps {
  item: LearnItem
  onChange: (item: LearnItem) => void
  onClose: () => void
}

function ItemDetail({ item, onChange, onClose }: ItemDetailProps) {
  const [localTitle, setLocalTitle] = useState(item.title)
  const [localNotes, setLocalNotes] = useState(item.notes)
  const [localEst, setLocalEst] = useState(item.estimatedTime)
  const [localCategory, setLocalCategory] = useState(item.category)
  const [resourceInput, setResourceInput] = useState('')
  const [milestoneInput, setMilestoneInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save text fields
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      onChange({
        ...item,
        title: localTitle.trim() || item.title,
        notes: localNotes,
        estimatedTime: localEst,
        category: localCategory,
      })
    }, 600)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localTitle, localNotes, localEst, localCategory])

  const update = (patch: Partial<LearnItem>) => onChange({ ...item, ...patch })

  const toggleMilestone = (idx: number) => {
    const milestones = item.milestones.map((m, i) =>
      i === idx ? { ...m, done: !m.done } : m,
    )
    update({ milestones })
  }

  const addMilestone = () => {
    const text = milestoneInput.trim()
    if (!text) return
    update({ milestones: [...item.milestones, { text, done: false }] })
    setMilestoneInput('')
  }

  const deleteMilestone = (idx: number) =>
    update({ milestones: item.milestones.filter((_, i) => i !== idx) })

  const addResource = () => {
    const r = resourceInput.trim()
    if (!r) return
    update({ resources: [...item.resources, r] })
    setResourceInput('')
  }

  const removeResource = (idx: number) =>
    update({ resources: item.resources.filter((_, i) => i !== idx) })

  const generateRoadmap = async () => {
    const key = localStorage.getItem('cortex-gemini-key')?.trim()
    if (!key) {
      setAiError('Add your Gemini API key in Settings to unlock AI roadmap generation.')
      return
    }
    setAiLoading(true)
    setAiError('')
    try {
      const prompt = `Generate 5 specific learning milestones for someone learning: "${item.title}". Category: ${item.category}. Estimated time: ${item.estimatedTime || 'unspecified'}. Return a JSON array of strings: ["milestone1", "milestone2", ...]`
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      )
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      const match = rawText.match(/\[[\s\S]*?\]/)
      if (!match) throw new Error('No JSON array found in response')
      const parsed: string[] = JSON.parse(match[0])
      const newMilestones: Milestone[] = parsed.map((text) => ({ text, done: false }))
      update({ milestones: [...item.milestones, ...newMilestones] })
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate roadmap. Try again.')
    } finally {
      setAiLoading(false)
    }
  }

  const doneMilestones = item.milestones.filter((m) => m.done).length

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-3">
              <input
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                className="w-full bg-transparent text-lg font-bold text-foreground border-b border-white/10 pb-1 focus:outline-none focus:border-primary/40 transition-colors"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  value={localCategory}
                  onChange={(e) => setLocalCategory(e.target.value as LearnCategory)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs text-foreground focus:outline-none focus:border-primary/40 transition-colors appearance-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-background">{c}</option>
                  ))}
                </select>
                <span className={cn('text-xs px-2.5 py-1 rounded-full border', STATUS_COLORS[item.status])}>
                  {STATUS_LABELS[item.status]}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Estimated time */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Estimated Time</p>
            <input
              type="text"
              value={localEst}
              onChange={(e) => setLocalEst(e.target.value)}
              placeholder="e.g. 2 hours, 1 week, 3 months"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Notes</p>
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Why do you want to learn this? Any context..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors resize-none"
            />
          </div>

          {/* Milestones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                Milestones {item.milestones.length > 0 && (
                  <span className="font-normal text-muted-foreground ml-1">
                    ({doneMilestones}/{item.milestones.length})
                  </span>
                )}
              </p>
              <button
                onClick={generateRoadmap}
                disabled={aiLoading}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <>
                    <div className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" /> AI Roadmap
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <div className="text-xs px-3 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">!</span>
                <span>{aiError}</span>
              </div>
            )}

            {item.milestones.length > 0 && (
              <div className="space-y-2">
                {item.milestones.map((m, idx) => (
                  <div key={idx} className="flex items-start gap-2 group">
                    <button
                      onClick={() => toggleMilestone(idx)}
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                        m.done
                          ? 'bg-green-500/20 border-green-500/40 text-green-400'
                          : 'border-white/20 hover:border-primary/40',
                      )}
                    >
                      {m.done && <Check className="w-2.5 h-2.5" />}
                    </button>
                    <span className={cn('flex-1 text-sm', m.done && 'line-through text-muted-foreground')}>
                      {m.text}
                    </span>
                    <button
                      onClick={() => deleteMilestone(idx)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-red-400 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={milestoneInput}
                onChange={(e) => setMilestoneInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMilestone())}
                placeholder="Add a milestone…"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
              />
              <button
                onClick={addMilestone}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors text-xs"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Resources</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={resourceInput}
                onChange={(e) => setResourceInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addResource())}
                placeholder="Add URL or book name…"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
              />
              <button
                onClick={addResource}
                className="px-3 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors text-xs"
              >
                Add
              </button>
            </div>
            {item.resources.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.resources.map((r, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                    <Link className="w-3 h-3 shrink-0" />
                    <span className="max-w-[200px] truncate">{r}</span>
                    <button onClick={() => removeResource(i)} className="hover:text-red-400 transition-colors ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground/40">
            Added {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}Auto-saved
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Learn item card ──────────────────────────────────────────────────────────

interface LearnCardProps {
  item: LearnItem
  isFirst: boolean
  isLast: boolean
  onMove: (id: string, dir: -1 | 1) => void
  onStatus: (id: string, status: LearnStatus) => void
  onDelete: (id: string) => void
  onSelect: (item: LearnItem) => void
}

function LearnCard({ item, isFirst, isLast, onMove, onStatus, onDelete, onSelect }: LearnCardProps) {
  const visibleMilestones = item.milestones.slice(0, 3)
  const extraCount = item.milestones.length - 3

  return (
    <div className="glass rounded-xl p-4 flex items-start gap-3 hover:border-primary/20 transition-all duration-200">
      {/* Reorder buttons */}
      <div className="flex flex-col gap-0.5 pt-0.5 shrink-0">
        <button
          onClick={() => onMove(item.id, -1)}
          disabled={isFirst}
          className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground disabled:opacity-20 transition-colors"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={() => onMove(item.id, 1)}
          disabled={isLast}
          className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground disabled:opacity-20 transition-colors"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <button
          onClick={() => onSelect(item)}
          className="w-full text-left"
        >
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground flex-1 min-w-0 hover:text-primary transition-colors">
              {item.title}
            </span>
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0', CAT_COLORS[item.category])}>
              {item.category}
            </span>
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0', STATUS_COLORS[item.status])}>
              {STATUS_LABELS[item.status]}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {item.estimatedTime && (
              <span className="text-xs text-muted-foreground">
                ⏱ {item.estimatedTime}
              </span>
            )}
            {item.notes && (
              <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                {item.notes.slice(0, 80)}{item.notes.length > 80 && '…'}
              </span>
            )}
          </div>

          {/* Milestones mini-list */}
          {item.milestones.length > 0 && (
            <div className="mt-2 space-y-1">
              {visibleMilestones.map((m, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={cn(
                    'w-3 h-3 rounded border flex items-center justify-center shrink-0',
                    m.done
                      ? 'bg-green-500/20 border-green-500/40 text-green-400'
                      : 'border-white/20',
                  )}>
                    {m.done && <Check className="w-2 h-2" />}
                  </div>
                  <span className={cn('text-[11px]', m.done ? 'line-through text-muted-foreground/50' : 'text-muted-foreground')}>
                    {m.text}
                  </span>
                </div>
              ))}
              {extraCount > 0 && (
                <p className="text-[11px] text-muted-foreground/50 pl-4">+{extraCount} more…</p>
              )}
            </div>
          )}
        </button>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {item.status === 'queued' && (
            <button
              onClick={() => onStatus(item.id, 'in-progress')}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/25 transition-colors"
            >
              <PlayCircle className="w-3 h-3" /> Start Learning
            </button>
          )}
          {item.status === 'in-progress' && (
            <button
              onClick={() => onStatus(item.id, 'done')}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-green-500/15 text-green-400 border border-green-500/20 hover:bg-green-500/25 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" /> Mark Done
            </button>
          )}
          {item.status === 'done' && (
            <button
              onClick={() => onStatus(item.id, 'queued')}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Move to Queue
            </button>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition-colors ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ToLearn() {
  const [items, setItems] = useState<LearnItem[]>(load)
  const [tab, setTab] = useState<TabFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<LearnItem | null>(null)

  const update = (next: LearnItem[]) => {
    setItems(next)
    persist(next)
  }

  const addItem = (item: LearnItem) => update([...items, item])

  const updateItem = (updated: LearnItem) => {
    const next = items.map((i) => i.id === updated.id ? updated : i)
    update(next)
    setSelected(updated)
  }

  const moveItem = (id: string, dir: -1 | 1) => {
    const sorted = [...items].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((i) => i.id === id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const a = sorted[idx], b = sorted[swapIdx]
    update(items.map((item) => {
      if (item.id === a.id) return { ...item, order: b.order }
      if (item.id === b.id) return { ...item, order: a.order }
      return item
    }))
  }

  const setStatus = (id: string, status: LearnStatus) =>
    update(items.map((i) => i.id === id ? { ...i, status } : i))

  const deleteItem = (id: string) => update(items.filter((i) => i.id !== id))

  const sorted = [...items].sort((a, b) => a.order - b.order)
  const filtered = tab === 'all' ? sorted : sorted.filter((i) => i.status === tab)

  const doneCount = items.filter((i) => i.status === 'done').length
  const inProgressCount = items.filter((i) => i.status === 'in-progress').length
  const queuedCount = items.filter((i) => i.status === 'queued').length

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Detail overlay */}
      {selected && (
        <ItemDetail
          item={selected}
          onChange={updateItem}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">To Learn</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your structured learning path</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Summary stats */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'Done', value: doneCount, color: 'text-green-400' },
          { label: 'In Progress', value: inProgressCount, color: 'text-yellow-400' },
          { label: 'Queued', value: queuedCount, color: 'text-muted-foreground' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-xl px-4 py-2.5 flex items-center gap-2">
            <span className={cn('text-xl font-bold tabular-nums', color)}>{value}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <AddItemPanel
          onClose={() => setShowForm(false)}
          onAdd={addItem}
          nextOrder={items.length}
        />
      )}

      {/* Status tabs */}
      <div className="glass rounded-2xl p-1.5 flex gap-1">
        {TABS.map(({ key, label }) => {
          const count = key === 'all' ? items.length : items.filter((i) => i.status === key).length
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                tab === key
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
              )}
            >
              {label}
              <span className="opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Items list */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-16 flex flex-col items-center text-center gap-3">
          <GraduationCap className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {items.length === 0
              ? 'Nothing to learn yet. Add topics you want to master.'
              : `No ${tab === 'all' ? '' : STATUS_LABELS[tab as LearnStatus] + ' '}items.`}
          </p>
          {items.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-xs px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
            >
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item, idx) => (
            <LearnCard
              key={item.id}
              item={item}
              isFirst={idx === 0}
              isLast={idx === filtered.length - 1}
              onMove={moveItem}
              onStatus={setStatus}
              onDelete={deleteItem}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}
    </div>
  )
}
