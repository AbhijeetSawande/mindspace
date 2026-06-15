import { useState } from 'react'
import { useApp } from '@/store/appStore'
import { cn } from '@/lib/utils'
import {
  Plus, X, ChevronRight, ChevronLeft, Trash2,
  FolderKanban, Circle, Clock, CheckCircle2, GitPullRequest,
  Edit2, LayoutGrid, BarChart3,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done'
type Priority = 'high' | 'medium' | 'low'

interface Task {
  id: string
  title: string
  priority: Priority
  status: TaskStatus
  projectId: string
  notes?: string
  dueDate?: string
  completedAt?: string
}

interface Project {
  id: string
  title: string
  description?: string
  color: string
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECTS_KEY = 'cortex-projects'
const TASKS_KEY = 'cortex-project-tasks'

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ReactNode; color: string }> = {
  'todo':        { label: 'Todo',        icon: <Circle className="w-3.5 h-3.5" />,         color: 'text-muted-foreground' },
  'in-progress': { label: 'In Progress', icon: <Clock className="w-3.5 h-3.5" />,           color: 'text-blue-400' },
  'review':      { label: 'Review',      icon: <GitPullRequest className="w-3.5 h-3.5" />,  color: 'text-yellow-400' },
  'done':        { label: 'Done',        icon: <CheckCircle2 className="w-3.5 h-3.5" />,    color: 'text-green-400' },
}

const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'review', 'done']

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-400', medium: 'bg-yellow-400', low: 'bg-green-400',
}
const PRIORITY_TEXT: Record<Priority, string> = {
  high: 'text-red-400', medium: 'text-yellow-400', low: 'text-green-400',
}

const PRESET_COLORS = ['#7c3aed', '#db2777', '#2563eb', '#059669', '#d97706', '#dc2626']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayISO(): string {
  return localIso(new Date())
}

function startOfWeek(): string {
  const d = new Date()
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return localIso(d)
}

function getWeekKey(isoDate: string): string {
  if (!isoDate) return '0000-00-00'
  const d = new Date(isoDate)
  const mon = new Date(d)
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return localIso(mon)
}

function getWeekLabel(weekStartISO: string): string {
  if (!weekStartISO || weekStartISO === '0000-00-00') return 'Undated'
  const mon = new Date(weekStartISO + 'T00:00:00')
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(mon)} – ${fmt(sun)}, ${sun.getFullYear()}`
}

function getMonthKey(isoDate: string): string {
  if (!isoDate) return '0000-00'
  const d = new Date(isoDate)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(monthKey: string): string {
  if (!monthKey || monthKey === '0000-00') return 'Undated'
  return new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function loadProjects(): Project[] {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]') as Project[] }
  catch { return [] }
}

function saveProjects(p: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(p))
}

function loadTasks(): Task[] {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]') as Task[] }
  catch { return [] }
}

function saveTasks(t: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(t))
}

// ─── NewProjectOverlay ────────────────────────────────────────────────────────

function NewProjectOverlay({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (p: Omit<Project, 'id' | 'createdAt'>) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])

  function handleCreate() {
    if (!title.trim()) return
    onCreate({ title: title.trim(), description: description.trim() || undefined, color })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl p-6 w-full max-w-md space-y-4 border border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">New Project</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Project name"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none"
        />
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Color</p>
          <div className="flex gap-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn('w-7 h-7 rounded-lg border-2 transition-all', color === c ? 'border-white scale-110' : 'border-transparent')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── EditProjectOverlay ───────────────────────────────────────────────────────

function EditProjectOverlay({
  project,
  onClose,
  onUpdate,
  onDelete,
}: {
  project: Project
  onClose: () => void
  onUpdate: (p: Project) => void
  onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description ?? '')
  const [color, setColor] = useState(project.color)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleSave() {
    if (!title.trim()) return
    onUpdate({ ...project, title: title.trim(), description: description.trim() || undefined, color })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl p-6 w-full max-w-md space-y-4 border border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Edit Project</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Project name"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none"
        />
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Color</p>
          <div className="flex gap-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn('w-7 h-7 rounded-lg border-2 transition-all', color === c ? 'border-white scale-110' : 'border-transparent')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {confirmDelete ? (
          <div className="space-y-2">
            <p className="text-xs text-red-400 text-center">Delete project and all its tasks? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { onDelete(project.id); onClose() }}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2.5 rounded-xl glass border border-red-400/20 text-red-400 hover:bg-red-400/10 transition-colors"
              title="Delete project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex-1 py-2.5 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-40"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TaskDetailOverlay ────────────────────────────────────────────────────────

function TaskDetailOverlay({
  task, project, onClose, onUpdate, onDelete,
}: {
  task: Task; project?: Project
  onClose: () => void
  onUpdate: (updated: Task) => void
  onDelete: (id: string) => void
}) {
  const { theme } = useApp()
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [status, setStatus] = useState<TaskStatus>(task.status)

  function handleSave() {
    onUpdate({ ...task, title: title.trim() || task.title, notes: notes.trim() || undefined, dueDate: dueDate || undefined, priority, status })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl p-6 w-full max-w-md space-y-4 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {project && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />}
            <h2 className="text-sm font-bold text-foreground">Task Details</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Task title"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
        />
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40">
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Due Date (optional)</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={cn('w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40', theme === 'dark' ? '[color-scheme:dark]' : '[color-scheme:light]')} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => { onDelete(task.id); onClose() }} className="p-2.5 rounded-xl glass border border-red-400/20 text-red-400 hover:bg-red-400/10 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 transition-colors">Save</button>
        </div>
      </div>
    </div>
  )
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({
  task, project, showProject, onMove, onEdit,
}: {
  task: Task; project?: Project; showProject: boolean
  onMove: (task: Task, dir: 'left' | 'right') => void
  onEdit: (task: Task) => void
}) {
  const statusIdx = STATUSES.indexOf(task.status)
  const canLeft = statusIdx > 0
  const canRight = statusIdx < STATUSES.length - 1
  const isOverdue = task.dueDate && task.dueDate < todayISO() && task.status !== 'done'

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="glass rounded-xl p-3 space-y-2 border border-transparent hover:border-primary/20 transition-all cursor-grab active:cursor-grabbing group"
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start gap-2">
        <span className={cn('w-2 h-2 rounded-full shrink-0 mt-1', PRIORITY_COLORS[task.priority])} />
        <p className="text-xs font-medium text-foreground leading-snug flex-1 min-w-0">{task.title}</p>
      </div>

      {showProject && project && (
        <div className="flex items-center gap-1 pl-4">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
          <span className="text-[10px] text-muted-foreground truncate">{project.title}</span>
        </div>
      )}

      <div className="flex items-center justify-between pl-4">
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className={cn('text-[10px]', isOverdue ? 'text-red-400' : 'text-muted-foreground')}>
              {isOverdue ? 'Overdue ' : ''}{task.dueDate}
            </span>
          )}
          <span className={cn('text-[10px] font-medium', PRIORITY_TEXT[task.priority])}>{task.priority}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          {canLeft && (
            <button onClick={() => onMove(task, 'left')} className="p-1 rounded-lg glass border border-white/10 text-muted-foreground hover:text-foreground transition-colors" title={`Move to ${STATUS_CONFIG[STATUSES[statusIdx - 1]].label}`}>
              <ChevronLeft className="w-3 h-3" />
            </button>
          )}
          {canRight && (
            <button onClick={() => onMove(task, 'right')} className="p-1 rounded-lg glass border border-white/10 text-muted-foreground hover:text-foreground transition-colors" title={`Move to ${STATUS_CONFIG[STATUSES[statusIdx + 1]].label}`}>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

function KanbanColumn({
  status, tasks, projects, projectId, showProject,
  onMove, onEdit, onAddTask, onDropTask,
}: {
  status: TaskStatus; tasks: Task[]; projects: Project[]
  projectId: string | null; showProject: boolean
  onMove: (task: Task, dir: 'left' | 'right') => void
  onEdit: (task: Task) => void
  onAddTask: (title: string, status: TaskStatus) => void
  onDropTask: (taskId: string, newStatus: TaskStatus) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const config = STATUS_CONFIG[status]

  function commitAdd() {
    if (newTitle.trim()) onAddTask(newTitle.trim(), status)
    setNewTitle('')
    setAdding(false)
  }

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))

  return (
    <div
      className={cn(
        'flex flex-col min-h-[400px] glass rounded-2xl p-3 border transition-all',
        dragOver ? 'border-primary/40 ring-1 ring-primary/20 bg-primary/5' : 'border-white/5'
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        const taskId = e.dataTransfer.getData('taskId')
        if (taskId) onDropTask(taskId, status)
        setDragOver(false)
      }}
    >
      <div className={cn('flex items-center gap-2 mb-3 pb-3 border-b border-white/5', config.color)}>
        {config.icon}
        <span className="text-xs font-semibold flex-1">{config.label}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-white/10 text-muted-foreground font-medium">{tasks.length}</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-hide">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            project={projectMap[task.projectId]}
            showProject={showProject}
            onMove={onMove}
            onEdit={onEdit}
          />
        ))}
        {dragOver && tasks.length === 0 && (
          <div className="h-16 rounded-xl border-2 border-dashed border-primary/30 flex items-center justify-center">
            <span className="text-xs text-primary/50">Drop here</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-white/5">
        {adding ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitAdd()
                if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
              }}
              placeholder="Task title..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
            />
            <div className="flex gap-1.5">
              <button onClick={commitAdd} className="flex-1 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/30 transition-colors">Add</button>
              <button onClick={() => { setAdding(false); setNewTitle('') }} className="px-2 py-1.5 rounded-lg glass border border-white/10 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { if (!projectId && projects.length === 0) return; setAdding(true) }}
            disabled={!projectId && projects.length === 0}
            className="w-full flex items-center gap-2 py-1.5 px-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" /> Add task
          </button>
        )}
      </div>
    </div>
  )
}

// ─── SummarySheet ─────────────────────────────────────────────────────────────

function SummarySheet({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))
  const completed = tasks.filter(t => t.status === 'done')

  const byMonth = new Map<string, number>()
  completed.forEach(t => {
    const key = getMonthKey(t.completedAt ?? t.dueDate ?? '')
    if (key === '0000-00') return
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1)
  })
  const monthEntries = Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6)
  const maxMonth = Math.max(...monthEntries.map(e => e[1]), 1)

  const byWeek = new Map<string, Task[]>()
  completed.forEach(t => {
    const key = getWeekKey(t.completedAt ?? t.dueDate ?? '')
    if (!byWeek.has(key)) byWeek.set(key, [])
    byWeek.get(key)!.push(t)
  })
  const undated = completed.filter(t => !t.completedAt && !t.dueDate)
  const weekEntries = Array.from(byWeek.entries())
    .filter(([k]) => k !== '0000-00-00')
    .sort((a, b) => b[0].localeCompare(a[0]))

  if (completed.length === 0) {
    return (
      <div className="glass rounded-2xl p-16 text-center space-y-3">
        <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mx-auto" />
        <p className="text-sm font-semibold text-foreground">No completed tasks yet.</p>
        <p className="text-xs text-muted-foreground">Move tasks to "Done" to see them here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Monthly overview bars */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Monthly Overview</h3>
          <span className="text-xs text-muted-foreground">{completed.length} total completed</span>
        </div>
        <div className="space-y-2.5">
          {monthEntries.map(([key, count]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-24 shrink-0">{getMonthLabel(key)}</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all"
                  style={{ width: `${(count / maxMonth) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly breakdown */}
      {weekEntries.map(([weekKey, weekTasks]) => (
        <div key={weekKey} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Week of {getWeekLabel(weekKey)}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              {weekTasks.length} done
            </span>
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Task</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium hidden sm:table-cell">Project</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Priority</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium hidden sm:table-cell">Completed</th>
                </tr>
              </thead>
              <tbody>
                {weekTasks.map(task => {
                  const proj = projectMap[task.projectId]
                  const completedDate = task.completedAt
                    ? new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : task.dueDate ?? '—'
                  return (
                    <tr key={task.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-2.5 text-foreground font-medium max-w-[200px] truncate">{task.title}</td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        {proj ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                            <span className="text-muted-foreground">{proj.title}</span>
                          </span>
                        ) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('font-medium', PRIORITY_TEXT[task.priority])}>{task.priority}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground hidden sm:table-cell">{completedDate}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {undated.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Undated</span>
          <div className="glass rounded-2xl p-3 space-y-1">
            {undated.map(task => {
              const proj = projectMap[task.projectId]
              return (
                <div key={task.id} className="flex items-center gap-2 px-2 py-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span className="text-xs text-foreground flex-1 min-w-0 truncate">{task.title}</span>
                  {proj && <span className="text-[10px] text-muted-foreground">{proj.title}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Projects() {
  const [projects, setProjects] = useState<Project[]>(loadProjects)
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [view, setView] = useState<'board' | 'summary'>('board')

  function persistProjects(updated: Project[]) {
    setProjects(updated); saveProjects(updated)
  }

  function persistTasks(updated: Task[]) {
    setTasks(updated); saveTasks(updated)
  }

  function createProject(p: Omit<Project, 'id' | 'createdAt'>) {
    const np: Project = { ...p, id: uid(), createdAt: new Date().toISOString() }
    persistProjects([...projects, np])
    setSelectedProjectId(np.id)
  }

  function updateProject(updated: Project) {
    persistProjects(projects.map(p => p.id === updated.id ? updated : p))
    setEditingProject(null)
  }

  function deleteProject(id: string) {
    persistProjects(projects.filter(p => p.id !== id))
    persistTasks(tasks.filter(t => t.projectId !== id))
    if (selectedProjectId === id) setSelectedProjectId(null)
  }

  function addTask(title: string, status: TaskStatus) {
    const projectId = selectedProjectId ?? (projects[0]?.id ?? '')
    if (!projectId) return
    persistTasks([...tasks, { id: uid(), title, priority: 'medium', status, projectId }])
  }

  function updateTask(updated: Task) {
    const old = tasks.find(t => t.id === updated.id)
    const final: Task = {
      ...updated,
      completedAt:
        updated.status === 'done' && old?.status !== 'done'
          ? new Date().toISOString()
          : updated.status !== 'done'
          ? undefined
          : updated.completedAt,
    }
    persistTasks(tasks.map(t => t.id === final.id ? final : t))
  }

  function deleteTask(id: string) {
    persistTasks(tasks.filter(t => t.id !== id))
  }

  function moveTask(task: Task, dir: 'left' | 'right') {
    const idx = STATUSES.indexOf(task.status)
    const newStatus = dir === 'right' ? STATUSES[idx + 1] : STATUSES[idx - 1]
    if (!newStatus) return
    updateTask({ ...task, status: newStatus })
  }

  function dropTask(taskId: string, newStatus: TaskStatus) {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return
    updateTask({ ...task, status: newStatus })
  }

  const visibleTasks = selectedProjectId
    ? tasks.filter(t => t.projectId === selectedProjectId)
    : tasks

  const showProject = selectedProjectId === null
  const weekStart = startOfWeek()
  const totalTasks = visibleTasks.length
  const inProgress = visibleTasks.filter(t => t.status === 'in-progress').length
  const doneThisWeek = visibleTasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= weekStart).length
  const blocked = visibleTasks.filter(t => t.priority === 'high' && t.status === 'todo').length
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {showNewProject && (
        <NewProjectOverlay onClose={() => setShowNewProject(false)} onCreate={createProject} />
      )}
      {editingTask && (
        <TaskDetailOverlay
          task={editingTask}
          project={projectMap[editingTask.projectId]}
          onClose={() => setEditingTask(null)}
          onUpdate={updated => { updateTask(updated); setEditingTask(null) }}
          onDelete={id => { deleteTask(id); setEditingTask(null) }}
        />
      )}
      {editingProject && (
        <EditProjectOverlay
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onUpdate={updateProject}
          onDelete={deleteProject}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Work</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kanban board for your projects</p>
        </div>
        <button
          onClick={() => setShowNewProject(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="glass rounded-2xl p-16 text-center space-y-4">
          <FolderKanban className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-foreground">Create your first project to get started.</p>
            <p className="text-xs text-muted-foreground mt-1">Organize tasks on a beautiful Kanban board.</p>
          </div>
          <button
            onClick={() => setShowNewProject(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Project
          </button>
        </div>
      )}

      {projects.length > 0 && (
        <>
          {/* Project selector */}
          <div className="glass rounded-2xl p-3 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedProjectId(null)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                selectedProjectId === null
                  ? 'bg-primary/20 border-primary/30 text-primary'
                  : 'border-white/10 text-muted-foreground hover:text-foreground glass'
              )}
            >
              All Projects
            </button>
            {projects.map(p => (
              <div key={p.id} className="flex items-center">
                <button
                  onClick={() => setSelectedProjectId(selectedProjectId === p.id ? null : p.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-l-xl text-xs font-medium border-y border-l transition-all',
                    selectedProjectId === p.id
                      ? 'bg-primary/20 border-primary/30 text-foreground'
                      : 'border-white/10 text-muted-foreground hover:text-foreground glass'
                  )}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  {p.title}
                </button>
                <button
                  onClick={() => setEditingProject(p)}
                  className={cn(
                    'p-1.5 rounded-r-xl border transition-all text-muted-foreground hover:text-foreground',
                    selectedProjectId === p.id
                      ? 'bg-primary/20 border-primary/30 hover:bg-primary/30'
                      : 'border-white/10 glass hover:bg-white/5'
                  )}
                  title="Edit project"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Tasks',    value: totalTasks,    color: 'text-foreground', icon: <Circle className="w-3.5 h-3.5 text-muted-foreground" /> },
              { label: 'In Progress',    value: inProgress,    color: 'text-blue-400',   icon: <Clock className="w-3.5 h-3.5 text-blue-400" /> },
              { label: 'Done This Week', value: doneThisWeek,  color: 'text-green-400',  icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> },
              { label: 'Blocked (High)', value: blocked,       color: 'text-red-400',    icon: <GitPullRequest className="w-3.5 h-3.5 text-red-400" /> },
            ].map(stat => (
              <div key={stat.label} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                {stat.icon}
                <div>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setView('board')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                view === 'board' ? 'bg-primary/20 border-primary/30 text-primary' : 'border-white/10 text-muted-foreground hover:text-foreground glass'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
            <button
              onClick={() => setView('summary')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                view === 'summary' ? 'bg-primary/20 border-primary/30 text-primary' : 'border-white/10 text-muted-foreground hover:text-foreground glass'
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Summary
            </button>
          </div>

          {/* Board view */}
          {view === 'board' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STATUSES.map(status => (
                <KanbanColumn
                  key={status}
                  status={status}
                  tasks={visibleTasks.filter(t => t.status === status)}
                  projects={projects}
                  projectId={selectedProjectId}
                  showProject={showProject}
                  onMove={moveTask}
                  onEdit={setEditingTask}
                  onAddTask={addTask}
                  onDropTask={dropTask}
                />
              ))}
            </div>
          )}

          {/* Summary view */}
          {view === 'summary' && (
            <SummarySheet tasks={visibleTasks} projects={projects} />
          )}
        </>
      )}
    </div>
  )
}
