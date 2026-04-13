import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Public } from './public.decorator'

@Controller('auth')
export class AuthController {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body('password') password: string) {
    const validPassword = this.config.get<string>('auth.password') ?? 'tasks2024'
    if (password !== validPassword) {
      throw new UnauthorizedException('Неверный пароль')
    }

    const token = this.jwt.sign(
      { userId: 'shared' },
      {
        secret: this.config.get<string>('auth.jwtSecret') ?? 'dev-secret',
        expiresIn: '7d',
      },
    )

    return { success: true, data: { token } }
  }
}
