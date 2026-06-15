import { useState, useEffect, useRef } from 'react'
import {
  CheckSquare, Plus, X, Trash2, Tag, ChevronRight,
  Calendar, Circle, ListChecks, AlertCircle, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'

// ─── Types ──────────────────────────────────────────────────────────────────

type Priority = 'high' | 'medium' | 'low'

type Subtask = { id: string; text: string; done: boolean }

export type TodoItem = {
  id: string
  title: string
  done: boolean
  priority: Priority
  tags: string[]
  dueDate?: string
  projectId?: string
  notes?: string
  subtasks: Subtask[]
  createdAt: string
  completedAt?: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const LS_KEY = 'cortex-todos'

type FilterTab = 'All' | 'Today' | 'Upcoming' | 'Completed'

const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-blue-400',
}

const PRIORITY_BORDER: Record<Priority, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-400',
  low: 'border-l-blue-400',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const PRIORITY_BTN: Record<Priority, string> = {
  high: 'bg-red-500/15 border-red-500/30 text-red-400',
  medium: 'bg-amber-400/15 border-amber-400/30 text-amber-400',
  low: 'bg-blue-400/15 border-blue-400/30 text-blue-400',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function uid(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2)
}

function loadTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch { /* ignore */ }
  return []
}

function saveTodos(todos: TodoItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(todos))
}

function formatDue(iso?: string): string {
  if (!iso) return ''
  const today = todayIso()
  if (iso === today) return 'Today'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── Blank form factory ──────────────────────────────────────────────────────

type PanelMode = 'add' | 'edit'

interface FormState {
  title: string
  priority: Priority
  dueDate: string
  tags: string[]
  tagInput: string
  notes: string
  subtasks: Subtask[]
  subtaskInput: string
}

const BLANK_FORM: FormState = {
  title: '',
  priority: 'medium',
  dueDate: '',
  tags: [],
  tagInput: '',
  notes: '',
  subtasks: [],
  subtaskInput: '',
}

// ─── TaskPanel (Add / Edit slide-over) ──────────────────────────────────────

export function TaskPanel({
  mode,
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  mode: PanelMode
  initial?: TodoItem
  onSave: (data: Omit<TodoItem, 'id' | 'createdAt' | 'completedAt'>) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [titleError, setTitleError] = useState(false)
  const [form, setForm] = useState<FormState>(() => {
    if (initial) {
      return {
        title: initial.title,
        priority: initial.priority,
        dueDate: initial.dueDate ?? '',
        tags: [...initial.tags],
        tagInput: '',
        notes: initial.notes ?? '',
        subtasks: initial.subtasks.map((s) => ({ ...s })),
        subtaskInput: '',
      }
    }
    return { ...BLANK_FORM }
  })

  const { theme } = useApp()
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 80)
  }, [])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const addTag = () => {
    const t = form.tagInput.trim().toLowerCase()
    if (!t || form.tags.includes(t)) { set('tagInput', ''); return }
    set('tags', [...form.tags, t])
    set('tagInput', '')
  }

  const removeTag = (t: string) => set('tags', form.tags.filter((x) => x !== t))

  const addSubtask = () => {
    const t = form.subtaskInput.trim()
    if (!t) return
    set('subtasks', [...form.subtasks, { id: uid(), text: t, done: false }])
    set('subtaskInput', '')
  }

  const removeSubtask = (id: string) =>
    set('subtasks', form.subtasks.filter((s) => s.id !== id))

  const toggleSubtask = (id: string) =>
    set('subtasks', form.subtasks.map((s) => s.id === id ? { ...s, done: !s.done } : s))

  const handleSave = () => {
    if (!form.title.trim()) { setTitleError(true); titleRef.current?.focus(); return }
    onSave({
      title: form.title.trim(),
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      tags: form.tags,
      notes: form.notes.trim() || undefined,
      subtasks: form.subtasks,
      done: initial?.done ?? false,
      projectId: initial?.projectId,
    })
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass border-l border-white/10 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <span className="text-sm font-semibold text-foreground">
            {mode === 'add' ? 'New Task' : 'Edit Task'}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">
          {/* Title */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Title *</label>
            <input
              ref={titleRef}
              type="text"
              value={form.title}
              onChange={(e) => { set('title', e.target.value); if (titleError) setTitleError(false) }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="What needs to be done?"
              className={cn('w-full bg-white/5 border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors', titleError ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-primary/40')}
            />
          </div>

          {titleError && <p className="text-xs text-red-400 mt-1">Title is required</p>}

          {/* Priority */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Priority</label>
            <div className="flex gap-2">
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => set('priority', p)}
                  className={cn(
                    'flex-1 text-xs py-2 rounded-lg border font-medium transition-all duration-150',
                    form.priority === p
                      ? PRIORITY_BTN[p]
                      : 'border-white/10 text-muted-foreground bg-white/5 hover:bg-white/8'
                  )}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Due Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
                className={cn('w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors', theme === 'dark' ? '[color-scheme:dark]' : '[color-scheme:light]')}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {t}
                  <button onClick={() => removeTag(t)} className="hover:text-red-400 transition-colors ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={form.tagInput}
              onChange={(e) => set('tagInput', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              placeholder="Type tag + Enter"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any extra context…"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors resize-none"
            />
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Subtasks</label>
            {form.subtasks.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {form.subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => toggleSubtask(s.id)}
                      className={cn(
                        'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                        s.done ? 'border-primary bg-primary' : 'border-muted-foreground/40 hover:border-primary'
                      )}
                    >
                      {s.done && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                    <span className={cn('flex-1 text-xs', s.done ? 'line-through text-muted-foreground' : 'text-foreground')}>{s.text}</span>
                    <button
                      onClick={() => removeSubtask(s.id)}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="text"
              value={form.subtaskInput}
              onChange={(e) => set('subtaskInput', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }}
              placeholder="Add subtask + Enter"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 text-xs py-2 rounded-lg border border-white/10 text-muted-foreground hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 text-xs py-2 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors font-medium"
            >
              {mode === 'add' ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
          {mode === 'edit' && onDelete && (
            <button
              onClick={() => { onDelete(); onClose() }}
              className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Task
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ─── TaskRow ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
  onEdit,
}: {
  task: TodoItem
  onToggle: (id: string) => void
  onEdit: (task: TodoItem) => void
}) {
  const doneSubs = task.subtasks.filter((s) => s.done).length
  const totalSubs = task.subtasks.length
  const due = formatDue(task.dueDate)
  const isOverdue =
    !task.done &&
    task.dueDate &&
    task.dueDate < todayIso()

  return (
    <div
      className={cn(
        'glass rounded-xl flex items-start gap-3 p-3.5 border-l-2 hover:border-white/10 transition-all duration-200 group',
        PRIORITY_BORDER[task.priority],
        task.done && 'opacity-50'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          'mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
          task.done
            ? 'border-primary bg-primary'
            : 'border-muted-foreground hover:border-primary'
        )}
      >
        {task.done && <span className="text-white text-[8px] font-bold">✓</span>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <button
          onClick={() => onEdit(task)}
          className="text-left w-full"
        >
          <p
            className={cn(
              'text-sm font-medium leading-snug',
              task.done ? 'line-through text-muted-foreground' : 'text-foreground group-hover:text-primary transition-colors'
            )}
          >
            {task.title}
          </p>
        </button>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {due && (
            <span
              className={cn(
                'flex items-center gap-1 text-[11px]',
                isOverdue ? 'text-red-400' : 'text-muted-foreground'
              )}
            >
              <Calendar className="w-3 h-3" />
              {due}
            </span>
          )}
          {totalSubs > 0 && (
            <span className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">
              <ListChecks className="w-3 h-3" />
              {doneSubs}/{totalSubs}
            </span>
          )}
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground"
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Priority dot */}
      <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', PRIORITY_DOT[task.priority])} />
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({
  label,
  count,
  children,
}: {
  label: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Circle className="w-2 h-2 fill-primary text-primary" />
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

// ─── Main Todos page ─────────────────────────────────────────────────────────

export function Todos() {
  const [todos, setTodos] = useState<TodoItem[]>(loadTodos)
  const [filter, setFilter] = useState<FilterTab>('All')
  const [panelMode, setPanelMode] = useState<PanelMode | null>(null)
  const [editTarget, setEditTarget] = useState<TodoItem | undefined>(undefined)

  // Persist on every change
  useEffect(() => {
    saveTodos(todos)
  }, [todos])

  const today = todayIso()

  // ── CRUD ──
  const addTodo = (data: Omit<TodoItem, 'id' | 'createdAt' | 'completedAt'>) => {
    const item: TodoItem = {
      ...data,
      id: uid(),
      createdAt: new Date().toISOString(),
    }
    setTodos((prev) => [item, ...prev])
  }

  const updateTodo = (id: string, data: Omit<TodoItem, 'id' | 'createdAt' | 'completedAt'>) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, ...data }
          : t
      )
    )
  }

  const toggleDone = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const done = !t.done
        return {
          ...t,
          done,
          completedAt: done ? new Date().toISOString() : undefined,
        }
      })
    )
  }

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  // ── Filtering ──
  const pending = todos.filter((t) => !t.done)
  const overdueTasks = pending.filter((t) => t.dueDate && t.dueDate < today)
  const todayTasks = pending.filter(
    (t) =>
      t.dueDate === today ||
      (!t.dueDate && t.createdAt.startsWith(today))
  )
  const upcomingTasks = pending.filter((t) => t.dueDate && t.dueDate > today)
  const noDateTasks = pending.filter(
    (t) => !t.dueDate && !t.createdAt.startsWith(today)
  )
  const allCompletedTodos = todos.filter((t) => t.done)
  const completedTasks = allCompletedTodos
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, 50)

  const openAdd = () => {
    setEditTarget(undefined)
    setPanelMode('add')
  }

  const openEdit = (task: TodoItem) => {
    setEditTarget(task)
    setPanelMode('edit')
  }

  const closePanel = () => {
    setPanelMode(null)
    setEditTarget(undefined)
  }

  // ── Empty state messages ──
  const emptyMessages: Record<FilterTab, string> = {
    All: 'No tasks yet. Add your first task to get started.',
    Today: "No tasks today. Add one to get started.",
    Upcoming: 'No upcoming tasks. Plan ahead!',
    Completed: "Nothing completed yet. Go get something done!",
  }

  // ── Render list for current filter ──
  const renderList = () => {
    if (filter === 'Completed') {
      if (completedTasks.length === 0) {
        return <EmptyState message={emptyMessages.Completed} />
      }
      return (
        <div className="space-y-2">
          {completedTasks.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={toggleDone} onEdit={openEdit} />
          ))}
        </div>
      )
    }

    if (filter === 'Today') {
      return (
        <div className="space-y-3">
          {overdueTasks.length > 0 && (
            <button
              onClick={() => setFilter('All')}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/15 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left">
                {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} — tap to view
              </span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}
          {todayTasks.length === 0
            ? <EmptyState message={emptyMessages.Today} onAdd={openAdd} />
            : (
              <div className="space-y-2">
                {todayTasks.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={toggleDone} onEdit={openEdit} />
                ))}
              </div>
            )
          }
        </div>
      )
    }

    if (filter === 'Upcoming') {
      if (upcomingTasks.length === 0) return <EmptyState message={emptyMessages.Upcoming} onAdd={openAdd} />
      return (
        <div className="space-y-2">
          {upcomingTasks.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={toggleDone} onEdit={openEdit} />
          ))}
        </div>
      )
    }

    // All
    const hasAny = overdueTasks.length || todayTasks.length || upcomingTasks.length || noDateTasks.length
    if (!hasAny) return <EmptyState message={emptyMessages.All} onAdd={openAdd} />

    return (
      <div className="space-y-6">
        {overdueTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-sm font-semibold text-red-400">Overdue</span>
              <span className="text-xs text-red-400/60">({overdueTasks.length})</span>
            </div>
            <div className="space-y-2">
              {overdueTasks.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={toggleDone} onEdit={openEdit} />
              ))}
            </div>
          </div>
        )}
        {todayTasks.length > 0 && (
          <Section label="Today" count={todayTasks.length}>
            {todayTasks.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={toggleDone} onEdit={openEdit} />
            ))}
          </Section>
        )}
        {upcomingTasks.length > 0 && (
          <Section label="Upcoming" count={upcomingTasks.length}>
            {upcomingTasks.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={toggleDone} onEdit={openEdit} />
            ))}
          </Section>
        )}
        {noDateTasks.length > 0 && (
          <Section label="No Date" count={noDateTasks.length}>
            {noDateTasks.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={toggleDone} onEdit={openEdit} />
            ))}
          </Section>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Tasks</h2>
          <span className="text-xs text-muted-foreground ml-1">
            ({pending.length} pending)
          </span>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          New Task
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1">
        {(['All', 'Today', 'Upcoming', 'Completed'] as FilterTab[]).map((tab) => {
          const cnt =
            tab === 'All' ? pending.length
            : tab === 'Today' ? todayTasks.length
            : tab === 'Upcoming' ? upcomingTasks.length
            : allCompletedTodos.length
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'flex-1 text-xs py-1.5 rounded-lg font-medium transition-all duration-150',
                filter === tab
                  ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              {tab}
              {cnt > 0 && (
                <span className={cn('ml-1 opacity-70', filter === tab ? 'opacity-100' : '')}>
                  ({cnt})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Task list */}
      {renderList()}

      {/* Slide-over panel */}
      {panelMode && (
        <TaskPanel
          mode={panelMode}
          initial={editTarget}
          onSave={(data) => {
            if (panelMode === 'add') {
              addTodo(data)
            } else if (editTarget) {
              updateTodo(editTarget.id, data)
            }
          }}
          onDelete={editTarget ? () => deleteTodo(editTarget.id) : undefined}
          onClose={closePanel}
        />
      )}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ message, onAdd }: { message: string; onAdd?: () => void }) {
  return (
    <div className="glass rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <CheckSquare className="w-6 h-6 text-primary/60" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="text-xs px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 inline mr-1" />
          Add Task
        </button>
      )}
    </div>
  )
}
