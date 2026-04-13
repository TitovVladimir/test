import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, MaxLength, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

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

export class CreateTaskDto {
  @ApiProperty({ example: 'Подготовить отчёт', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string

  @ApiPropertyOptional({ example: 'Сделать Q4 отчёт по продажам', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @ApiPropertyOptional({ enum: Priority, default: Priority.MEDIUM })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.PENDING })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus

  @ApiPropertyOptional({ example: '2025-02-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  deadline?: string

  @ApiPropertyOptional({ example: 'Работа', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string

  @ApiPropertyOptional({ example: 'uuid-parent-task' })
  @IsOptional()
  @IsUUID()
  parentId?: string
}
