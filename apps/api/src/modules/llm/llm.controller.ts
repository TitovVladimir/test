import { Controller, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { LlmService } from './llm.service'
import { IsUUID, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

class LlmTaskBodyDto {
  @ApiProperty({ example: 'uuid-task-id' })
  @IsUUID()
  taskId!: string
}

class SummarizeBodyDto {
  @IsOptional()
  placeholder?: string
}

@ApiTags('llm')
@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Post('categorize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'US-3: Suggest category for a task' })
  async categorize(@Body() body: LlmTaskBodyDto) {
    return this.llmService.categorize(body.taskId)
  }

  @Post('decompose')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'US-4: Decompose task into subtasks' })
  async decompose(@Body() body: LlmTaskBodyDto) {
    return this.llmService.decompose(body.taskId)
  }

  @Post('prioritize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'US-5: Suggest priority for a task' })
  async prioritize(@Body() body: LlmTaskBodyDto) {
    return this.llmService.prioritize(body.taskId)
  }

  @Post('summarize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'US-6: Generate workload summary' })
  async summarize(@Body() _body: SummarizeBodyDto) {
    return this.llmService.summarize()
  }
}
