import { z } from 'zod'

export const PriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH'])
export const TaskStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'DONE'])

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(255, 'Максимум 255 символов'),
  description: z.string().max(2000, 'Максимум 2000 символов').optional().nullable(),
  priority: PriorityEnum.default('MEDIUM'),
  status: TaskStatusEnum.default('PENDING'),
  deadline: z.string().datetime({ offset: true }).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
})

export const updateTaskSchema = createTaskSchema.partial()

export const filterTasksSchema = z.object({
  status: TaskStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  search: z.string().optional(),
  deadlineBefore: z.string().datetime({ offset: true }).optional(),
  deadlineAfter: z.string().datetime({ offset: true }).optional(),
  overdue: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  parentId: z.string().optional().nullable(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type FilterTasksInput = z.infer<typeof filterTasksSchema>
