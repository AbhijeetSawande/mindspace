import { useState, useEffect, useRef } from 'react'
import {
  Plus, BookOpen, X, Sparkles, ArrowLeft, Trash2, Library, Star, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type BookStatus = 'to-read' | 'reading' | 'done'

type BookCategory =
  | 'Fiction'
  | 'Non-Fiction'
  | 'Self-Help'
  | 'Technical'
  | 'Biography'
  | 'Philosophy'
  | 'Business'
  | 'Science'
  | 'Other'

interface Book {
  id: string
  title: string
  author: string
  category: BookCategory
  status: BookStatus
  progress: number
  notes: string
  rating?: 1 | 2 | 3 | 4 | 5
  addedAt: string
  startedAt?: string
  finishedAt?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cortex-books'

const CATEGORIES: BookCategory[] = [
  'Fiction', 'Non-Fiction', 'Self-Help', 'Technical',
  'Biography', 'Philosophy', 'Business', 'Science', 'Other',
]

const statusConfig: Record<BookStatus, { label: string; classes: string }> = {
  'to-read': { label: 'To Read', classes: 'bg-white/5 text-muted-foreground border-white/10' },
  reading:   { label: 'Reading', classes: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  done:      { label: 'Done',    classes: 'bg-green-500/15 text-green-400 border-green-500/20' },
}

const categoryBadge: Record<BookCategory, string> = {
  Fiction:      'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'Non-Fiction':'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Self-Help':  'bg-green-500/15 text-green-400 border-green-500/20',
  Technical:    'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  Biography:    'bg-orange-500/15 text-orange-400 border-orange-500/20',
  Philosophy:   'bg-rose-500/15 text-rose-400 border-rose-500/20',
  Business:     'bg-amber-500/15 text-amber-400 border-amber-500/20',
  Science:      'bg-teal-500/15 text-teal-400 border-teal-500/20',
  Other:        'bg-gray-500/15 text-gray-400 border-gray-500/20',
}

// gradient pairs used as inline bg-gradient class strings
const categoryGradient: Record<BookCategory, string> = {
  Fiction:      'from-purple-800 to-purple-600',
  'Non-Fiction':'from-blue-800 to-blue-600',
  'Self-Help':  'from-green-800 to-green-600',
  Technical:    'from-cyan-800 to-cyan-600',
  Biography:    'from-orange-800 to-orange-600',
  Philosophy:   'from-rose-800 to-rose-600',
  Business:     'from-amber-800 to-amber-600',
  Science:      'from-teal-800 to-teal-600',
  Other:        'from-gray-700 to-gray-600',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadBooks(): Book[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function saveBooks(books: Book[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
}

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2)}` }

// ─── Star rating component ────────────────────────────────────────────────────

function StarRating({
  value, onChange, readonly = false,
}: {
  value?: number
  onChange?: (r: 1 | 2 | 3 | 4 | 5) => void
  readonly?: boolean
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={cn(
            'transition-colors',
            readonly ? 'cursor-default' : 'cursor-pointer',
          )}
        >
          <Star
            className={cn(
              'w-4 h-4',
              (hover || value || 0) >= n ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30',
            )}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  if (!msg) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 glass rounded-xl px-4 py-3 flex items-center gap-3 border border-primary/30 animate-in fade-in slide-in-from-bottom-2">
      <Sparkles className="w-4 h-4 text-primary shrink-0" />
      <p className="text-sm text-foreground max-w-xs">{msg}</p>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ─── Add Book form ────────────────────────────────────────────────────────────

interface AddFormState {
  title: string
  author: string
  category: BookCategory
  status: BookStatus
  notes: string
  rating?: 1 | 2 | 3 | 4 | 5
}

function initAddForm(): AddFormState {
  return { title: '', author: '', category: 'Fiction', status: 'to-read', notes: '', rating: undefined }
}

interface AddBookPanelProps {
  onClose: () => void
  onAdd: (book: Book) => void
}

function AddBookPanel({ onClose, onAdd }: AddBookPanelProps) {
  const [form, setForm] = useState<AddFormState>(initAddForm)

  const set = <K extends keyof AddFormState>(key: K, val: AddFormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const submit = () => {
    if (!form.title.trim() || !form.author.trim()) return
    const now = new Date().toISOString()
    const book: Book = {
      id: uid(),
      title: form.title.trim(),
      author: form.author.trim(),
      category: form.category,
      status: form.status,
      progress: form.status === 'done' ? 100 : 0,
      notes: form.notes.trim(),
      rating: form.status === 'done' ? form.rating : undefined,
      addedAt: now,
      startedAt: form.status !== 'to-read' ? now : undefined,
      finishedAt: form.status === 'done' ? now : undefined,
    }
    onAdd(book)
    onClose()
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4 border border-primary/20">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Add New Book</p>
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
          placeholder="Title *"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
        />
        <input
          type="text"
          value={form.author}
          onChange={(e) => set('author', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Author *"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={form.category}
          onChange={(e) => set('category', e.target.value as BookCategory)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/40 transition-colors appearance-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-background">{c}</option>
          ))}
        </select>

        <div className="flex gap-1 rounded-xl border border-white/10 overflow-hidden bg-white/5 p-1">
          {(['to-read', 'reading', 'done'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set('status', s)}
              className={cn(
                'flex-1 text-xs py-1.5 rounded-lg transition-colors font-medium',
                form.status === s
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
        placeholder="Notes (optional)..."
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors resize-none"
      />

      {form.status === 'done' && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Rating:</span>
          <StarRating value={form.rating} onChange={(r) => set('rating', r)} />
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!form.title.trim() || !form.author.trim()}
          className="px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add Book
        </button>
      </div>
    </div>
  )
}

// ─── Book cover ────────────────────────────────────────────────────────────────

function BookCover({ category }: { category: BookCategory }) {
  return (
    <div className={cn('w-full aspect-[2/3] rounded-xl bg-gradient-to-b flex items-end p-2', categoryGradient[category])}>
      <BookOpen className="w-5 h-5 text-white/40" />
    </div>
  )
}

// ─── Book card ────────────────────────────────────────────────────────────────

interface BookCardProps {
  book: Book
  onClick: () => void
  progressMode?: boolean
  onProgressUpdate?: (id: string, progress: number) => void
}

function BookCard({ book, onClick, progressMode, onProgressUpdate }: BookCardProps) {
  const [localProgress, setLocalProgress] = useState(book.progress)
  const [showSlider, setShowSlider] = useState(false)

  useEffect(() => { setLocalProgress(book.progress) }, [book.progress])

  const handleSave = () => {
    onProgressUpdate?.(book.id, localProgress)
    setShowSlider(false)
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3 hover:border-primary/30 transition-all duration-200 group">
      <button onClick={onClick} className="w-full text-left">
        <div className="flex gap-3">
          <div className="w-16 shrink-0">
            <BookCover category={book.category} />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
              {book.title}
            </h3>
            <p className="text-xs text-muted-foreground">{book.author}</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', categoryBadge[book.category])}>
                {book.category}
              </span>
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', statusConfig[book.status].classes)}>
                {statusConfig[book.status].label}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-1 group-hover:text-primary/50 transition-colors" />
        </div>
      </button>

      {book.status === 'reading' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Progress</span>
            <span className="text-[10px] text-primary font-medium">{book.progress}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded-full transition-all duration-300"
              style={{ width: `${book.progress}%` }}
            />
          </div>
        </div>
      )}

      {book.status === 'done' && book.rating && (
        <StarRating value={book.rating} readonly />
      )}

      {progressMode && book.status === 'reading' && (
        <div className="space-y-2 pt-1 border-t border-white/5">
          {showSlider ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={localProgress}
                  onChange={(e) => setLocalProgress(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-xs text-primary font-medium w-8 text-right">{localProgress}%</span>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowSlider(false); setLocalProgress(book.progress) }}
                  className="text-xs px-3 py-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="text-xs px-3 py-1 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowSlider(true)}
              className="w-full text-xs py-1.5 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
            >
              Update Progress
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Book detail overlay ───────────────────────────────────────────────────────

interface BookDetailProps {
  book: Book
  onChange: (b: Book) => void
  onDelete: (id: string) => void
  onBack: () => void
}

function BookDetail({ book, onChange, onDelete, onBack }: BookDetailProps) {
  const [localProgress, setLocalProgress] = useState(book.progress)
  const [localNotes, setLocalNotes] = useState(book.notes)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLocalProgress(book.progress)
    setLocalNotes(book.notes)
  }, [book.id, book.progress, book.notes])

  const update = (patch: Partial<Book>) => onChange({ ...book, ...patch })

  const saveProgress = (val: number) => {
    const clamped = Math.min(100, Math.max(0, val))
    setLocalProgress(clamped)
    update({ progress: clamped })
  }

  const handleNotesChange = (val: string) => {
    setLocalNotes(val)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => update({ notes: val }), 600)
  }

  const statusTransitions: { label: string; action: () => void; classes: string }[] = []
  if (book.status === 'to-read') {
    statusTransitions.push({
      label: 'Start Reading',
      action: () => update({ status: 'reading', progress: 0, startedAt: new Date().toISOString() }),
      classes: 'bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/25',
    })
  }
  if (book.status === 'reading') {
    statusTransitions.push({
      label: 'Mark as Done',
      action: () => update({ status: 'done', progress: 100, finishedAt: new Date().toISOString() }),
      classes: 'bg-green-500/15 text-green-400 border-green-500/20 hover:bg-green-500/25',
    })
  }
  if (book.status !== 'to-read') {
    statusTransitions.push({
      label: 'Move to To Read',
      action: () => update({ status: 'to-read', progress: 0, startedAt: undefined, finishedAt: undefined }),
      classes: 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20',
    })
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Library
      </button>

      <div className="glass rounded-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-5">
          <div className="w-24 shrink-0">
            <BookCover category={book.category} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <h2 className="text-xl font-bold text-foreground leading-tight">{book.title}</h2>
            <p className="text-sm text-muted-foreground">by {book.author}</p>
            <div className="flex flex-wrap gap-2">
              <span className={cn('text-xs px-2 py-0.5 rounded-full border', categoryBadge[book.category])}>
                {book.category}
              </span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full border', statusConfig[book.status].classes)}>
                {statusConfig[book.status].label}
              </span>
            </div>
            {book.addedAt && (
              <p className="text-[10px] text-muted-foreground/50">
                Added {new Date(book.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {book.finishedAt && ` · Finished ${new Date(book.finishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </p>
            )}
          </div>
          <button
            onClick={() => onDelete(book.id)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 transition-colors shrink-0"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>

        {/* Status actions */}
        <div className="flex gap-2 flex-wrap">
          {statusTransitions.map((t) => (
            <button
              key={t.label}
              onClick={t.action}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors text-sm', t.classes)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Progress slider */}
        {book.status === 'reading' && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Reading Progress</p>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all duration-300"
                  style={{ width: `${localProgress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-primary w-10 text-right">{localProgress}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={localProgress}
              onChange={(e) => setLocalProgress(Number(e.target.value))}
              onMouseUp={() => saveProgress(localProgress)}
              onTouchEnd={() => saveProgress(localProgress)}
              className="w-full accent-primary"
            />
          </div>
        )}

        {/* Rating */}
        {book.status === 'done' && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Your Rating</p>
            <StarRating
              value={book.rating}
              onChange={(r) => update({ rating: r })}
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Notes</p>
          <textarea
            value={localNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Your thoughts, highlights, key takeaways..."
            rows={5}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none transition-colors"
          />
          <p className="text-[10px] text-muted-foreground/40">Auto-saved as you type</p>
        </div>
      </div>
    </div>
  )
}

// ─── Continue Reading section ─────────────────────────────────────────────────

function ContinueReading({
  books, onSelect, onProgressUpdate,
}: {
  books: Book[]
  onSelect: (b: Book) => void
  onProgressUpdate: (id: string, progress: number) => void
}) {
  if (books.length === 0) return null
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5" /> Continue Reading
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onClick={() => onSelect(book)}
            progressMode
            onProgressUpdate={onProgressUpdate}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const EMPTY_MESSAGES: Record<'all' | BookStatus, string> = {
  all:      'Your library is empty. Add your first book.',
  'to-read':'Your reading list is empty. Add books you want to read.',
  reading:  "You're not reading anything right now.",
  done:     'No books finished yet.',
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Books() {
  const [books, setBooks] = useState<Book[]>(loadBooks)
  const [statusFilter, setStatusFilter] = useState<'all' | BookStatus>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selected, setSelected] = useState<Book | null>(null)
  const [toast, setToast] = useState('')

  // Persist on change
  useEffect(() => { saveBooks(books) }, [books])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const addBook = (book: Book) => setBooks((prev) => [book, ...prev])

  const updateBook = (updated: Book) => {
    setBooks((prev) => prev.map((b) => b.id === updated.id ? updated : b))
    setSelected(updated)
  }

  const updateProgress = (id: string, progress: number) => {
    setBooks((prev) => prev.map((b) => b.id === id ? { ...b, progress } : b))
  }

  const deleteBook = (id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id))
    setSelected(null)
  }

  const readingBooks = books.filter((b) => b.status === 'reading')
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())

  const filtered = books
    .filter((b) => statusFilter === 'all' || b.status === statusFilter)
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())

  const categoryCounts = books.reduce<Record<string, number>>((acc, b) => {
    acc[b.category] = (acc[b.category] ?? 0) + 1
    return acc
  }, {})

  // Show detail page
  if (selected) {
    return (
      <BookDetail
        book={selected}
        onChange={updateBook}
        onDelete={deleteBook}
        onBack={() => setSelected(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Toast msg={toast} onDismiss={() => setToast('')} />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Library className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Library</h1>
          <span className="text-xs text-muted-foreground ml-1">({books.length} books)</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() =>
              setToast('Add your Gemini API key in Settings to unlock AI book recommendations based on your library')
            }
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-muted-foreground border border-white/10 hover:border-primary/20 hover:text-primary transition-colors text-sm"
          >
            <Sparkles className="w-4 h-4" />
            AI Recommendations
          </button>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Book
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddBookPanel
          onClose={() => setShowAddForm(false)}
          onAdd={addBook}
        />
      )}

      {/* Category stats */}
      {books.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => categoryCounts[c]).map((c) => (
            <span key={c} className={cn('text-[10px] px-2.5 py-1 rounded-full border', categoryBadge[c])}>
              {c} · {categoryCounts[c]}
            </span>
          ))}
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'to-read', 'reading', 'done'] as const).map((s) => {
          const count = s === 'all' ? books.length : books.filter((b) => b.status === s).length
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5',
                statusFilter === s
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20',
              )}
            >
              {s === 'all' ? 'All' : statusConfig[s].label}
              <span className={cn('opacity-60', statusFilter === s && 'opacity-80')}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Continue reading section (shown under "All" and "Reading" tabs) */}
      {(statusFilter === 'all' || statusFilter === 'reading') && (
        <ContinueReading
          books={readingBooks}
          onSelect={setSelected}
          onProgressUpdate={updateProgress}
        />
      )}

      {/* Book grid */}
      {statusFilter === 'reading' && filtered.length > 0 ? null : (
        filtered.length === 0 ? (
          <div className="glass rounded-2xl p-16 flex flex-col items-center text-center gap-3">
            <BookOpen className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">{EMPTY_MESSAGES[statusFilter]}</p>
            {statusFilter === 'all' && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-2 text-xs px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
              >
                Add Book
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((book) => (
              <BookCard key={book.id} book={book} onClick={() => setSelected(book)} />
            ))}
          </div>
        )
      )}

      {/* When "Reading" tab and no books */}
      {statusFilter === 'reading' && readingBooks.length === 0 && (
        <div className="glass rounded-2xl p-16 flex flex-col items-center text-center gap-3">
          <BookOpen className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">{EMPTY_MESSAGES.reading}</p>
        </div>
      )}
    </div>
  )
}
