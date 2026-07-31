import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.usersService.create(dto);

    const tokens = this.authService.login(user.id, user.email);

    return { user, tokens };
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(@Request() req: AuthenticatedRequest) {
    return this.authService.login(req.user.id, req.user.email);
  }
}
