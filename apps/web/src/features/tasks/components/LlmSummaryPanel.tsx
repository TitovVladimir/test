'use client'

import { Sparkles, X, Loader2, ListChecks, AlertTriangle, CheckCircle2, Circle } from 'lucide-react'
import ReactMarkdown, { type Components } from 'react-markdown'
import { cn } from '@/shared/lib/utils'

interface LlmSummaryPanelProps {
  isOpen: boolean
  onClose: () => void
  data: {
    summary: string
    stats: {
      total: number
      overdue: number
      done: number
      byPriority: { HIGH: number; MEDIUM: number; LOW: number }
    }
  } | null
  isLoading: boolean
}

const STAT_CARDS = [
  { key: 'total', label: 'Всего', icon: ListChecks, color: 'text-primary', bg: 'bg-primary/8', border: 'border-primary/15' },
  { key: 'overdue', label: 'Просрочено', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/8', border: 'border-destructive/15' },
  { key: 'done', label: 'Выполнено', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800' },
] as const

const PRIORITY_CONFIG = [
  { key: 'HIGH' as const, label: 'Высокий', dot: 'bg-red-500', bar: 'bg-gradient-to-r from-red-500 to-red-400' },
  { key: 'MEDIUM' as const, label: 'Средний', dot: 'bg-amber-500', bar: 'bg-gradient-to-r from-amber-500 to-amber-400' },
  { key: 'LOW' as const, label: 'Низкий', dot: 'bg-emerald-500', bar: 'bg-gradient-to-r from-emerald-500 to-emerald-400' },
]

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="text-[14px] font-semibold text-foreground tracking-tight mt-7 mb-2 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[13px] font-semibold text-foreground/90 mt-5 mb-1.5 first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-[13px] leading-[1.8] text-foreground/75 my-1.5 first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 flex flex-col gap-1.5 pl-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal list-outside ml-5 flex flex-col gap-1.5 [&::marker]:text-[11px] [&::marker]:text-muted-foreground">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="flex gap-2.5 text-[13px] leading-[1.7] text-foreground/75">
      <span className="flex-shrink-0 mt-[7px]">
        <Circle className="h-1.5 w-1.5 fill-purple-400 text-purple-400" />
      </span>
      <span className="flex-1 [&_ol]:ml-0 [&_ul]:ml-0">{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-foreground/90 italic">{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-purple-300 pl-3 my-2 text-foreground/70 italic">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[12px] px-1.5 py-0.5 rounded font-mono">
      {children}
    </code>
  ),
}

export function LlmSummaryPanel({ isOpen, onClose, data, isLoading }: LlmSummaryPanelProps) {
  if (!isOpen) return null

  const stats = data?.stats
  const totalActive = stats ? stats.total - stats.done : 0
  const maxPriority = stats
    ? Math.max(stats.byPriority.HIGH, stats.byPriority.MEDIUM, stats.byPriority.LOW, 1)
    : 1

  const statValues = stats
    ? { total: stats.total, overdue: stats.overdue, done: stats.done }
    : null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex md:justify-end z-50" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.backdrop = '1' }} onMouseUp={(e) => { const el = e.currentTarget; if (e.target === el && el.dataset.backdrop) onClose(); delete el.dataset.backdrop }}>
      <div
        className="h-full w-full md:w-[520px] md:max-w-full bg-card border-l border-border flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-7 py-4 md:py-5 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground leading-tight">Сводка нагрузки</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Анализ задач с помощью ИИ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 md:px-7 py-5 md:py-6 flex flex-col gap-6 md:gap-8 overflow-y-auto flex-1">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Loader2 className="h-7 w-7 text-purple-500 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">ИИ анализирует задачи</p>
                <p className="text-xs text-muted-foreground mt-1">Это может занять несколько секунд...</p>
              </div>
              <div className="w-full space-y-3 mt-4">
                <div className="flex gap-3">
                  <div className="flex-1 h-[72px] bg-muted/60 rounded-xl animate-pulse" />
                  <div className="flex-1 h-[72px] bg-muted/60 rounded-xl animate-pulse" />
                  <div className="flex-1 h-[72px] bg-muted/60 rounded-xl animate-pulse" />
                </div>
                <div className="h-40 bg-muted/60 rounded-xl animate-pulse" />
              </div>
            </div>
          )}

          {!isLoading && stats && statValues && (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-3">
                {STAT_CARDS.map(({ key, label, icon: Icon, color, bg, border }) => (
                  <div
                    key={key}
                    className={cn(
                      'rounded-xl p-4 border flex flex-col gap-2 transition-colors',
                      bg,
                      border,
                    )}
                  >
                    <Icon className={cn('h-4.5 w-4.5', color)} />
                    <div>
                      <span className={cn('text-2xl font-bold tracking-tight', color)}>
                        {statValues[key]}
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Summary */}
              {data?.summary && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-purple-500" />
                    <span className="text-[13px] font-semibold text-foreground">Анализ ИИ</span>
                  </div>
                  <div className="rounded-xl border border-purple-100/80 dark:border-purple-900/40 bg-gradient-to-b from-purple-50/50 dark:from-purple-900/20 to-transparent p-5">
                    <ReactMarkdown components={markdownComponents}>
                      {data.summary}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Priority Breakdown */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-primary" />
                    <span className="text-[13px] font-semibold text-foreground">Приоритеты</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    Активных: {totalActive}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {PRIORITY_CONFIG.map(({ key, label, dot, bar }) => {
                    const count = stats.byPriority[key]
                    const pct = maxPriority > 0 ? Math.round((count / maxPriority) * 100) : 0
                    return (
                      <div key={key} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn('w-2 h-2 rounded-full', dot)} />
                            <span className="text-[13px] text-foreground">{label}</span>
                          </div>
                          <span className="text-[13px] font-semibold tabular-nums text-foreground">
                            {count}
                          </span>
                        </div>
                        <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', bar)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
