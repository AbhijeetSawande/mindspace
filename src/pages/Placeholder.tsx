import { type LucideIcon } from 'lucide-react'

export function Placeholder({ icon: Icon, title, description }: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      <div className="mt-6 text-xs px-4 py-2 rounded-full glass text-muted-foreground border border-white/10">
        Coming soon
      </div>
    </div>
  )
}
