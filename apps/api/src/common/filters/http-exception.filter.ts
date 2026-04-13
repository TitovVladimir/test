import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Response, Request } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>)?.message ?? 'Internal server error'

    const details =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'details' in (exceptionResponse as object)
        ? (exceptionResponse as { details: unknown }).details
        : undefined

    this.logger.error({
      status,
      path: request.url,
      method: request.method,
      error: exception instanceof Error ? exception.message : String(exception),
    })

    response.status(status).json({
      success: false,
      error: {
        code:
          typeof message === 'string'
            ? HttpStatus[status] ?? 'UNKNOWN_ERROR'
            : 'VALIDATION_ERROR',
        message: typeof message === 'string' ? message : (message as string[]).join('; '),
        ...(details ? { details } : {}),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
