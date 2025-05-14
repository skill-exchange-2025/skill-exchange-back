import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const client: Socket = context.switchToWs().getClient();
    let token = this.extractTokenFromHeader(client);

    if (!token) {
      console.log('No token provided');
      return false;
    } else {
      console.log('Token provided');
      console.log('Token:', token); // Log the token for debugging
    }

    // split the token to remove the "Bearer" prefix if it exists
    const tokenParts = token.split(' ');
    if (tokenParts.length > 1) {
      token = tokenParts[1];
    }

    try {
      // Get the JWT secret from configuration
      const secret =
        this.configService.get<string>('jwt.secret') || 'defaultSecret';

      // Verify the token with the correct secret
      const payload = this.jwtService.verify(token, { secret });

      // Attach the user to the client for later use
      client['user'] = payload;
      console.log('User authenticated:', payload.email);
      return true;
    } catch (error) {
      console.log('Token verification failed:', error.message);
      return false;
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    // Try both handshake authorization header and auth object
    const authHeader = client.handshake.headers.authorization;
    const authToken = client.handshake.auth?.token;

    if (authHeader) {
      const [type, token] = authHeader.toString().split(' ');
      return type === 'Bearer' ? token : authHeader;
    }

    // Return the token directly if it's in auth object
    return authToken;
  }
}
