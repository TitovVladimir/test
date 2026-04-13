'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRIORITY_LABELS } from '@/shared/lib/utils'

interface TaskFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  priority: string
  onPriorityChange: (value: string) => void
  deadline: string
  onDeadlineChange: (value: string) => void
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: Event) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [])

  const selected = options.find((o) => o.value === value)
  const displayText = selected ? `${label}: ${selected.label}` : `${label}: Все`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 h-[38px] rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-muted cursor-pointer whitespace-nowrap',
          open && 'ring-2 ring-primary/20 border-primary',
        )}
      >
        {displayText}
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[160px] bg-background rounded-lg border border-border shadow-md z-50 py-1">
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className={cn(
              'w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors',
              !value && 'font-medium text-primary',
            )}
          >
            Все
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors',
                value === opt.value && 'font-medium text-primary',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const DEADLINE_OPTIONS = [
  { value: 'overdue', label: 'Просроченные' },
  { value: 'today', label: 'Сегодня' },
  { value: 'week', label: 'Эта неделя' },
  { value: 'month', label: 'Этот месяц' },
]

export function TaskFilters({
  search,
  onSearchChange,
  priority,
  onPriorityChange,
  deadline,
  onDeadlineChange,
}: TaskFiltersProps) {
  return (
    <div className="px-4 md:px-8 py-3 border-b border-border bg-background">
      {/* Desktop: single row */}
      <div className="hidden md:flex items-center gap-3">
        <div className="relative w-80 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по названию / описанию..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-[38px] w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="w-px h-6 bg-border flex-shrink-0" />
        <Dropdown
          label="Приоритет"
          value={priority}
          options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={onPriorityChange}
        />
        <Dropdown
          label="Срок"
          value={deadline}
          options={DEADLINE_OPTIONS}
          onChange={onDeadlineChange}
        />
      </div>

      {/* Mobile: search on top, filters below */}
      <div className="flex md:hidden flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-[38px] w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Dropdown
            label="Приоритет"
            value={priority}
            options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
            onChange={onPriorityChange}
          />
          <Dropdown
            label="Срок"
            value={deadline}
            options={DEADLINE_OPTIONS}
            onChange={onDeadlineChange}
          />
        </div>
      </div>
    </div>
  )
}
