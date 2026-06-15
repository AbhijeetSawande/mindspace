import { AppContext, useAppState } from '@/store/appStore'
import { AuthContext, useAuthState } from '@/store/authStore'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Todos } from '@/pages/Todos'
import { Habits } from '@/pages/Habits'
import { Goals } from '@/pages/Goals'
import { News } from '@/pages/News'
import { Notes } from '@/pages/Notes'
import { LearnHub } from '@/pages/LearnHub'
import { Journal } from '@/pages/Journal'
import { FocusTimer } from '@/pages/FocusTimer'
import { Links } from '@/pages/Links'
import { AiChat } from '@/pages/AiChat'
import { Settings } from '@/pages/Settings'
import { Projects } from '@/pages/Projects'
import { Health } from '@/pages/Health'
import { Finance } from '@/pages/Finance'
import { Placeholder } from '@/pages/Placeholder'
import { cn } from '@/lib/utils'
import { Zap, CalendarDays } from 'lucide-react'

function Pages({ page }: { page: string }) {
  switch (page) {
    case 'dashboard':  return <Dashboard />
    case 'todos':      return <Todos />
    case 'notes':      return <Notes />
    case 'projects':   return <Projects />
    case 'calendar':   return <Placeholder icon={CalendarDays} title="Calendar" description="Connect Google Calendar to see your schedule inside Mindspace." />
    case 'habits':     return <Habits />
    case 'goals':      return <Goals />
    case 'journal':    return <Journal />
    case 'health':     return <Health />
    case 'finance':    return <Finance />
    case 'learn':      return <LearnHub />
    case 'news':       return <News />
    case 'links':      return <Links />
    case 'edge':       return <Placeholder icon={Zap} title="The Edge" description="Cognitive skills training across 8 domains: memory, decisions, relationships, and more." />
    case 'focus':      return <FocusTimer />
    case 'ai':         return <AiChat />
    case 'settings':   return <Settings />
    default:           return <Dashboard />
  }
}

export default function App() {
  const authState = useAuthState()
  const appState = useAppState()

  return (
    <AuthContext.Provider value={authState}>
      {!authState.user ? (
        <div className="gradient-mesh">
          <Login />
        </div>
      ) : (
        <AppContext.Provider value={appState}>
          <div className="gradient-mesh">
            {/* Desktop sidebar — hidden on mobile via Sidebar's own className */}
            <Sidebar />

            {/* Main content */}
            <div
              className={cn(
                'min-h-dvh flex flex-col transition-all duration-300',
                'pb-20 md:pb-0',
                appState.sidebarCollapsed ? 'md:pl-14' : 'md:pl-56'
              )}
            >
              <Header />
              <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
                <Pages page={appState.page} />
              </main>
            </div>

            {/* Mobile bottom nav — hidden on desktop via BottomNav's own className */}
            <BottomNav />
          </div>
        </AppContext.Provider>
      )}
    </AuthContext.Provider>
  )
}
