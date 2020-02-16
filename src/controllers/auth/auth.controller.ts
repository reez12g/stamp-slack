import { Controller, Query, Get } from '@nestjs/common';
import { AuthService } from '../../providers/auth/auth.service';
import { TempAuthTokenDTO } from '../../dto/auth/auth.token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  async exchangeTempAuthToken(@Query() query: TempAuthTokenDTO) {
    return this.authService.exchangeTempAuthToken(query);
  }
}
