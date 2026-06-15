import { useState, useEffect, useCallback } from 'react'
import { Newspaper, Plus, X, RefreshCw, ExternalLink, AlertCircle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

const LS_KEY = 'cortex-news-topics'
const DEFAULT_TOPICS = ['AI', 'Technology', 'Finance', 'Health']

interface RssItem {
  title: string
  link: string
  pubDate: string
  description: string
  author: string
}

interface ArticlesByTopic {
  topic: string
  items: RssItem[]
  error: boolean
}

type DateFilter = 'all' | 'today' | 'week'

function loadTopics(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore
  }
  return DEFAULT_TOPICS
}

function saveTopics(topics: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(topics))
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return d >= weekAgo && d <= now
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  if (isToday(dateStr)) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
}

function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-4 space-y-3 animate-pulse">
      <div className="h-3 bg-white/10 rounded w-3/4" />
      <div className="h-3 bg-white/10 rounded w-full" />
      <div className="h-3 bg-white/10 rounded w-5/6" />
      <div className="flex gap-3 mt-2">
        <div className="h-2.5 bg-white/10 rounded w-20" />
        <div className="h-2.5 bg-white/10 rounded w-16" />
      </div>
    </div>
  )
}

function ArticleCard({ item }: { item: RssItem }) {
  const desc = stripHtml(item.description || '')
  const truncated = desc.length > 120 ? desc.slice(0, 120).trim() + '…' : desc
  const source = item.author || 'Unknown source'

  return (
    <div className="glass rounded-xl p-4 hover:border-white/10 transition-all duration-200 group">
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2 flex-1">
            {item.title}
          </h3>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </a>
      {truncated && (
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{truncated}</p>
      )}
      <div className="flex items-center gap-3 mt-3">
        <span className="text-[11px] text-muted-foreground/80 truncate max-w-[200px]">{source}</span>
        {item.pubDate && (
          <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1 shrink-0 ml-auto">
            <Calendar className="w-3 h-3" />
            {formatDate(item.pubDate)}
          </span>
        )}
      </div>
    </div>
  )
}

export function News() {
  const [topics, setTopics] = useState<string[]>(loadTopics)
  const [newTopic, setNewTopic] = useState('')
  const [articles, setArticles] = useState<ArticlesByTopic[]>([])
  const [loading, setLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [activeTopic, setActiveTopic] = useState<string>('All')
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchAll = useCallback(async () => {
    if (topics.length === 0) return
    setLoading(true)
    const results = await Promise.all(
      topics.map(async (topic): Promise<ArticlesByTopic> => {
        try {
          const rssUrl = `https://news.google.com/rss/search?q=${topic}`
          const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`
          const res = await fetch(apiUrl)
          if (!res.ok) throw new Error('fetch failed')
          const data = await res.json()
          const items: RssItem[] = (data.items || []).slice(0, 15)
          return { topic, items, error: false }
        } catch {
          return { topic, items: [], error: true }
        }
      })
    )
    setArticles(results)
    setLoading(false)
  }, [topics, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    saveTopics(topics)
  }, [topics])

  const addTopic = () => {
    const trimmed = newTopic.trim()
    if (!trimmed) return
    if (topics.find((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setNewTopic('')
      return
    }
    const updated = [...topics, trimmed]
    setTopics(updated)
    setNewTopic('')
  }

  const removeTopic = (topic: string) => {
    const updated = topics.filter((t) => t !== topic)
    setTopics(updated)
    if (activeTopic === topic) setActiveTopic('All')
  }

  const allItems: RssItem[] = articles.flatMap((a) => a.items)

  const filteredByTopic =
    activeTopic === 'All'
      ? allItems
      : articles.find((a) => a.topic === activeTopic)?.items ?? []

  const filteredByDate = filteredByTopic.filter((item) => {
    if (dateFilter === 'all') return true
    if (dateFilter === 'today') return isToday(item.pubDate)
    if (dateFilter === 'week') return isThisWeek(item.pubDate)
    return true
  })

  const activeTopicData = articles.find((a) => a.topic === activeTopic)
  const hasError = activeTopic === 'All'
    ? articles.length > 0 && articles.every((a) => a.error)
    : activeTopicData?.error ?? false

  const DATE_FILTERS: { label: string; value: DateFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'This week', value: 'week' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">News Feed</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allItems.length > 0 ? `${allItems.length} articles across ${topics.length} topics` : 'Curated news across your topics'}
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Topics */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Topics</p>
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <span
              key={topic}
              className={cn(
                'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer',
                activeTopic === topic
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20 hover:text-foreground'
              )}
              onClick={() => setActiveTopic(activeTopic === topic ? 'All' : topic)}
            >
              {topic}
              <button
                onClick={(e) => { e.stopPropagation(); removeTopic(topic) }}
                className="hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer',
              activeTopic === 'All'
                ? 'bg-primary/20 text-primary border-primary/40'
                : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20 hover:text-foreground'
            )}
            onClick={() => setActiveTopic('All')}
          >
            All topics
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTopic()}
            placeholder="Add topic (e.g. India, Crypto…)"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-white/10 focus:border-primary/40 pb-1 transition-colors"
          />
          <button
            onClick={addTopic}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-2">
        {DATE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setDateFilter(f.value)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-lg border transition-colors',
              dateFilter === f.value
                ? 'bg-primary/20 text-primary border-primary/40'
                : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/8 hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
        {filteredByDate.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{filteredByDate.length} articles</span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : hasError ? (
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm font-medium text-foreground">Could not load articles</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            The news feed couldn't be fetched right now. Check your connection or try refreshing.
          </p>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="text-xs px-4 py-2 rounded-lg bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors mt-1"
          >
            Try again
          </button>
        </div>
      ) : filteredByDate.length === 0 ? (
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
          <Newspaper className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No articles found</p>
          <p className="text-xs text-muted-foreground">
            {dateFilter !== 'all'
              ? 'Try changing the date filter or refreshing.'
              : 'Add topics above and hit Refresh.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredByDate.map((item, i) => (
            <ArticleCard key={`${item.link}-${i}`} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
