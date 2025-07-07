import { Injectable, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class BlacklistService implements OnModuleDestroy {
  private tokenBlacklist: Map<string, { value: string, expireAt: number }> = new Map();

  constructor() {
    // Nettoyage périodique des tokens expirés (toutes les 5 minutes)
    setInterval(() => this.cleanExpiredTokens(), 5 * 60 * 1000);
  }

  async addToBlacklist(token: string, expireTime: number): Promise<string> {
    const expireAt = Date.now() + (expireTime * 1000);
    this.tokenBlacklist.set(`blacklist:${token}`, { value: 'true', expireAt });
    return 'OK';
  }

  async isBlacklisted(token: string): Promise<string | null> {
    const blacklistedToken = this.tokenBlacklist.get(`blacklist:${token}`);
    if (!blacklistedToken) return null;

    if (Date.now() > blacklistedToken.expireAt) {
      this.tokenBlacklist.delete(`blacklist:${token}`);
      return null;
    }

    return blacklistedToken.value;
  }

  private cleanExpiredTokens(): void {
    const now = Date.now();
    for (const [key, value] of this.tokenBlacklist.entries()) {
      if (now > value.expireAt) {
        this.tokenBlacklist.delete(key);
      }
    }
  }

  onModuleDestroy() {
    // Nettoyage lors de l'arrêt de l'application
    this.tokenBlacklist.clear();
  }
}
