import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Sun, Target, CheckCircle2, Moon } from 'lucide-react'

interface DayTask {
  id: string
  text: string
  done: boolean
}

interface DayData {
  intentions: string[]
  focusStatement: string
  reflection: string
  tasks: DayTask[]
}

type AllDayData = Record<string, DayData>

function toISO(d: Date) {
  return d.toISOString().split('T')[0]
}

function todayISO() {
  return toISO(new Date())
}

const EMPTY_DAY: DayData = {
  intentions: ['', '', ''],
  focusStatement: '',
  reflection: '',
  tasks: [],
}

function load(): AllDayData {
  try {
    return JSON.parse(localStorage.getItem('cortex-myday') || '{}')
  } catch {
    return {}
  }
}

function persist(data: AllDayData) {
  localStorage.setItem('cortex-myday', JSON.stringify(data))
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function isAfter6pm(): boolean {
  return new Date().getHours() >= 18
}

export function MyDay() {
  const [allData, setAllData] = useState<AllDayData>(load)
  const [taskInput, setTaskInput] = useState('')
  const [showReflection] = useState(isAfter6pm)

  const iso = todayISO()
  const day: DayData = allData[iso] || EMPTY_DAY

  function updateDay(patch: Partial<DayData>) {
    const updated: AllDayData = {
      ...allData,
      [iso]: { ...day, ...patch },
    }
    setAllData(updated)
    persist(updated)
  }

  function setIntention(idx: number, val: string) {
    const intentions = [...day.intentions]
    intentions[idx] = val
    updateDay({ intentions })
  }

  function addTask() {
    if (!taskInput.trim()) return
    const task: DayTask = { id: Date.now().toString(), text: taskInput.trim(), done: false }
    updateDay({ tasks: [...day.tasks, task] })
    setTaskInput('')
  }

  function toggleTask(id: string) {
    updateDay({ tasks: day.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })
  }

  function deleteTask(id: string) {
    updateDay({ tasks: day.tasks.filter((t) => t.id !== id) })
  }

  // Auto-save on blur via controlled input — no debounce needed
  useEffect(() => {}, [])

  const doneTasks = day.tasks.filter((t) => t.done).length
  const totalTasks = day.tasks.length

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Greeting */}
      <div className="glass rounded-2xl p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
          <Sun className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{getGreeting()}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatToday()}</p>
        </div>
        {totalTasks > 0 && (
          <div className="ml-auto text-right">
            <div className="text-lg font-bold text-primary">{doneTasks}/{totalTasks}</div>
            <div className="text-xs text-muted-foreground">tasks done</div>
          </div>
        )}
      </div>

      {/* Top 3 Intentions */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Today's Intentions</h2>
          <span className="text-xs text-muted-foreground">— Top 3 priorities</span>
        </div>
        <div className="space-y-2.5">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 text-[10px] font-bold text-primary flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <input
                type="text"
                value={day.intentions[idx] || ''}
                onChange={(e) => setIntention(idx, e.target.value)}
                placeholder={`Priority ${idx + 1}...`}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Today's Focus */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Today's Focus</h2>
        </div>
        <textarea
          value={day.focusStatement}
          onChange={(e) => updateDay({ focusStatement: e.target.value })}
          placeholder="What's the one thing that would make today a success?"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none min-h-[80px] transition-colors"
        />
      </div>

      {/* Today's Tasks */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          Today's Tasks
          {totalTasks > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              ({doneTasks} of {totalTasks} done)
            </span>
          )}
        </h2>

        {/* Add task */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add a task..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
          />
          <button
            onClick={addTask}
            className="p-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {day.tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No tasks yet. Add your first task above.</p>
        ) : (
          <div className="space-y-2">
            {/* Pending tasks */}
            {day.tasks.filter((t) => !t.done).map((task) => (
              <div key={task.id} className="flex items-center gap-3 group">
                <button
                  onClick={() => toggleTask(task.id)}
                  className="w-5 h-5 rounded-full border-2 border-muted-foreground hover:border-primary flex items-center justify-center shrink-0 transition-colors"
                />
                <span className="flex-1 text-sm text-foreground">{task.text}</span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Done tasks */}
            {day.tasks.filter((t) => t.done).map((task) => (
              <div key={task.id} className="flex items-center gap-3 group opacity-50">
                <button
                  onClick={() => toggleTask(task.id)}
                  className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center shrink-0"
                >
                  <span className="text-white text-[8px] font-bold">✓</span>
                </button>
                <span className="flex-1 text-sm text-muted-foreground line-through">{task.text}</span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* End of Day Reflection — visible after 6pm */}
      {showReflection && (
        <div className="glass rounded-2xl p-5 space-y-3 border border-primary/10">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">End of Day Reflection</h2>
          </div>
          <textarea
            value={day.reflection}
            onChange={(e) => updateDay({ reflection: e.target.value })}
            placeholder={`What did I accomplish?\nWhat will I do differently tomorrow?`}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none min-h-[100px] transition-colors"
          />
        </div>
      )}

      {!showReflection && (
        <p className="text-xs text-muted-foreground text-center">
          End of Day Reflection will appear after 6:00 PM
        </p>
      )}
    </div>
  )
}
