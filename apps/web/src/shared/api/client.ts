import { toast } from 'sonner'

const API_BASE = '/api/v1'
const TOKEN_KEY = 'auth_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  meta?: { total: number; page: number; limit: number; totalPages: number }
  error?: { code: string; message: string }
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: authHeaders(),
      ...options,
    })

    if (res.status === 401) {
      clearToken()
      window.location.reload()
      throw new Error('Unauthorized')
    }

    if (res.status === 204) {
      return { success: true, data: undefined as T }
    }

    const data = await res.json()

    if (!res.ok || data.success === false) {
      const message = data.error?.message ?? 'Произошла ошибка'
      toast.error(message)
      return data
    }

    return data
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    if ((err as Error).message === 'Unauthorized') throw err
    toast.error('Не удалось подключиться к серверу')
    throw new Error('Network error')
  }
}

export const api = {
  auth: {
    login: async (password: string) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) {
        throw new Error(data.error?.message ?? 'Неверный пароль')
      }
      return data as { success: boolean; data: { token: string } }
    },
  },

  tasks: {
    getAll: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<Task[]>(`/tasks${query}`)
    },

    getById: (id: string) => request<Task>(`/tasks/${id}`),

    create: (data: Record<string, unknown>) =>
      request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: Record<string, unknown>) =>
      request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    delete: (id: string) =>
      request<void>(`/tasks/${id}`, { method: 'DELETE' }),

    reorder: (taskIds: string[]) =>
      request<void>('/tasks/reorder', { method: 'PATCH', body: JSON.stringify({ taskIds }) }),

    getSubtasks: (id: string) => request<Task[]>(`/tasks/${id}/subtasks`),
  },

  llm: {
    categorize: (taskId: string, signal?: AbortSignal) =>
      request<{ taskId: string; category: string; confidence: number }>('/llm/categorize', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
        signal,
      }),

    decompose: (taskId: string, signal?: AbortSignal) =>
      request<{ taskId: string; subtasks: { title: string; description: string }[] }>('/llm/decompose', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
        signal,
      }),

    prioritize: (taskId: string, signal?: AbortSignal) =>
      request<{ taskId: string; priority: string; reason: string }>('/llm/prioritize', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
        signal,
      }),

    summarize: (signal?: AbortSignal) =>
      request<{ summary: string; stats: { total: number; overdue: number; done: number; byPriority: { HIGH: number; MEDIUM: number; LOW: number } } }>('/llm/summarize', {
        method: 'POST',
        body: JSON.stringify({}),
        signal,
      }),
  },
}

export interface Task {
  id: string
  title: string
  description: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE'
  deadline: string | null
  category: string | null
  parentId: string | null
  createdAt: string
  updatedAt: string
  subtasks?: Task[]
}
