import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Prisma } from '@prisma/client'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { FilterTasksDto } from './dto/filter-tasks.dto'

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: { subtasks: { orderBy: { createdAt: 'asc' } } },
    })
  }

  async findMany(filter: FilterTasksDto) {
    const { page = 1, limit = 20, overdue, ...rest } = filter
    const where = this.buildWhere(rest, overdue)

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: { subtasks: { orderBy: { createdAt: 'asc' } } },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ])

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async create(dto: CreateTaskDto) {
    const data: Prisma.TaskCreateInput = {
      title: dto.title,
      description: dto.description ?? null,
      priority: dto.priority ?? 'MEDIUM',
      status: dto.status ?? 'PENDING',
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      category: dto.category ?? null,
    }

    if (dto.parentId) {
      data.parent = { connect: { id: dto.parentId } }
    }

    return this.prisma.task.create({ data })
  }

  async update(id: string, dto: UpdateTaskDto) {
    const data: Prisma.TaskUpdateInput = {}

    if (dto.title !== undefined) data.title = dto.title
    if (dto.description !== undefined) data.description = dto.description
    if (dto.priority !== undefined) data.priority = dto.priority
    if (dto.status !== undefined) data.status = dto.status
    if (dto.category !== undefined) data.category = dto.category
    if (dto.deadline !== undefined) {
      data.deadline = dto.deadline ? new Date(dto.deadline) : null
    }
    if (dto.parentId !== undefined) {
      data.parent = dto.parentId
        ? { connect: { id: dto.parentId } }
        : { disconnect: true }
    }

    return this.prisma.task.update({ where: { id }, data })
  }

  async delete(id: string) {
    return this.prisma.task.delete({ where: { id } })
  }

  async reorder(taskIds: string[]) {
    await this.prisma.$transaction(
      taskIds.map((id, index) =>
        this.prisma.task.update({ where: { id }, data: { order: index } }),
      ),
    )
    return { success: true }
  }

  async findAllForSummary() {
    return this.prisma.task.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        deadline: true,
        category: true,
        createdAt: true,
      },
      orderBy: { deadline: 'asc' },
    })
  }

  private buildWhere(
    filter: Omit<FilterTasksDto, 'page' | 'limit' | 'overdue'>,
    overdue?: string,
  ): Prisma.TaskWhereInput {
    const conditions: Prisma.TaskWhereInput = {}

    if (filter.status) conditions.status = filter.status
    if (filter.priority) conditions.priority = filter.priority

    if (filter.search) {
      conditions.OR = [
        { title: { contains: filter.search } },
        { description: { contains: filter.search } },
      ]
    }

    if (filter.deadlineBefore || filter.deadlineAfter) {
      conditions.deadline = {}
      if (filter.deadlineBefore) {
        (conditions.deadline as Prisma.DateTimeNullableFilter).lte = new Date(filter.deadlineBefore)
      }
      if (filter.deadlineAfter) {
        (conditions.deadline as Prisma.DateTimeNullableFilter).gte = new Date(filter.deadlineAfter)
      }
    }

    if (overdue === 'true') {
      conditions.deadline = {
        ...(conditions.deadline as Prisma.DateTimeNullableFilter),
        lt: new Date(),
      }
      conditions.status = { notIn: ['DONE'] }
    }

    if (filter.parentId !== undefined) {
      if (filter.parentId === 'null' || filter.parentId === '') {
        conditions.parentId = null
      } else {
        conditions.parentId = filter.parentId
      }
    }

    return conditions
  }
}
