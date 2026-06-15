import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Plus, Search, Copy, ExternalLink, Trash2, Link2, X } from 'lucide-react'

interface LinkItem {
  id: string
  url: string
  title: string
  tags: string[]
  notes: string
  savedAt: string
}

function load(): LinkItem[] {
  try {
    return JSON.parse(localStorage.getItem('cortex-links') || '[]')
  } catch {
    return []
  }
}

function persist(items: LinkItem[]) {
  localStorage.setItem('cortex-links', JSON.stringify(items))
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url
  }
  return url
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function Links() {
  const [links, setLinks] = useState<LinkItem[]>(load)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [form, setForm] = useState({ url: '', title: '', tags: '', notes: '' })

  function update(next: LinkItem[]) {
    setLinks(next)
    persist(next)
  }

  function addLink() {
    if (!form.url.trim()) return
    const url = normalizeUrl(form.url.trim())
    const domain = extractDomain(url)
    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const item: LinkItem = {
      id: Date.now().toString(),
      url,
      title: form.title.trim() || domain,
      tags,
      notes: form.notes.trim(),
      savedAt: new Date().toISOString(),
    }
    update([item, ...links])
    setForm({ url: '', title: '', tags: '', notes: '' })
    setShowForm(false)
  }

  function deleteLink(id: string) {
    update(links.filter((l) => l.id !== id))
  }

  async function copyUrl(url: string, id: string) {
    await navigator.clipboard.writeText(url).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  // All unique tags
  const allTags = Array.from(new Set(links.flatMap((l) => l.tags))).sort()

  // Filter
  const filtered = links.filter((l) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      l.title.toLowerCase().includes(q) ||
      l.url.toLowerCase().includes(q) ||
      l.tags.some((t) => t.toLowerCase().includes(q))
    const matchTag = !activeTag || l.tags.includes(activeTag)
    return matchSearch && matchTag
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Links Vault</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{links.length} saved links</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Link
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="glass rounded-2xl p-5 space-y-3 border border-primary/20">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" /> Save Link
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addLink()}
              placeholder="URL *"
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 sm:col-span-2"
            />
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title"
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
            />
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Tags (comma separated)"
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
            />
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes (optional)"
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 sm:col-span-2"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="text-xs px-4 py-2 rounded-xl glass border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addLink}
              className="text-xs px-4 py-2 rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="glass rounded-2xl p-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, URL, or tag..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag(null)}
            className={cn(
              'text-xs px-3 py-1 rounded-full border transition-colors',
              !activeTag
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'glass border-white/10 text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={cn(
                'text-xs px-3 py-1 rounded-full border transition-colors',
                activeTag === tag
                  ? 'bg-primary/20 text-primary border-primary/30'
                  : 'glass border-white/10 text-muted-foreground hover:text-foreground'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Links grid */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center space-y-2">
          <Link2 className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {links.length === 0 ? 'No links saved yet. Add your first link!' : 'No links match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((link) => {
            const domain = extractDomain(link.url)
            return (
              <div key={link.id} className="glass rounded-xl p-4 space-y-3 hover:border-primary/20 border border-transparent transition-all">
                <div className="flex items-start gap-3">
                  {/* Favicon */}
                  <div className="w-8 h-8 rounded-lg glass border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {domain ? (
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                        alt=""
                        className="w-5 h-5"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{link.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                  </div>
                </div>

                {/* Tags */}
                {link.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {link.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setActiveTag(tag)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}

                {link.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{link.notes}</p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground">{timeAgo(link.savedAt)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyUrl(link.url, link.id)}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        copied === link.id
                          ? 'text-green-400 bg-green-400/10'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                      )}
                      title="Copy URL"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => deleteLink(link.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
