import { useState, useEffect, useRef } from 'react'
import { BookOpen, Plus, Check, X, ChevronLeft, ChevronRight, Shuffle, GraduationCap, Loader2, Trash2, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WordEntry {
  id: string
  word: string
  phonetic: string
  pos: string
  definition: string
  example: string
  synonyms: string[]
  learned: boolean
  addedAt: string
}

const WORDS_KEY = 'cortex-vocab-words'
const IDX_KEY   = 'cortex-vocab-idx'

function loadWords(): WordEntry[] {
  try { return JSON.parse(localStorage.getItem(WORDS_KEY) || '[]') } catch { return [] }
}
function saveWords(w: WordEntry[]) { localStorage.setItem(WORDS_KEY, JSON.stringify(w)) }
function loadIdx(): number {
  try { return parseInt(localStorage.getItem(IDX_KEY) || '0', 10) } catch { return 0 }
}
function saveIdx(i: number) { localStorage.setItem(IDX_KEY, String(i)) }

// Minimal stopwords for fuzzy quiz matching
const STOPWORDS = new Set(['a','an','the','in','on','at','of','to','for','is','are','was','were','be','been','that','this','it','its'])

function fuzzyMatch(answer: string, definition: string): boolean {
  const clean = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w))
  const ansWords = clean(answer)
  const defWords = new Set(clean(definition))
  const hits = ansWords.filter((w) => defWords.has(w))
  return hits.length >= 3 || (ansWords.length > 0 && hits.length >= Math.ceil(ansWords.length * 0.5))
}

interface DictEntry {
  word: string
  phonetics: { text?: string }[]
  meanings: { partOfSpeech: string; synonyms: string[]; definitions: { definition: string; example?: string; synonyms?: string[] }[] }[]
}

async function fetchWord(word: string): Promise<Omit<WordEntry, 'id' | 'learned' | 'addedAt'>> {
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim())}`)
  if (!res.ok) throw new Error('not found')
  const data: DictEntry[] = await res.json()
  const entry = data[0]
  const meaning = entry.meanings[0]
  const def = meaning?.definitions[0]
  const allSynonyms = [
    ...(meaning?.synonyms ?? []),
    ...(def?.synonyms ?? []),
  ].slice(0, 3)
  return {
    word: entry.word,
    phonetic: entry.phonetics.find((p) => p.text)?.text ?? '',
    pos: meaning?.partOfSpeech ?? '',
    definition: def?.definition ?? '',
    example: def?.example ?? '',
    synonyms: allSynonyms,
  }
}

function dayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000)
}

type CollectionFilter = 'all' | 'learning' | 'learned'

// ─── WordExplorer ─────────────────────────────────────────────────────────────
function WordExplorer({
  words,
  idx,
  onSetIdx,
  onToggleLearned,
}: {
  words: WordEntry[]
  idx: number
  onSetIdx: (i: number) => void
  onToggleLearned: (id: string) => void
}) {
  const word = words[idx]
  if (!word) return null

  const prev = () => onSetIdx(idx > 0 ? idx - 1 : words.length - 1)
  const next = () => onSetIdx(idx < words.length - 1 ? idx + 1 : 0)
  const shuffle = () => {
    let r = Math.floor(Math.random() * words.length)
    while (r === idx && words.length > 1) r = Math.floor(Math.random() * words.length)
    onSetIdx(r)
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      {/* Word + phonetic + pos */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-3xl font-bold text-foreground capitalize">{word.word}</h2>
            {word.phonetic && (
              <span className="text-base text-muted-foreground">{word.phonetic}</span>
            )}
          </div>
          {word.pos && (
            <span className="mt-2 inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 capitalize">
              {word.pos}
            </span>
          )}
        </div>
        <button
          onClick={() => onToggleLearned(word.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all shrink-0',
            word.learned
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25'
              : 'bg-white/5 text-muted-foreground border-white/10 hover:border-emerald-500/30 hover:text-emerald-400'
          )}
        >
          {word.learned ? <Star className="w-4 h-4 fill-current" /> : <Star className="w-4 h-4" />}
          {word.learned ? 'Learned' : 'Mark Learned'}
        </button>
      </div>

      {/* Definition */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">Definition</p>
        <p className="text-sm text-foreground leading-relaxed">{word.definition}</p>
      </div>

      {/* Example */}
      {word.example && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">Example</p>
          <p className="text-sm text-muted-foreground italic leading-relaxed">"{word.example}"</p>
        </div>
      )}

      {/* Synonyms */}
      {word.synonyms.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">Synonyms</p>
          <div className="flex flex-wrap gap-2">
            {word.synonyms.map((s) => (
              <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 capitalize">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <button
          onClick={prev}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {idx + 1} of {words.length}
          </span>
          <button
            onClick={shuffle}
            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Shuffle"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={next}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── DailyWord ────────────────────────────────────────────────────────────────
function DailyWord({
  words,
  bankIds,
  onAddToBank,
}: {
  words: WordEntry[]
  bankIds: Set<string>
  onAddToBank: (w: WordEntry) => void
}) {
  if (words.length === 0) return null

  const idx = dayOfYear() % words.length
  const word = words[idx]
  const alreadyIn = bankIds.has(word.id)

  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base">🌟</span>
        <p className="text-xs font-semibold text-primary uppercase tracking-widest">Daily Word</p>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-foreground capitalize">{word.word}</span>
          {word.phonetic && <span className="text-sm text-muted-foreground">{word.phonetic}</span>}
        </div>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">{word.definition}</p>
      </div>
      {!alreadyIn && (
        <button
          onClick={() => onAddToBank(word)}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
        >
          + Add to Bank
        </button>
      )}
      {alreadyIn && (
        <span className="text-[11px] text-emerald-400 flex items-center gap-1">
          <Check className="w-3 h-3" /> In your bank
        </span>
      )}
    </div>
  )
}

// ─── QuizMode ─────────────────────────────────────────────────────────────────
function QuizMode({
  words,
  onMarkLearned,
  onClose,
}: {
  words: WordEntry[]
  onMarkLearned: (id: string) => void
  onClose: () => void
}) {
  const quizWords = words.filter((w) => !w.learned)
  const [qi, setQi] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const current = quizWords[qi]

  useEffect(() => {
    if (!result) textareaRef.current?.focus()
  }, [qi, result])

  const check = () => {
    if (!current || !answer.trim()) return
    const ok = fuzzyMatch(answer, current.definition)
    setResult(ok ? 'correct' : 'wrong')
    if (ok) onMarkLearned(current.id)
  }

  const nextQ = () => {
    const next = qi + 1
    if (next >= quizWords.length) {
      onClose()
    } else {
      setQi(next)
      setAnswer('')
      setResult(null)
    }
  }

  if (quizWords.length === 0) {
    return (
      <div className="glass rounded-2xl p-14 flex flex-col items-center text-center gap-4">
        <GraduationCap className="w-10 h-10 text-emerald-400" />
        <p className="text-foreground font-semibold">All words learned!</p>
        <button onClick={onClose} className="text-xs px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors">
          Back to Words
        </button>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="glass rounded-2xl p-14 flex flex-col items-center text-center gap-4">
        <GraduationCap className="w-10 h-10 text-emerald-400" />
        <p className="text-foreground font-semibold">Quiz complete!</p>
        <button onClick={onClose} className="text-xs px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors">
          Back to Words
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
          Exit Quiz
        </button>
        <span className="text-xs text-muted-foreground">{qi + 1} / {quizWords.length}</span>
      </div>

      <div className="glass rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">What does this word mean?</p>
          <h2 className="text-4xl font-bold text-foreground capitalize">{current.word}</h2>
          {current.phonetic && <p className="text-sm text-muted-foreground">{current.phonetic}</p>}
          {current.pos && (
            <span className="inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 capitalize">
              {current.pos}
            </span>
          )}
        </div>

        <div className="space-y-3">
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !result) { e.preventDefault(); check() } }}
            placeholder="Type the definition..."
            disabled={result !== null}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none h-24 transition-colors disabled:opacity-70"
          />

          {result && (
            <div className={cn(
              'rounded-xl px-4 py-3 space-y-2',
              result === 'correct' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
            )}>
              <div className="flex items-center gap-2">
                {result === 'correct'
                  ? <Check className="w-4 h-4 text-emerald-400" />
                  : <X className="w-4 h-4 text-red-400" />}
                <span className={cn('text-sm font-medium', result === 'correct' ? 'text-emerald-400' : 'text-red-400')}>
                  {result === 'correct' ? 'Correct! Marked as learned.' : 'Not quite — see the definition below.'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">Definition: </span>
                {current.definition}
              </p>
              {current.example && (
                <p className="text-xs text-muted-foreground italic">"{current.example}"</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          {!result ? (
            <button
              onClick={check}
              disabled={!answer.trim()}
              className="px-6 py-2.5 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors text-sm font-medium disabled:opacity-40"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={nextQ}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors text-sm font-medium"
            >
              Next Word
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Vocab page ──────────────────────────────────────────────────────────
export function Vocab() {
  const [words, setWords] = useState<WordEntry[]>(loadWords)
  const [idx, setIdx] = useState<number>(() => {
    const saved = loadIdx()
    const loaded = loadWords()
    return saved < loaded.length ? saved : 0
  })
  const [addInput, setAddInput] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [quizMode, setQuizMode] = useState(false)
  const [collFilter, setCollFilter] = useState<CollectionFilter>('all')

  useEffect(() => { saveWords(words) }, [words])
  useEffect(() => { saveIdx(idx) }, [idx])

  const toggleLearned = (id: string) => {
    setWords((prev) => prev.map((w) => (w.id === id ? { ...w, learned: !w.learned } : w)))
  }

  const addWord = async () => {
    const trimmed = addInput.trim()
    if (!trimmed) return
    const dup = words.find((w) => w.word.toLowerCase() === trimmed.toLowerCase())
    if (dup) { setAddError('Already in your bank.'); return }
    setAddLoading(true)
    setAddError('')
    try {
      const data = await fetchWord(trimmed)
      const entry: WordEntry = {
        id: crypto.randomUUID(),
        ...data,
        learned: false,
        addedAt: new Date().toISOString(),
      }
      setWords((prev) => {
        const next = [entry, ...prev]
        return next
      })
      setIdx(0) // navigate to new word
      setAddInput('')
    } catch {
      setAddError('Word not found. Check spelling and try again.')
    } finally {
      setAddLoading(false)
    }
  }

  const removeWord = (id: string) => {
    setWords((prev) => {
      const next = prev.filter((w) => w.id !== id)
      setIdx((i) => Math.min(i, Math.max(0, next.length - 1)))
      return next
    })
  }

  const addDailyToBank = (w: WordEntry) => {
    // The daily word pool is the same as bank; "Add to Bank" means mark it specially — but
    // since daily word comes from existing bank, this branch only triggers if we had a
    // separate pool. We silently ignore duplicates.
    if (!words.find((x) => x.id === w.id)) {
      setWords((prev) => [w, ...prev])
      setIdx(0)
    }
  }

  const bankIdSet = new Set(words.map((w) => w.id))

  const filteredCollection = words.filter((w) => {
    if (collFilter === 'learned') return w.learned
    if (collFilter === 'learning') return !w.learned
    return true
  })

  const learnedCount = words.filter((w) => w.learned).length

  if (quizMode) {
    return (
      <QuizMode
        words={words}
        onMarkLearned={toggleLearned}
        onClose={() => setQuizMode(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Vocabulary</h1>
          <span className="text-xs text-muted-foreground ml-1">({words.length} words)</span>
          {learnedCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              {learnedCount} learned
            </span>
          )}
        </div>
        <button
          onClick={() => setQuizMode(true)}
          disabled={words.filter((w) => !w.learned).length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <GraduationCap className="w-4 h-4" />
          Quiz Mode
        </button>
      </div>

      {/* Add word */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-3">
          <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={addInput}
            onChange={(e) => { setAddInput(e.target.value); setAddError('') }}
            onKeyDown={(e) => e.key === 'Enter' && addWord()}
            placeholder="Add a word... (press Enter)"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            disabled={addLoading}
          />
          <button
            onClick={addWord}
            disabled={addLoading || !addInput.trim()}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {addLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Add
          </button>
        </div>
        {addError && <p className="text-xs text-red-400 pl-7">{addError}</p>}
      </div>

      {words.length === 0 ? (
        <div className="glass rounded-2xl p-16 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-primary/60" />
          </div>
          <div className="space-y-1">
            <p className="text-foreground font-semibold">Your word bank is empty.</p>
            <p className="text-sm text-muted-foreground">Add a word above to get started.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Explorer + Collection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Word Explorer */}
            <WordExplorer
              words={words}
              idx={Math.min(idx, words.length - 1)}
              onSetIdx={setIdx}
              onToggleLearned={toggleLearned}
            />

            {/* Word Collection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Word Collection</h3>
                <div className="flex gap-1.5">
                  {(['all', 'learning', 'learned'] as CollectionFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setCollFilter(f)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-lg border transition-colors capitalize',
                        collFilter === f
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20'
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {filteredCollection.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {collFilter !== 'all' ? `No ${collFilter} words yet.` : 'Add your first word above.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-hide">
                  {filteredCollection.map((w, i) => (
                    <div
                      key={w.id}
                      className={cn(
                        'glass rounded-xl px-4 py-2.5 flex items-center gap-3 hover:border-primary/20 transition-all duration-200 group cursor-pointer',
                        words.indexOf(w) === idx && 'border-primary/30 bg-primary/5'
                      )}
                      onClick={() => setIdx(words.indexOf(w))}
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors capitalize shrink-0">
                          {w.word}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{w.definition}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {w.learned && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            Learned
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeWord(w.id) }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Render i variable to avoid unused warning — suppress via void */}
                  {void(filteredCollection.forEach((_, i) => i))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Daily Word */}
          <div className="space-y-4">
            <DailyWord
              words={words}
              bankIds={bankIdSet}
              onAddToBank={addDailyToBank}
            />

            {/* Stats card */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest">Your Progress</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total words</span>
                  <span className="text-foreground font-semibold">{words.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Learned</span>
                  <span className="text-emerald-400 font-semibold">{learnedCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">In progress</span>
                  <span className="text-primary font-semibold">{words.length - learnedCount}</span>
                </div>
                {words.length > 0 && (
                  <div className="pt-2">
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500"
                        style={{ width: `${Math.round((learnedCount / words.length) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {Math.round((learnedCount / words.length) * 100)}% mastered
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
