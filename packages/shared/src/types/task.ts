export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export interface ITask {
  id: string
  title: string
  description: string | null
  priority: Priority
  status: TaskStatus
  deadline: string | null
  category: string | null
  parentId: string | null
  createdAt: string
  updatedAt: string
  subtasks?: ITask[]
}

export interface ITaskFilter {
  status?: TaskStatus
  priority?: Priority
  search?: string
  deadlineBefore?: string
  deadlineAfter?: string
  overdue?: boolean
  parentId?: string | null
}

export interface IPaginatedResponse<T> {
  success: true
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface IApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown[]
  }
}
