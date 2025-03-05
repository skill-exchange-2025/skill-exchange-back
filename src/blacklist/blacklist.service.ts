import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class BlacklistService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  onModuleInit() {
    this.redisClient = new Redis({
      host: 'localhost', // Change if using a different host
      port: 6379,        // Default Redis port
    });
  }

  async addToBlacklist(token: string) {
    return await this.redisClient.set(`blacklist:${token}`, 'true', 'EX', 180); // 3 mins expiration
  }

  async isBlacklisted(token: string) {
    return await this.redisClient.get(`blacklist:${token}`); // Check if token is blacklisted
  }

  onModuleDestroy() {
    this.redisClient.quit(); // Close Redis connection when module is destroyed
  }
}
