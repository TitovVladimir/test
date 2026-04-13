import { Injectable, NotFoundException } from '@nestjs/common'
import { TasksRepository } from './tasks.repository'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { FilterTasksDto } from './dto/filter-tasks.dto'

@Injectable()
export class TasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

  async findById(id: string) {
    const task = await this.tasksRepository.findById(id)
    if (!task) throw new NotFoundException(`Task ${id} not found`)
    return task
  }

  async findMany(filter: FilterTasksDto) {
    return this.tasksRepository.findMany(filter)
  }

  async create(dto: CreateTaskDto) {
    if (dto.parentId) {
      const parent = await this.tasksRepository.findById(dto.parentId)
      if (!parent) throw new NotFoundException(`Parent task ${dto.parentId} not found`)
    }
    return this.tasksRepository.create(dto)
  }

  async update(id: string, dto: UpdateTaskDto) {
    await this.findById(id)
    return this.tasksRepository.update(id, dto)
  }

  async delete(id: string) {
    await this.findById(id)
    return this.tasksRepository.delete(id)
  }

  async getSubtasks(parentId: string) {
    await this.findById(parentId)
    const parent = await this.tasksRepository.findById(parentId)
    return parent?.subtasks ?? []
  }

  async findAllForSummary() {
    return this.tasksRepository.findAllForSummary()
  }

  async reorder(taskIds: string[]) {
    return this.tasksRepository.reorder(taskIds)
  }
}
