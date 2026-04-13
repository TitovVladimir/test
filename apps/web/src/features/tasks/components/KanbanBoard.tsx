'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { SquareCheckBig, Plus, Sparkles, Inbox, Loader2, Sun, Moon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks'
import { useCategorize, useDecompose, usePrioritize, useSummarize } from '../hooks/useLlm'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { TaskFilters } from './TaskFilters'
import { TaskForm } from './TaskForm'
import { DeleteDialog } from './DeleteDialog'
import { LlmSummaryPanel } from './LlmSummaryPanel'
import { DecomposeDialog } from './DecomposeDialog'
import { api, type Task } from '@/shared/api/client'
import { STATUS_LABELS } from '@/shared/lib/utils'
import { toast } from 'sonner'
import { useTheme } from '@/app/providers'

const COLUMNS = [
  { id: 'PENDING', title: 'Ожидает' },
  { id: 'IN_PROGRESS', title: 'В работе' },
  { id: 'DONE', title: 'Готово' },
] as const

export function KanbanBoard() {
  const queryClient = useQueryClient()
  const { theme, toggleTheme } = useTheme()
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [deadlineFilter, setDeadlineFilter] = useState('')

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)

  const [summaryOpen, setSummaryOpen] = useState(false)
  const [decomposeTask, setDecomposeTask] = useState<Task | null>(null)
  const [decomposeResult, setDecomposeResult] = useState<{ title: string; description: string }[] | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [overColumn, setOverColumn] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const overColumnRef = useRef<string | null>(null)
  const summarizeAbortRef = useRef<AbortController | null>(null)
  const decomposeAbortRef = useRef<AbortController | null>(null)

  const filterParams = useMemo<Record<string, string>>(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (priorityFilter) params.priority = priorityFilter
    if (deadlineFilter === 'overdue') {
      params.overdue = 'true'
    } else if (deadlineFilter) {
      const today = new Date()
      params.deadlineAfter = today.toISOString()
      if (deadlineFilter === 'today') {
        const end = new Date(today); end.setHours(23, 59, 59, 999); params.deadlineBefore = end.toISOString()
      } else if (deadlineFilter === 'week') {
        const end = new Date(today); end.setDate(today.getDate() + (7 - today.getDay())); params.deadlineBefore = end.toISOString()
      } else if (deadlineFilter === 'month') {
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59); params.deadlineBefore = end.toISOString()
      }
    }
    return params
  }, [search, priorityFilter, deadlineFilter])

  const { data: response, isLoading } = useTasks(filterParams)
  const allTasks = response?.data ?? []

  const createMutation = useCreateTask()
  const updateMutation = useUpdateTask()
  const deleteMutation = useDeleteTask()
  const categorizeMutation = useCategorize()
  const decomposeMutation = useDecompose()
  const prioritizeMutation = usePrioritize()
  const summarizeMutation = useSummarize()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // Local state for optimistic drag updates
  const [localTasks, setLocalTasks] = useState<Task[] | null>(null)
  const displayTasks = localTasks ?? allTasks

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = allTasks.find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
    setLocalTasks(allTasks)
    setOverColumn(null)
    overColumnRef.current = null
  }, [allTasks])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // When the collision detector picks the dragged item itself as "over",
    // we must still clear any cross-column state — otherwise overColumn
    // stays stale and the placeholder lingers in the wrong column.
    if (activeId === overId) {
      setOverColumn(null)
      overColumnRef.current = null
      return
    }

    const current = localTasks ?? allTasks
    const activeTask = current.find((t) => t.id === activeId)
    if (!activeTask) return

    let targetStatus: string | null = null
    if (['PENDING', 'IN_PROGRESS', 'DONE'].includes(overId)) {
      targetStatus = overId
    } else {
      const overTask = current.find((t) => t.id === overId)
      if (overTask) targetStatus = overTask.status
    }

    if (targetStatus && activeTask.status !== targetStatus) {
      setOverColumn(targetStatus)
      overColumnRef.current = targetStatus
    } else {
      setOverColumn(null)
      overColumnRef.current = null
    }
  }, [allTasks, localTasks])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    // Read from ref to avoid stale closure
    const lastOverColumn = overColumnRef.current
    setActiveTask(null)
    setOverColumn(null)
    overColumnRef.current = null

    if (!over) {
      setLocalTasks(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    const current = localTasks ?? allTasks
    const activeTask = current.find((t) => t.id === activeId)
    if (!activeTask) {
      setLocalTasks(null)
      return
    }

    // Find target column: check overId, then overTask, then fallback to lastOverColumn
    let targetStatus: string = activeTask.status
    if (['PENDING', 'IN_PROGRESS', 'DONE'].includes(overId)) {
      targetStatus = overId
    } else if (overId !== activeId) {
      const overTask = current.find((t) => t.id === overId)
      if (overTask) targetStatus = overTask.status
    } else if (lastOverColumn) {
      // Dropped on self (placeholder in empty column) — use tracked overColumn
      targetStatus = lastOverColumn
    }

    // Get tasks in target column (without the active one)
    const columnTasks = current.filter((t) => t.status === targetStatus && t.id !== activeId)

    let finalOrder: string[]
    if (overId === targetStatus || !current.find((t) => t.id === overId)) {
      // Dropped on column — add at end
      finalOrder = [...columnTasks.map((t) => t.id), activeId]
    } else {
      // Dropped on a card — determine insert position by comparing vertical centers
      const overIndex = columnTasks.findIndex((t) => t.id === overId)
      const activeTranslated = active.rect.current.translated
      const overRect = over.rect

      let insertOffset = 0 // 0 = above (before over), 1 = below (after over)
      if (activeTranslated) {
        const activeCenterY = activeTranslated.top + activeTranslated.height / 2
        const overCenterY = overRect.top + overRect.height / 2
        if (activeCenterY > overCenterY) {
          insertOffset = 1
        }
      }

      const insertAt = overIndex === -1 ? columnTasks.length : overIndex + insertOffset
      finalOrder = [
        ...columnTasks.slice(0, insertAt).map((t) => t.id),
        activeId,
        ...columnTasks.slice(insertAt).map((t) => t.id),
      ]
    }

    const statusChanged = activeTask.status !== targetStatus

    // Optimistic: keep card in new position until server confirms
    const optimisticTasks = current.map((t) =>
      t.id === activeId ? { ...t, status: targetStatus as Task['status'] } : t,
    )
    const otherTasks = optimisticTasks.filter((t) => !finalOrder.includes(t.id))
    const reorderedColumn = finalOrder
      .map((id) => optimisticTasks.find((t) => t.id === id))
      .filter((t): t is Task => t !== undefined)
    setLocalTasks([...otherTasks, ...reorderedColumn])

    // Persist
    ;(async () => {
      try {
        if (statusChanged) {
          await api.tasks.update(activeId, { status: targetStatus })
        }
        await api.tasks.reorder(finalOrder)
        // Wait for fresh data before resetting local state — prevents teleport back
        await queryClient.refetchQueries({ queryKey: ['tasks'] })
        if (statusChanged) {
          toast.success(`Задача перемещена: ${STATUS_LABELS[targetStatus as keyof typeof STATUS_LABELS]}`)
        }
      } catch {
        toast.error('Не удалось переместить задачу')
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
      }
      // Now allTasks is fresh — safe to switch without teleport
      setLocalTasks(null)
    })()
  }, [allTasks, localTasks, queryClient])

  const handleDragCancel = useCallback(() => {
    setActiveTask(null)
    setOverColumn(null)
    overColumnRef.current = null
    setLocalTasks(null)
  }, [])

  const handleLlmAction = useCallback(
    (action: 'categorize' | 'decompose' | 'prioritize', task: Task) => {
      if (action === 'categorize') {
        categorizeMutation.mutate(task.id, {
          onSuccess: (res: { success: boolean; data?: { category: string } }) => {
            const d = res.data
            if (d) {
              updateMutation.mutate(
                { id: task.id, data: { category: d.category } },
                { onSuccess: () => toast.success(`Категория: ${d.category}`) },
              )
            }
          },
        })
      } else if (action === 'decompose') {
        setDecomposeTask(task)
        setDecomposeResult(null)
        decomposeAbortRef.current?.abort()
        decomposeAbortRef.current = new AbortController()
        decomposeMutation.mutate(
          { taskId: task.id, signal: decomposeAbortRef.current.signal },
          {
            onSuccess: (res: { success: boolean; data?: { subtasks: { title: string; description: string }[] } }) => {
              if (res.data) setDecomposeResult(res.data.subtasks)
            },
          },
        )
      } else if (action === 'prioritize') {
        prioritizeMutation.mutate(task.id, {
          onSuccess: (res: { success: boolean; data?: { priority: string; reason: string } }) => {
            const d = res.data
            if (d) {
              updateMutation.mutate(
                { id: task.id, data: { priority: d.priority } },
                { onSuccess: () => toast.success(`Приоритет: ${d.priority}. ${d.reason}`) },
              )
            }
          },
        })
      }
    },
    [categorizeMutation, decomposeMutation, prioritizeMutation, updateMutation],
  )

  const [isAcceptingDecompose, setIsAcceptingDecompose] = useState(false)

  const handleAcceptDecompose = useCallback(
    async (subtasks: { title: string; description: string }[]) => {
      if (!decomposeTask || isAcceptingDecompose) return
      setIsAcceptingDecompose(true)
      try {
        await Promise.all(subtasks.map((s) => api.tasks.create({ title: s.title, description: s.description })))
        await api.tasks.delete(decomposeTask.id)
        toast.success(`Задача разбита на ${subtasks.length} подзадач`)
        decomposeAbortRef.current = null
        setDecomposeTask(null)
        setDecomposeResult(null)
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
      } catch {
        toast.error('Не удалось создать подзадачи')
      } finally {
        setIsAcceptingDecompose(false)
      }
    },
    [decomposeTask, isAcceptingDecompose, queryClient],
  )

  const handleStatusChange = useCallback(
    (task: Task, newStatus: string) => {
      updateMutation.mutate(
        { id: task.id, data: { status: newStatus } },
        { onSuccess: () => toast.success(`Задача перемещена: ${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}`) },
      )
    },
    [updateMutation],
  )

  const isLlmLoading = categorizeMutation.isPending || decomposeMutation.isPending || prioritizeMutation.isPending

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16 bg-background border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <SquareCheckBig className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          <span className="text-lg md:text-xl font-bold text-foreground">Менеджер задач</span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-foreground" /> : <Moon className="h-4 w-4 text-foreground" />}
          </button>
          <button
            onClick={() => {
              summarizeAbortRef.current?.abort()
              summarizeAbortRef.current = new AbortController()
              setSummaryOpen(true)
              summarizeMutation.mutate(summarizeAbortRef.current.signal)
            }}
            disabled={summarizeMutation.isPending}
            className="flex items-center gap-1.5 md:gap-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg px-3 md:px-4 py-2 text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-800/40 transition-colors disabled:opacity-60"
          >
            {summarizeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>Сводка</span>
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 md:gap-2 bg-primary text-primary-foreground rounded-lg px-3 md:px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Новая задача</span>
          </button>
        </div>
      </header>

      {/* Filters */}
      <TaskFilters
        search={search} onSearchChange={setSearch}
        priority={priorityFilter} onPriorityChange={setPriorityFilter}
        deadline={deadlineFilter} onDeadlineChange={setDeadlineFilter}
      />

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex gap-6 p-4 md:p-6 md:px-8 h-full">
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex-1 bg-muted/50 rounded-xl p-4">
                <div className="animate-pulse space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-28 bg-muted rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            {search ? (
              <>
                <p className="text-sm text-muted-foreground">Ничего не найдено</p>
                <button
                  onClick={() => setSearch('')}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Сбросить поиск
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Задач пока нет</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Создать первую задачу
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: tabs */}
            <div className="flex flex-col md:hidden flex-1 overflow-hidden">
              <div className="flex bg-background border-b border-border px-4">
                {COLUMNS.map((col, idx) => {
                  const count = displayTasks.filter((t) => t.status === col.id).length
                  return (
                    <button
                      key={col.id}
                      onClick={() => setActiveTab(idx)}
                      className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                        activeTab === idx
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {col.title}{' '}
                      <span className="text-xs font-normal">{count}</span>
                    </button>
                  )
                })}
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {COLUMNS.map((col, idx) => {
                  if (idx !== activeTab) return null
                  const columnTasks = displayTasks.filter((t) => t.status === col.id)
                  return (
                    <div key={col.id} className="flex flex-col gap-3">
                      {columnTasks.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">Нет задач</p>
                      )}
                      {columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={setEditingTask}
                          onDelete={setDeletingTask}
                          onLlmAction={handleLlmAction}
                          onStatusChange={handleStatusChange}
                          isLoading={isLlmLoading}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Desktop: drag-and-drop columns */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="hidden md:flex gap-6 p-6 px-8 h-full overflow-x-auto">
                {COLUMNS.map((col) => {
                  const columnTasks = displayTasks.filter((t) => t.status === col.id)
                  return (
                    <KanbanColumn
                      key={col.id}
                      id={col.id}
                      title={col.title}
                      tasks={columnTasks}
                      overColumn={overColumn}
                      activeTaskId={activeTask?.id ?? null}
                      onEdit={setEditingTask}
                      onDelete={setDeletingTask}
                      onLlmAction={handleLlmAction}
                      onStatusChange={handleStatusChange}
                      isLoading={isLlmLoading}
                    />
                  )
                })}
              </div>

              <DragOverlay dropAnimation={{ duration: 300, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
                {activeTask && (
                  <div className="w-full max-w-[calc(100vw-2rem)] md:max-w-sm">
                    <div className="bg-card rounded-xl border shadow-2xl p-5 opacity-95 scale-[1.03] ring-1 ring-primary/10">
                      <h3 className="text-base font-semibold truncate">{activeTask.title}</h3>
                      {activeTask.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{activeTask.description}</p>
                      )}
                    </div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </>
        )}
      </div>

      {/* Dialogs */}
      {showCreateForm && (
        <TaskForm
          onSubmit={(data) => createMutation.mutate(data, { onSuccess: () => setShowCreateForm(false) })}
          onClose={() => setShowCreateForm(false)}
          isLoading={createMutation.isPending}
        />
      )}
      {editingTask && (
        <TaskForm
          task={editingTask}
          onSubmit={(data) => updateMutation.mutate({ id: editingTask.id, data }, { onSuccess: () => setEditingTask(null) })}
          onClose={() => setEditingTask(null)}
          isLoading={updateMutation.isPending}
        />
      )}
      {deletingTask && (
        <DeleteDialog
          task={deletingTask}
          onConfirm={() => deleteMutation.mutate(deletingTask.id, { onSuccess: () => setDeletingTask(null) })}
          onClose={() => setDeletingTask(null)}
          isLoading={deleteMutation.isPending}
        />
      )}
      {decomposeTask && (
        <DecomposeDialog
          task={decomposeTask}
          subtasks={decomposeResult}
          isLoading={decomposeMutation.isPending || isAcceptingDecompose}
          onAccept={handleAcceptDecompose}
          onClose={() => {
            decomposeAbortRef.current?.abort()
            decomposeAbortRef.current = null
            decomposeMutation.reset()
            setDecomposeTask(null)
            setDecomposeResult(null)
          }}
        />
      )}
      <LlmSummaryPanel
        isOpen={summaryOpen}
        onClose={() => {
          summarizeAbortRef.current?.abort()
          summarizeAbortRef.current = null
          summarizeMutation.reset()
          setSummaryOpen(false)
        }}
        data={summarizeMutation.data?.success ? (summarizeMutation.data.data as { summary: string; stats: { total: number; overdue: number; done: number; byPriority: { HIGH: number; MEDIUM: number; LOW: number } } }) : null}
        isLoading={summarizeMutation.isPending}
      />

      {/* Loading toast for categorize/prioritize (no modal) */}
      {(categorizeMutation.isPending || prioritizeMutation.isPending) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-full shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">ИИ обрабатывает запрос...</span>
        </div>
      )}
    </div>
  )
}
