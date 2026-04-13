'use client'

import { X, TriangleAlert, Trash2 } from 'lucide-react'
import type { Task } from '@/shared/api/client'

interface DeleteDialogProps {
  task: Task
  onConfirm: () => void
  onClose: () => void
  isLoading: boolean
}

export function DeleteDialog({ task, onConfirm, onClose, isLoading }: DeleteDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.backdrop = '1' }} onMouseUp={(e) => { const el = e.currentTarget; if (e.target === el && el.dataset.backdrop) onClose(); delete el.dataset.backdrop }}>
      <div
        className="w-full max-w-[420px] mx-4 rounded-2xl bg-card border border-border shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Удалить задачу?</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <TriangleAlert className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">
              Это действие нельзя отменить
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Задача «{task.title}» будет удалена навсегда вместе с подзадачами.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-lg bg-destructive/10 text-destructive px-5 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-destructive/20 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Удалить
          </button>
        </div>
      </div>
    </div>
  )
}
