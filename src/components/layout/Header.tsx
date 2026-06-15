import { useApp } from '@/store/appStore'
import { useAuth } from '@/store/authStore'
import { Bell, Search } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  todos: 'Todos',
  notes: 'Notes',
  projects: 'Work',
  calendar: 'Calendar',
  habits: 'Habits',
  goals: 'Goals',
  journal: 'Journal',
  health: 'Health',
  finance: 'Finance',
  learn: 'Learn Hub',
  vocab: 'Vocabulary',
  news: 'News',
  tolearn: 'To Learn',
  books: 'Books',
  links: 'Links Vault',
  language: 'Language',
  edge: 'The Edge',
  focus: 'Focus Timer',
  ai: 'AI Assistant',
  settings: 'Settings',
}

export function Header() {
  const { page } = useApp()
  const { user } = useAuth()

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  return (
    <header className="sticky top-0 z-30 glass border-b border-[var(--glass-border)] px-4 md:px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{PAGE_TITLES[page] || 'Mindspace'}</h1>
        <p className="text-xs text-muted-foreground">{dateStr}</p>
      </div>
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Search className="w-4 h-4" />
        </button>
        <button className="w-9 h-9 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
          {user?.photo
            ? <img src={user.photo} className="w-full h-full object-cover" alt="" />
            : <span className="text-xs font-bold text-primary">{initials}</span>
          }
        </div>
      </div>
    </header>
  )
}
