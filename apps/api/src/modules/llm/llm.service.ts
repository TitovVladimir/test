import { Injectable, Logger, NotFoundException, BadGatewayException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TasksRepository } from '../tasks/tasks.repository'

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AnthropicResponse {
  content: { type: string; text: string }[]
  usage?: { input_tokens: number; output_tokens: number }
}

@Injectable()
export class LlmService {
  private readonly apiKey: string
  private readonly model: string
  private readonly baseUrl: string
  private readonly logger = new Logger(LlmService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly tasksRepository: TasksRepository,
  ) {
    this.apiKey = this.configService.get<string>('llm.apiKey') ?? ''
    this.model = this.configService.get<string>('llm.model') ?? 'GLM-5-Turbo'
    this.baseUrl = this.configService.get<string>('llm.baseUrl') ?? 'https://api.z.ai/api/anthropic'
  }

  async categorize(taskId: string) {
    const task = await this.tasksRepository.findById(taskId)
    if (!task) throw new NotFoundException(`Task ${taskId} not found`)

    const response = await this.callLlmJson([
      {
        role: 'system',
        content: `Ты — ассистент для категоризации задач. На основе названия и описания задачи предложи одну категорию из списка: [Работа, Личное, Учёба, Здоровье, Финансы, Проект, Другое].
Ответ строго в JSON: { "category": "...", "confidence": 0.0-1.0 }

Пример:
Вход: { "title": "Подготовить отчёт для начальника", "description": "Сделать Q4 отчёт по продажам" }
Выход: { "category": "Работа", "confidence": 0.95 }`,
      },
      {
        role: 'user',
        content: `Вход: ${JSON.stringify({ title: task.title, description: task.description || '' })}`,
      },
    ])

    return { taskId, ...response }
  }

  async decompose(taskId: string) {
    const task = await this.tasksRepository.findById(taskId)
    if (!task) throw new NotFoundException(`Task ${taskId} not found`)

    const response = await this.callLlmJson([
      {
        role: 'system',
        content: `Ты — ассистент для декомпозиции задач. Разбей задачу на 2-5 конкретных подзадач.
Каждая подзадача должна быть actionable (можно начать делать сразу).
Ответ строго в JSON: { "subtasks": [{ "title": "...", "description": "..." }] }

Пример:
Вход: { "title": "Запустить маркетинговую кампанию", "description": "Подготовить и запустить рекламную кампанию нового продукта" }
Выход: {
  "subtasks": [
    { "title": "Определить целевую аудиторию", "description": "Проанализировать текущую базу клиентов и составить портрет целевой аудитории" },
    { "title": "Создать рекламные материалы", "description": "Подготовить баннеры, тексты и лендинг для кампании" },
    { "title": "Настроить рекламные каналы", "description": "Запустить рекламу в Яндекс.Директ и VK Ads с тестовым бюджетом" },
    { "title": "Настроить аналитику", "description": "Подключить UTM-метки и дашборд для отслеживания конверсий" }
  ]
}`,
      },
      {
        role: 'user',
        content: `Вход: ${JSON.stringify({
          title: task.title,
          description: task.description || '',
          deadline: task.deadline?.toISOString(),
        })}`,
      },
    ])

    return { taskId, ...response }
  }

  async prioritize(taskId: string) {
    const task = await this.tasksRepository.findById(taskId)
    if (!task) throw new NotFoundException(`Task ${taskId} not found`)

    const today = new Date().toISOString().split('T')[0]

    const response = await this.callLlmJson([
      {
        role: 'system',
        content: `Ты — ассистент для определения приоритета задач. Проанализируй описание задачи и срок.
Учитывай: срочность (близость дедлайна), важность (влияние на другие задачи), трудоёмкость.
Ответ строго в JSON: { "priority": "LOW"|"MEDIUM"|"HIGH", "reason": "краткое обоснование" }

Пример:
Вход: { "title": "Подготовить презентацию", "description": "Питч для инвесторов по серии A", "deadline": "2025-01-20" }
Сегодня: 2025-01-18
Выход: { "priority": "HIGH", "reason": "Дедлайн через 2 дня, задача влияет на привлечение финансирования" }`,
      },
      {
        role: 'user',
        content: `Вход: ${JSON.stringify({
          title: task.title,
          description: task.description || '',
          deadline: task.deadline?.toISOString().split('T')[0],
        })}
Сегодня: ${today}`,
      },
    ])

    return { taskId, ...response }
  }

  async summarize() {
    const tasks = await this.tasksRepository.findAllForSummary()

    const tasksSummary = tasks.map((t) => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      deadline: t.deadline?.toISOString().split('T')[0],
      category: t.category,
    }))

    const overdueCount = tasks.filter(
      (t) => t.deadline && t.deadline < new Date() && t.status !== 'DONE',
    ).length

    const response = await this.callLlmText([
      {
        role: 'system',
        content: `Ты — ассистент для анализа рабочей нагрузки. На основе списка задач составь краткую естественно-языковую сводку.
Включи: просроченные задачи, ближайшие сроки, распределение по статусам и приоритетам, рекомендации.
Ответ в формате markdown. Будь краток и конкретен.`,
      },
      {
        role: 'user',
        content: `Задачи пользователя (${tasks.length} всего, ${overdueCount} просрочено):
${JSON.stringify(tasksSummary, null, 2)}`,
      },
    ])

    return {
      summary: response,
      stats: {
        total: tasks.length,
        overdue: overdueCount,
        done: tasks.filter((t) => t.status === 'DONE').length,
        byPriority: {
          HIGH: tasks.filter((t) => t.priority === 'HIGH' && t.status !== 'DONE').length,
          MEDIUM: tasks.filter((t) => t.priority === 'MEDIUM' && t.status !== 'DONE').length,
          LOW: tasks.filter((t) => t.priority === 'LOW' && t.status !== 'DONE').length,
        },
      },
    }
  }

  private async callAnthropic(systemPrompt: string, messages: AnthropicMessage[]): Promise<string> {
    const url = `${this.baseUrl}/v1/messages`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Anthropic API ${res.status}: ${body}`)
    }

    const data = (await res.json()) as AnthropicResponse
    const text = data.content?.[0]?.text
    if (!text) throw new Error('Empty response from LLM')
    return text
  }

  private async callWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        const err = error as { status?: number; message?: string }
        const isRateLimit = err.message?.includes('429') || err.message?.includes('rate')
        if (isRateLimit && attempt < retries) {
          const delay = attempt * 2000
          this.logger.warn(`Rate limited, retrying in ${delay}ms (attempt ${attempt}/${retries})`)
          await new Promise((r) => setTimeout(r, delay))
          continue
        }
        throw error
      }
    }
    throw new Error('Max retries exceeded')
  }

  private async callLlmJson(messages: { role: string; content: string }[]) {
    try {
      this.logger.log(`Calling LLM JSON with model: ${this.model}`)

      const systemPrompt = messages.find((m) => m.role === 'system')?.content ?? ''
      const userMessages: AnthropicMessage[] = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      const content = await this.callWithRetry(() => this.callAnthropic(systemPrompt, userMessages))

      this.logger.log(`LLM raw response: ${content.substring(0, 200)}`)

      // Try to extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [, content]
      const jsonStr = jsonMatch[1].trim()
      return JSON.parse(jsonStr)
    } catch (error) {
      const err = error as Error
      this.logger.error(`LLM JSON call failed: ${err.message}`)
      throw new BadGatewayException(`LLM error: ${err.message}`)
    }
  }

  private async callLlmText(messages: { role: string; content: string }[]) {
    try {
      this.logger.log(`Calling LLM text with model: ${this.model}`)

      const systemPrompt = messages.find((m) => m.role === 'system')?.content ?? ''
      const userMessages: AnthropicMessage[] = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      const content = await this.callWithRetry(() => this.callAnthropic(systemPrompt, userMessages))

      return content
    } catch (error) {
      const err = error as Error
      this.logger.error(`LLM text call failed: ${err.message}`)
      throw new BadGatewayException(`LLM error: ${err.message}`)
    }
  }
}
