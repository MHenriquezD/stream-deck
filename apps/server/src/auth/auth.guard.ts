import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    // If no PIN configured, allow all requests (auth not active yet)
    if (!this.authService.isPinConfigured()) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token || !this.authService.validateToken(token)) {
      throw new UnauthorizedException('Token inválido o no proporcionado');
    }

    return true;
  }

  private extractToken(request: any): string | null {
    const auth = request.headers?.authorization;
    if (auth?.startsWith('Bearer ')) {
      return auth.slice(7);
    }
    return null;
  }
}
