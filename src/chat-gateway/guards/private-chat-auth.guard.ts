import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';  // Import JwtAuthGuard
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Inject } from '@nestjs/common';

@Injectable()
export class PrivateChatAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtAuthGuard) private readonly jwtAuthGuard: JwtAuthGuard, // Use dependency injection to get JwtAuthGuard
    private reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Call the original JwtAuthGuard logic to check for the JWT token
    return this.jwtAuthGuard.canActivate(context);
  }
}
