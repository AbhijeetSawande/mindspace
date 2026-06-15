import { cn } from '@/lib/utils'
import { useApp, type Page } from '@/store/appStore'
import { useAuth } from '@/store/authStore'
import {
  LayoutDashboard,
  CheckSquare, FileText, FolderKanban, CalendarDays,
  Activity, Target, Heart, Wallet, NotebookPen,
  BookMarked, Newspaper, GraduationCap, Library, Link2, Languages,
  Zap, Timer, MessageSquare, Settings, Brain, LogOut,
} from 'lucide-react'

type NavItem = { id: Page; label: string; icon: React.ElementType; badge?: number }
type NavGroup = { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'CORE',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'WORK',
    items: [
      { id: 'todos', label: 'Todos', icon: CheckSquare },
      { id: 'notes', label: 'Notes', icon: FileText },
      { id: 'projects', label: 'Work', icon: FolderKanban },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays },
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
      { id: 'links', label: 'Links Vault', icon: Link2 },
    ],
  },
  {
    label: 'AI',
    items: [
      { id: 'ai', label: 'Ask Mindspace', icon: MessageSquare },
      { id: 'edge', label: 'The Edge', icon: Zap },
      { id: 'focus', label: 'Focus Timer', icon: Timer },
    ],
  },
]

export function Sidebar() {
  const { page, setPage, sidebarCollapsed, setSidebarCollapsed } = useApp()
  const { user, signOut } = useAuth()

  const collapsed = sidebarCollapsed

  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  return (
    <aside
      className={cn(
        'hidden md:flex fixed left-0 top-0 h-full flex-col glass-sidebar z-40 transition-all duration-300',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-[18px] border-b border-[var(--glass-border)]">
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 hover:bg-primary/25 transition-all"
        >
          <Brain className="w-[15px] h-[15px] text-primary" />
        </button>
        {!collapsed && (
          <div>
            <span className="font-semibold text-foreground text-[13px] tracking-tight">Mindspace</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto scrollbar-hide space-y-0.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className={collapsed ? 'mb-1' : 'mb-2'}>
            {!collapsed && (
              <p className="px-2 pt-2 pb-1 text-[9px] font-bold tracking-[0.12em] text-muted-foreground/40 uppercase">
                {group.label}
              </p>
            )}
            {group.items.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setPage(id)}
                title={collapsed ? label : undefined}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12px] font-medium transition-all duration-150',
                  page === id
                    ? 'nav-active'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/4',
                  collapsed && 'justify-center px-0'
                )}
              >
                <Icon className="w-[14px] h-[14px] shrink-0" />
                {!collapsed && <span className="flex-1 text-left leading-none">{label}</span>}
                {!collapsed && badge !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold leading-none">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom: user + settings + sign out */}
      <div className="px-2 pb-3 pt-3 border-t border-[var(--glass-border)] space-y-1">
        <button
          onClick={() => setPage('settings')}
          title={collapsed ? 'Settings' : undefined}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12px] font-medium transition-all duration-150',
            page === 'settings' ? 'nav-active' : 'text-muted-foreground hover:text-foreground hover:bg-white/4',
            collapsed && 'justify-center px-0'
          )}
        >
          <Settings className="w-[14px] h-[14px] shrink-0" />
          {!collapsed && <span className="flex-1 text-left leading-none">Settings</span>}
        </button>

        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
              {user.photo
                ? <img src={user.photo} className="w-full h-full rounded-full object-cover" alt="" />
                : <span className="text-[9px] font-bold text-primary">{initials}</span>
              }
            </div>
            <span className="flex-1 text-[11px] text-muted-foreground truncate">{user.name}</span>
            <button
              onClick={signOut}
              title="Sign out"
              className="text-muted-foreground/50 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        )}

        {collapsed && (
          <button
            onClick={signOut}
            title="Sign out"
            className="w-full flex items-center justify-center py-[7px] rounded-lg text-muted-foreground/50 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-[14px] h-[14px]" />
          </button>
        )}
      </div>
    </aside>
  )
}
