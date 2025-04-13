import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractTokenFromHeader(client);

    if (!token) {
      console.log('No token provided');
      return false;
    }
    try {
      const payload = this.jwtService.verify(token);
      client['user'] = payload;
      return true;
    } catch {
      return false;
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    const auth =
      client.handshake.headers.authorization || client.handshake.auth.token;
    if (!auth) return undefined;

    const [type, token] = auth.toString().split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
