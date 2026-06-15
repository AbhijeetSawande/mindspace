import { cn } from '@/lib/utils'
import { useApp, type Page } from '@/store/appStore'
import {
  LayoutDashboard, CheckSquare, FileText,
  Heart, MessageSquare, MoreHorizontal, X,
  Activity, Target, Wallet, BookMarked,
  Newspaper, GraduationCap, Library, Link2,
  Languages, Zap, Timer, FolderKanban, NotebookPen,
  Settings,
} from 'lucide-react'
import { useState } from 'react'

const PRIMARY_NAV = [
  { id: 'dashboard' as Page, label: 'Home', icon: LayoutDashboard },
  { id: 'todos' as Page, label: 'Todos', icon: CheckSquare },
  { id: 'notes' as Page, label: 'Notes', icon: FileText },
  { id: 'ai' as Page, label: 'AI', icon: MessageSquare },
]

const ALL_NAV: { label: string; items: { id: Page; label: string; icon: React.ElementType }[] }[] = [
  {
    label: 'WORK',
    items: [
      { id: 'projects', label: 'Work', icon: FolderKanban },
    ],
  },
  {
    label: 'SELF',
    items: [
      { id: 'habits', label: 'Habits', icon: Activity },
      { id: 'goals', label: 'Goals', icon: Target },
      { id: 'journal', label: 'Journal', icon: NotebookPen },
      { id: 'health', label: 'Health', icon: Heart },
      { id: 'finance', label: 'Finance', icon: Wallet },
    ],
  },
  {
    label: 'LEARN',
    items: [
      { id: 'learn', label: 'Learn Hub', icon: GraduationCap },
      { id: 'news', label: 'News', icon: Newspaper },
      { id: 'links', label: 'Links', icon: Link2 },
    ],
  },
  {
    label: 'AI & TOOLS',
    items: [
      { id: 'edge', label: 'The Edge', icon: Zap },
      { id: 'focus', label: 'Focus Timer', icon: Timer },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
]

export function BottomNav() {
  const { page, setPage } = useApp()
  const [showMore, setShowMore] = useState(false)

  const navigate = (id: Page) => {
    setPage(id)
    setShowMore(false)
  }

  return (
    <div className="md:hidden">
      {/* More drawer */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
          />
          <div className="fixed bottom-16 left-0 right-0 z-50 mx-3 mb-1 glass rounded-2xl border border-white/10 overflow-y-auto max-h-[70vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-semibold text-foreground">All Pages</span>
              <button onClick={() => setShowMore(false)} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-3">
              {ALL_NAV.map((group) => (
                <div key={group.label}>
                  <p className="text-[9px] font-bold tracking-widest text-muted-foreground/50 uppercase px-2 mb-1">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {group.items.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => navigate(id)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-3 rounded-xl text-[11px] font-medium transition-all',
                          page === id
                            ? 'bg-primary/15 text-primary border border-primary/20'
                            : 'text-muted-foreground hover:bg-white/5 border border-transparent'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-center leading-tight">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass-sidebar border-t border-white/10 flex items-center justify-around px-2 py-2">
        {PRIMARY_NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all min-w-[56px]',
              page === id ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className={cn('w-5 h-5', page === id && 'drop-shadow-[0_0_6px_hsl(var(--primary))]')} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
        <button
          onClick={() => setShowMore(!showMore)}
          className={cn(
            'flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all min-w-[56px]',
            showMore ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </div>
  )
}
