'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Check, X, Loader2, Trash2 } from 'lucide-react'
import type { Task } from '@/shared/api/client'

interface SubtaskProposal {
  title: string
  description: string
}

interface DecomposeDialogProps {
  task: Task
  subtasks: SubtaskProposal[] | null
  isLoading: boolean
  onAccept: (subtasks: SubtaskProposal[]) => void
  onClose: () => void
}

export function DecomposeDialog({ task, subtasks, isLoading, onAccept, onClose }: DecomposeDialogProps) {
  const [editedSubtasks, setEditedSubtasks] = useState<SubtaskProposal[]>([])

  useEffect(() => {
    if (subtasks) {
      setEditedSubtasks(subtasks)
    }
  }, [subtasks])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-[640px] mx-4 rounded-2xl bg-card border border-border shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold text-foreground">Декомпозиция задачи</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Исходная задача:</p>
            <p className="text-[15px] font-semibold text-foreground">{task.title}</p>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{task.description}</p>
            )}
          </div>

          {isLoading && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                <Loader2 className="h-7 w-7 text-purple-500 animate-spin" />
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1.5 justify-center mb-1">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-semibold text-purple-600">ИИ разбивает задачу на подзадачи</span>
                </div>
                <p className="text-xs text-muted-foreground">Это может занять несколько секунд...</p>
              </div>
              <div className="w-full space-y-3 mt-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-muted rounded-[10px] p-3.5 animate-pulse flex flex-col gap-2">
                    <div className="h-8 bg-background rounded-md" />
                    <div className="h-8 bg-background rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && editedSubtasks.length > 0 && (
            <>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-[13px] text-purple-600">ИИ предлагает следующие подзадачи:</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {editedSubtasks.map((subtask, index) => (
                  <div
                    key={index}
                    className="bg-muted rounded-[10px] p-3.5 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={subtask.title}
                        onChange={(e) =>
                          setEditedSubtasks((prev) =>
                            prev.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)),
                          )
                        }
                        className="h-8 flex-1 rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                      />
                      <button
                        onClick={() =>
                          setEditedSubtasks((prev) => prev.filter((_, i) => i !== index))
                        }
                        className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={subtask.description}
                      onChange={(e) =>
                        setEditedSubtasks((prev) =>
                          prev.map((s, i) => (i === index ? { ...s, description: e.target.value } : s)),
                        )
                      }
                      className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-[13px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Отклонить
          </button>
          <button
            onClick={() => onAccept(editedSubtasks)}
            disabled={isLoading || editedSubtasks.length === 0}
            className="rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Принять все подзадачи
          </button>
        </div>
      </div>
    </div>
  )
}
