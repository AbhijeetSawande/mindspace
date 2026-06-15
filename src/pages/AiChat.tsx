import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Send, Trash2, Bot, User, Settings, Cpu } from 'lucide-react'
import { useApp } from '@/store/appStore'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: string
}

const SYSTEM_PREFIX =
  'You are Mindspace AI, a personal productivity assistant. Be concise and helpful. When answering, keep responses focused and actionable.'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

function getKey(): string {
  return localStorage.getItem('cortex-gemini-key') || ''
}

async function geminiChat(key: string, messages: Message[]): Promise<string> {
  const last10 = messages.slice(-10)
  const contents = last10.map((m, idx) => {
    const text = idx === 0 && m.role === 'user' ? SYSTEM_PREFIX + '\n\n' + m.text : m.text
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text }],
    }
  })

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `HTTP ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.'
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function AiChat() {
  const { setPage } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hasKey = Boolean(getKey())

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading || !hasKey) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    }

    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)
    setError('')

    try {
      const reply = await geminiChat(getKey(), updated)
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: reply,
        timestamp: new Date().toISOString(),
      }
      setMessages([...updated, assistantMsg])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get response. Check your API key.')
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function clearChat() {
    setMessages([])
    setError('')
  }

  return (
    <div className="flex flex-col max-w-3xl mx-auto h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="glass rounded-2xl p-4 flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Mindspace AI</h1>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Gemini 2.0 Flash</span>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                hasKey ? 'bg-green-400' : 'bg-red-400'
              )} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl glass border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* No key banner */}
      {!hasKey && (
        <div className="glass rounded-2xl p-4 mb-4 flex items-center justify-between border border-yellow-400/25 shrink-0">
          <p className="text-sm text-yellow-400">Add Gemini API key in Settings to enable AI</p>
          <button
            onClick={() => setPage('settings')}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-400/15 text-yellow-400 border border-yellow-400/25 hover:bg-yellow-400/25 transition-colors shrink-0"
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 px-1 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Mindspace AI</p>
              <p className="text-xs text-muted-foreground mt-1">Your personal productivity assistant</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {[
                'Help me plan my week',
                'What should I focus on today?',
                'Give me a productivity tip',
                'Help me set a goal',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                  disabled={!hasKey}
                  className="text-xs px-3 py-1.5 rounded-xl glass border border-white/10 text-muted-foreground hover:text-foreground hover:border-primary/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div className={cn(
              'max-w-[80%] space-y-1',
              msg.role === 'user' ? 'items-end' : 'items-start',
              'flex flex-col'
            )}>
              <div
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary/20 text-foreground border border-primary/25 rounded-tr-sm'
                    : 'glass border border-white/10 text-foreground rounded-tl-sm'
                )}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
              <span className="text-[10px] text-muted-foreground px-1">{formatTime(msg.timestamp)}</span>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 border border-white/10">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="glass rounded-xl p-3 border border-red-400/25 text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="glass rounded-2xl p-3 flex items-end gap-3 shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasKey ? 'Message Mindspace AI... (Enter to send, Shift+Enter for newline)' : 'Add API key in Settings to start chatting'}
          disabled={!hasKey || loading}
          rows={1}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-32 leading-relaxed disabled:opacity-50"
          style={{ height: 'auto', minHeight: '24px' }}
          onInput={(e) => {
            const t = e.target as HTMLTextAreaElement
            t.style.height = 'auto'
            t.style.height = Math.min(t.scrollHeight, 128) + 'px'
          }}
        />
        <button
          onClick={send}
          disabled={!hasKey || loading || !input.trim()}
          className="p-2.5 rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
