import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** GET /auth/status — Check if PIN is configured (public) */
  @Get('status')
  status() {
    return { pinConfigured: this.authService.isPinConfigured() };
  }

  /** POST /auth/setup-pin — Set PIN for the first time (public, only works when no PIN exists) */
  @Post('setup-pin')
  setupPin(@Body() body: { pin: string }) {
    if (!body.pin || body.pin.length !== 4 || !/^\d{4}$/.test(body.pin)) {
      return { success: false, message: 'El PIN debe ser de 4 dígitos' };
    }
    if (this.authService.isPinConfigured()) {
      // PIN already exists — try to login with the provided PIN
      return this.authService.login(body.pin);
    }
    return this.authService.setPin(body.pin);
  }

  /** POST /auth/change-pin — Change PIN (requires authentication) */
  @Post('change-pin')
  @UseGuards(AuthGuard)
  changePin(@Body() body: { pin: string }) {
    if (!body.pin || body.pin.length !== 4 || !/^\d{4}$/.test(body.pin)) {
      return { success: false, message: 'El PIN debe ser de 4 dígitos' };
    }
    return this.authService.setPin(body.pin);
  }

  /** POST /auth/login — Validate PIN and return session token (public) */
  @Post('login')
  login(@Body() body: { pin: string }) {
    return this.authService.login(body.pin);
  }

  /** POST /auth/logout — Invalidate session token */
  @Post('logout')
  logout(@Req() req: Request) {
    const token = this.extractToken(req);
    if (token) {
      this.authService.logout(token);
    }
    return { success: true };
  }

  /** GET /auth/check — Verify if current token is valid */
  @Get('check')
  check(@Req() req: Request) {
    const token = this.extractToken(req);
    if (token && this.authService.validateToken(token)) {
      return { authenticated: true };
    }
    return { authenticated: false };
  }

  private extractToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      return auth.slice(7);
    }
    return null;
  }
}
