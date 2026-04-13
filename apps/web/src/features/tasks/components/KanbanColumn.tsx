'use client'

import { useState, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { TaskCard } from './TaskCard'
import type { Task } from '@/shared/api/client'

function SortableTaskCard({
  task,
  onEdit,
  onDelete,
  onLlmAction,
  onStatusChange,
  isLoading,
}: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onLlmAction: (action: 'categorize' | 'decompose' | 'prioritize', task: Task) => void
  onStatusChange: (task: Task, newStatus: string) => void
  isLoading: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 1 : undefined,
    touchAction: 'none',
  }

  const dragProps = expanded ? {} : listeners

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...dragProps}
      className={cn(
        'transition-opacity duration-200',
        expanded ? '' : 'cursor-grab active:cursor-grabbing',
      )}
    >
      <TaskCard
        task={task}
        onEdit={onEdit}
        onDelete={onDelete}
        onLlmAction={onLlmAction}
        onStatusChange={onStatusChange}
        isLoading={isLoading}
        expanded={expanded}
        onExpandedChange={setExpanded}
      />
    </div>
  )
}

interface KanbanColumnProps {
  id: string
  title: string
  tasks: Task[]
  overColumn: string | null
  activeTaskId: string | null
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onLlmAction: (action: 'categorize' | 'decompose' | 'prioritize', task: Task) => void
  onStatusChange: (task: Task, newStatus: string) => void
  isLoading: boolean
}

const COLUMN_STYLES: Record<string, { dot: string; bg: string }> = {
  PENDING: { dot: 'bg-muted-foreground', bg: 'bg-muted/40' },
  IN_PROGRESS: { dot: 'bg-blue-500', bg: 'bg-blue-50/50 dark:bg-blue-900/20' },
  DONE: { dot: 'bg-green-500', bg: 'bg-green-50/30 dark:bg-green-900/20' },
}

export function KanbanColumn({ id, title, tasks, overColumn, activeTaskId, onEdit, onDelete, onLlmAction, onStatusChange, isLoading }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id })
  const style = COLUMN_STYLES[id] ?? COLUMN_STYLES.PENDING
  const isTargetColumn = overColumn === id
  const showPlaceholder = isTargetColumn && activeTaskId

  // Only IDs of cards that actually live in this column.
  // The active (dragged) card stays in its original column's SortableContext
  // with opacity 0.3 — we must NOT duplicate its ID here, otherwise
  // @dnd-kit/sortable's internal state corrupts when the card returns home.
  const sortableItems = useMemo(() => tasks.map((t) => t.id), [tasks])

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 md:min-w-[300px] rounded-xl p-4 flex flex-col gap-4 transition-colors min-h-[200px]',
        style.bg,
        isTargetColumn && 'ring-2 ring-primary/30 dark:bg-primary/10',
      )}
    >
      <div className="flex items-center gap-2 px-1">
        <span className={cn('w-2 h-2 rounded-full', style.dot)} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onLlmAction={onLlmAction}
              onStatusChange={onStatusChange}
              isLoading={isLoading}
            />
          ))}
          {showPlaceholder && (
            <div className="h-24 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 transition-all duration-200" />
          )}
        </div>
      </SortableContext>
    </div>
  )
}
