'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, Tag, Pencil, Trash2, Sparkles, ArrowRight, ChevronDown, Layers, Gauge } from 'lucide-react'
import { cn, PRIORITY_LABELS, STATUS_LABELS, formatDate, isOverdue } from '@/shared/lib/utils'
import type { Task } from '@/shared/api/client'

const AI_ACTIONS = [
  { key: 'categorize' as const, label: 'Категория', icon: Tag, desc: 'Определить категорию задачи' },
  { key: 'decompose' as const, label: 'Декомпозиция', icon: Layers, desc: 'Разбить на подзадачи' },
  { key: 'prioritize' as const, label: 'Приоритет', icon: Gauge, desc: 'Оценить приоритет задачи' },
]

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onLlmAction: (action: 'categorize' | 'decompose' | 'prioritize', task: Task) => void
  onStatusChange: (task: Task, newStatus: string) => void
  isLoading: boolean
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

const MOVE_OPTIONS: Record<string, { target: string; label: string }[]> = {
  PENDING: [
    { target: 'IN_PROGRESS', label: 'В работу' },
    { target: 'DONE', label: 'Готово' },
  ],
  IN_PROGRESS: [
    { target: 'PENDING', label: 'Ожидает' },
    { target: 'DONE', label: 'Готово' },
  ],
  DONE: [
    { target: 'PENDING', label: 'Ожидает' },
    { target: 'IN_PROGRESS', label: 'В работу' },
  ],
}

export function TaskCard({ task, onEdit, onDelete, onLlmAction, onStatusChange, isLoading, expanded: expandedProp, onExpandedChange }: TaskCardProps) {
  const [expandedInternal, setExpandedInternal] = useState(false)
  const [aiMenuOpen, setAiMenuOpen] = useState(false)
  const aiMenuRef = useRef<HTMLDivElement>(null)
  const expanded = expandedProp ?? expandedInternal
  const setExpanded = onExpandedChange ?? setExpandedInternal
  const overdue = isOverdue(task.deadline, task.status)
  const isDone = task.status === 'DONE'

  useEffect(() => {
    if (!aiMenuOpen) return
    function handleOutside(e: Event) {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) setAiMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [aiMenuOpen])

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    const selection = window.getSelection()
    if (selection && selection.toString().length > 0) return
    setExpanded(!expanded)
  }

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'w-full rounded-xl border bg-card transition-[border-color,box-shadow,opacity] duration-200',
        !expanded && 'hover:shadow-md hover:border-primary/30 cursor-pointer',
        expanded && 'shadow-sm',
        overdue ? 'border-destructive' : 'border-border',
        isDone && 'opacity-70',
      )}
      style={{ padding: '12px 16px' }}
    >
      {/* Row 1: Title + Badges */}
      <div className="flex items-center justify-between gap-2 md:gap-3">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <h3
            className={cn(
              'text-sm md:text-base font-semibold',
              !expanded && 'truncate',
              isDone && 'line-through text-muted-foreground',
            )}
          >
            {task.title}
          </h3>
          {overdue && (
            <span className="flex-shrink-0 bg-red-50 dark:bg-red-900/30 text-destructive text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5">
              Просрочено
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {task.category && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-accent-purple bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">
              <Tag className="h-2.5 w-2.5" />
              {task.category}
            </span>
          )}
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0',
            task.priority === 'HIGH' ? 'bg-destructive' : task.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
          )} title={`Приоритет: ${PRIORITY_LABELS[task.priority]}`} />
          <span className="text-[11px] text-muted-foreground">{PRIORITY_LABELS[task.priority]}</span>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className={cn('text-sm text-muted-foreground leading-relaxed mt-2 md:mt-3', !expanded && 'line-clamp-2')}>
          {task.description}
        </p>
      )}

      {/* Footer */}
      {expanded && <div className="border-t border-border mt-3 pt-3">
        <div className="flex flex-col gap-3">
          {/* Move buttons — mobile only */}
          <div className="flex md:hidden items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground font-medium">Переместить:</span>
            {MOVE_OPTIONS[task.status]?.map(({ target, label }) => (
              <button
                key={target}
                onClick={() => onStatusChange(task, target)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-foreground bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <ArrowRight className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar
                className={cn(
                  'h-3.5 w-3.5',
                  overdue ? 'text-destructive' : 'text-muted-foreground',
                )}
              />
              <span
                className={cn(
                  'text-[13px]',
                  overdue ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {formatDate(task.deadline)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* AI Actions — desktop: 3 separate buttons */}
              <div className="hidden md:flex items-center gap-1 mr-1 pr-2 border-r border-border">
                {AI_ACTIONS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => onLlmAction(key, task)}
                    disabled={isLoading || isDone}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-800/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon className={cn('h-3 w-3', isLoading && 'animate-pulse')} />
                    {label}
                  </button>
                ))}
              </div>

              {/* AI Actions — mobile: single dropdown */}
              <div ref={aiMenuRef} className="relative md:hidden mr-1 pr-2 border-r border-border">
                <button
                  onClick={() => setAiMenuOpen(!aiMenuOpen)}
                  disabled={isLoading || isDone}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors',
                    aiMenuOpen
                      ? 'bg-purple-100 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300'
                      : 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-800/40',
                    (isLoading || isDone) && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  <Sparkles className={cn('h-3.5 w-3.5', isLoading && 'animate-pulse')} />
                  <ChevronDown className={cn('h-3 w-3 transition-transform', aiMenuOpen && 'rotate-180')} />
                </button>
                {aiMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-1 w-56 bg-background rounded-lg border border-border shadow-lg z-50 py-1">
                    {AI_ACTIONS.map(({ key, label, icon: Icon, desc }) => (
                      <button
                        key={key}
                        onClick={() => { onLlmAction(key, task); setAiMenuOpen(false) }}
                        disabled={isLoading}
                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-start gap-2.5 disabled:opacity-40"
                      >
                        <Icon className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-foreground">{label}</div>
                          <div className="text-[11px] text-muted-foreground">{desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit / Delete */}
              <button
                onClick={() => onEdit(task)}
                className="group inline-flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(task)}
                className="group inline-flex items-center gap-1 px-2 py-1 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>}
    </div>
  )
}
