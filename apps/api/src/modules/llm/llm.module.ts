import { Module } from '@nestjs/common'
import { LlmController } from './llm.controller'
import { LlmService } from './llm.service'
import { TasksModule } from '../tasks/tasks.module'

@Module({
  imports: [TasksModule],
  controllers: [LlmController],
  providers: [LlmService],
})
export class LlmModule {}
