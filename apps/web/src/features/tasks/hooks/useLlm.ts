'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { toast } from 'sonner'

export function useCategorize() {
  return useMutation({
    mutationFn: (taskId: string) => api.llm.categorize(taskId),
  })
}

export function useDecompose() {
  return useMutation({
    mutationFn: ({ taskId, signal }: { taskId: string; signal?: AbortSignal }) =>
      api.llm.decompose(taskId, signal),
  })
}

export function usePrioritize() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => api.llm.prioritize(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useSummarize() {
  return useMutation({
    mutationFn: (signal?: AbortSignal) => api.llm.summarize(signal),
    onError: (err) => {
      if ((err as Error).name === 'AbortError') return
      toast.error('Не удалось получить сводку. Проверьте API-ключ LLM.')
    },
  })
}
