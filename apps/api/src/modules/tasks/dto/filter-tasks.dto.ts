import { IsOptional, IsEnum, IsString, IsDateString, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Priority, TaskStatus } from './create-task.dto'

export class FilterTasksDto {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority

  @ApiPropertyOptional({ example: 'отчёт' })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  deadlineBefore?: string

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  deadlineAfter?: string

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsString()
  overdue?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20
}
