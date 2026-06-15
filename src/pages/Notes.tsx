import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, Pin, Trash2, ArrowLeft, FileText, Tag, X, Eye, EyeOff, MessageSquarePlus, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type NoteColor = 'purple' | 'blue' | 'green' | 'amber' | 'red'

interface ThreadEntry {
  id: string
  text: string
  createdAt: string
}

interface Note {
  id: string
  title: string
  body: string
  tags: string[]
  pinned: boolean
  color?: NoteColor
  threads?: ThreadEntry[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'cortex-notes'

function loadNotes(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

function makeNote(): Note {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: '',
    body: '',
    tags: [],
    pinned: false,
    threads: [],
    createdAt: now,
    updatedAt: now,
  }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const COLOR_MAP: Record<NoteColor, { border: string; bg: string; dot: string }> = {
  purple: { border: 'border-l-violet-500',  bg: 'bg-violet-500/10', dot: 'bg-violet-400' },
  blue:   { border: 'border-l-blue-500',    bg: 'bg-blue-500/10',   dot: 'bg-blue-400' },
  green:  { border: 'border-l-emerald-500', bg: 'bg-emerald-500/10',dot: 'bg-emerald-400' },
  amber:  { border: 'border-l-amber-500',   bg: 'bg-amber-500/10',  dot: 'bg-amber-400' },
  red:    { border: 'border-l-red-500',     bg: 'bg-red-500/10',    dot: 'bg-red-400' },
}

const COLORS: NoteColor[] = ['purple', 'blue', 'green', 'amber', 'red']

function renderMarkdown(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = (s: string) =>
    escape(s)
      .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1 rounded text-xs font-mono text-primary">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
  let html = ''
  let inList = false
  for (const line of text.split('\n')) {
    if (/^[-*]\s/.test(line)) {
      if (!inList) { html += '<ul class="my-1 pl-4 space-y-0.5">'; inList = true }
      html += `<li class="list-disc text-sm text-foreground leading-relaxed">${inline(line.replace(/^[-*]\s/, ''))}</li>`
    } else {
      if (inList) { html += '</ul>'; inList = false }
      if (/^#{1,3}\s/.test(line))
        html += `<h3 class="text-base font-semibold text-foreground mt-3 mb-1">${inline(line.replace(/^#{1,3}\s/, ''))}</h3>`
      else if (line.trim() === '')
        html += '<br/>'
      else
        html += `<p class="text-sm text-foreground leading-relaxed">${inline(line)}</p>`
    }
  }
  if (inList) html += '</ul>'
  return html
}

// ─── NoteCard ──────────────────────────────────────────────────────────────────
function NoteCard({ note, onClick }: { note: Note; onClick: () => void }) {
  const colorMeta = note.color ? COLOR_MAP[note.color] : null
  const preview = note.body.replace(/[#*`]/g, '').replace(/\n+/g, ' ').trim().slice(0, 140)
  const threadCount = note.threads?.length ?? 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'glass rounded-2xl p-5 text-left transition-all duration-200 group space-y-3 w-full',
        'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 hover:border-primary/25',
        'border-l-4',
        colorMeta ? cn(colorMeta.border, colorMeta.bg) : 'border-l-transparent'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={cn(
          'text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1',
          !note.title && 'italic text-muted-foreground'
        )}>
          {note.title || 'Untitled'}
        </h3>
        {note.pinned && (
          <Pin className="w-3 h-3 text-primary shrink-0 mt-0.5" />
        )}
      </div>

      {preview && (
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{preview}</p>
      )}

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {t}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/10">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground/60">{formatDate(note.updatedAt)}</p>
        {threadCount > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
            <MessageSquarePlus className="w-3 h-3" />
            {threadCount}
          </div>
        )}
      </div>
    </button>
  )
}

// ─── NoteEditor ───────────────────────────────────────────────────────────────
function NoteEditor({
  note,
  onBack,
  onChange,
  onDelete,
}: {
  note: Note
  onBack: () => void
  onChange: (n: Note) => void
  onDelete: (id: string) => void
}) {
  const [local, setLocal] = useState<Note>(note)
  const [tagInput, setTagInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState(false)
  const [threadInput, setThreadInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setLocal(note) }, [note.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const push = useCallback((patch: Partial<Note>) => {
    const updated: Note = { ...local, ...patch, updatedAt: new Date().toISOString() }
    setLocal(updated)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 1200)
    }, 500)
  }, [local, onChange])

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (!t || local.tags.includes(t)) { setTagInput(''); return }
    push({ tags: [...local.tags, t] })
    setTagInput('')
  }

  const removeTag = (t: string) => push({ tags: local.tags.filter((x) => x !== t) })

  const addThread = () => {
    const text = threadInput.trim()
    if (!text) return
    const entry: ThreadEntry = {
      id: crypto.randomUUID(),
      text,
      createdAt: new Date().toISOString(),
    }
    push({ threads: [...(local.threads ?? []), entry] })
    setThreadInput('')
  }

  const deleteThread = (id: string) => {
    push({ threads: (local.threads ?? []).filter((e) => e.id !== id) })
  }

  const colorMeta = local.color ? COLOR_MAP[local.color] : null

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-emerald-400 transition-opacity">Saved</span>
          )}
          <button
            onClick={() => push({ pinned: !local.pinned })}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
              local.pinned
                ? 'bg-primary/15 text-primary border-primary/20'
                : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20'
            )}
          >
            <Pin className="w-3 h-3" />
            {local.pinned ? 'Pinned' : 'Pin'}
          </button>
          <button
            onClick={() => { onChange(local); onDelete(local.id) }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>

      {/* Editor card */}
      <div className={cn(
        'glass rounded-2xl p-6 space-y-4 border-l-4 transition-all',
        colorMeta ? cn(colorMeta.border, colorMeta.bg) : 'border-l-transparent'
      )}>
        <input
          type="text"
          value={local.title}
          onChange={(e) => push({ title: e.target.value })}
          placeholder="Title..."
          className="w-full bg-transparent text-2xl font-bold text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
        />

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap pb-3 border-b border-white/5">
          {/* Color picker */}
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => push({ color: local.color === c ? undefined : c })}
                className={cn(
                  'w-4 h-4 rounded-full transition-all',
                  COLOR_MAP[c].dot,
                  local.color === c
                    ? 'ring-2 ring-offset-1 ring-offset-transparent ring-white/60 scale-110'
                    : 'opacity-60 hover:opacity-100'
                )}
                title={c}
              />
            ))}
            {local.color && (
              <button
                onClick={() => push({ color: undefined })}
                className="text-[10px] text-muted-foreground hover:text-foreground ml-1 transition-colors"
              >
                clear
              </button>
            )}
          </div>

          <div className="w-px h-4 bg-white/10" />

          {/* Tag input */}
          <div className="flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="Add tag + Enter"
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none w-28"
            />
          </div>

          <div className="w-px h-4 bg-white/10" />

          {/* Preview toggle */}
          <button
            onClick={() => setPreview(!preview)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors',
              preview
                ? 'bg-primary/15 text-primary border-primary/20'
                : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20'
            )}
          >
            {preview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>

        {/* Tags */}
        {local.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {local.tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {t}
                <button onClick={() => removeTag(t)} className="hover:text-red-400 transition-colors">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Body — edit or preview */}
        {preview ? (
          <div
            className="min-h-72 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: local.body
                ? renderMarkdown(local.body)
                : '<p class="text-sm text-muted-foreground/35">Nothing to preview yet.</p>',
            }}
          />
        ) : (
          <textarea
            value={local.body}
            onChange={(e) => push({ body: e.target.value })}
            placeholder={`Write your note...\n\nSupports Markdown: **bold**, *italic*, # Heading, - list`}
            className="w-full min-h-72 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/35 focus:outline-none resize-none leading-relaxed"
          />
        )}
      </div>

      {/* Thread section */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thread</span>
          {(local.threads?.length ?? 0) > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-white/10 text-muted-foreground font-medium">
              {local.threads!.length}
            </span>
          )}
        </div>

        {/* Existing thread entries */}
        {(local.threads ?? []).length > 0 && (
          <div className="space-y-3">
            {(local.threads ?? []).map((entry) => (
              <div key={entry.id} className="flex gap-3 group">
                <div className="w-0.5 bg-primary/30 rounded-full shrink-0 self-stretch min-h-[2rem]" />
                <div className="flex-1 space-y-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">{entry.text}</p>
                  <p className="text-[10px] text-muted-foreground/50">{formatDate(entry.createdAt)}</p>
                </div>
                <button
                  onClick={() => deleteThread(entry.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all shrink-0 self-start mt-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {(local.threads ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground/40 italic">No thread replies yet. Add a follow-up below.</p>
        )}

        {/* New thread input */}
        <div className="flex gap-2 pt-2 border-t border-white/5">
          <textarea
            value={threadInput}
            onChange={(e) => setThreadInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                addThread()
              }
            }}
            placeholder="Add to thread… (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 resize-none"
          />
          <button
            onClick={addThread}
            disabled={!threadInput.trim()}
            className="p-2.5 rounded-xl bg-primary/15 border border-primary/20 text-primary hover:bg-primary/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed self-end"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground/50">
          Created {formatDate(local.createdAt)}
        </p>
        <p className="text-xs text-muted-foreground/50">
          Last edited {formatDate(local.updatedAt)}
        </p>
      </div>
    </div>
  )
}

// ─── Main Notes page ───────────────────────────────────────────────────────────
export function Notes() {
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  useEffect(() => { saveNotes(notes) }, [notes])

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).sort()

  const createNote = () => {
    const n = makeNote()
    setNotes((prev) => [n, ...prev])
    setActiveNote(n)
  }

  const updateNote = useCallback((updated: Note) => {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
    setActiveNote(updated)
  }, [])

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    setActiveNote(null)
  }, [])

  const filtered = notes
    .filter((n) => {
      if (activeTag && !n.tags.includes(activeTag)) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.tags.some((t) => t.includes(q))
        )
      }
      return true
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

  const pinned = filtered.filter((n) => n.pinned)
  const unpinned = filtered.filter((n) => !n.pinned)

  if (activeNote) {
    const current = notes.find((n) => n.id === activeNote.id) ?? activeNote
    return (
      <NoteEditor
        note={current}
        onBack={() => {
          const latest = notes.find((n) => n.id === activeNote.id) ?? activeNote
          if (!latest.title.trim() && !latest.body.trim() && (latest.threads?.length ?? 0) === 0) {
            setNotes((prev) => prev.filter((n) => n.id !== latest.id))
          }
          setActiveNote(null)
        }}
        onChange={updateNote}
        onDelete={deleteNote}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Notes</h1>
          <span className="text-xs text-muted-foreground ml-1">({notes.length})</span>
        </div>
        <button
          onClick={createNote}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      {/* Search + tag filters */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes, tags..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTag(activeTag === t ? null : t)}
                className={cn(
                  'text-xs px-2.5 py-0.5 rounded-full border transition-colors',
                  activeTag === t
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20'
                )}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="glass rounded-2xl p-16 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FileText className="w-8 h-8 text-primary/60" />
          </div>
          <div className="space-y-1">
            <p className="text-foreground font-semibold">
              {search || activeTag ? 'No notes match your filters.' : 'Start writing.'}
            </p>
            <p className="text-sm text-muted-foreground">
              {search || activeTag ? 'Try a different search or clear filters.' : 'Your notes live here.'}
            </p>
          </div>
          {!search && !activeTag && (
            <button
              onClick={createNote}
              className="mt-1 text-sm px-5 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors font-medium"
            >
              New Note
            </button>
          )}
        </div>
      )}

      {/* Pinned section */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Pin className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pinned</span>
          </div>
          <div style={{ columns: '280px', gap: '1rem' }}>
            {pinned.map((note) => (
              <div key={note.id} className="mb-4 break-inside-avoid">
                <NoteCard note={note} onClick={() => setActiveNote(note)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All notes */}
      {unpinned.length > 0 && (
        <div className="space-y-3">
          {pinned.length > 0 && (
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Notes</span>
          )}
          <div style={{ columns: '280px', gap: '1rem' }}>
            {unpinned.map((note) => (
              <div key={note.id} className="mb-4 break-inside-avoid">
                <NoteCard note={note} onClick={() => setActiveNote(note)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
