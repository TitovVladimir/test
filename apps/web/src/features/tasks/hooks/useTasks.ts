'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Task } from '@/shared/api/client'
import { toast } from 'sonner'

interface PaginatedTasks {
  data: Task[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export function useTasks(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const res = await api.tasks.getAll(params)
      // API wraps through TransformInterceptor: { success, data: { data, meta } }
      return res.data as unknown as PaginatedTasks
    },
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const res = await api.tasks.getById(id)
      return res.data as Task
    },
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.tasks.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Задача создана')
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.tasks.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Задача обновлена')
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Задача удалена')
    },
  })
}
