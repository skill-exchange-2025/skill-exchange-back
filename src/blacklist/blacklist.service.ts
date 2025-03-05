import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class BlacklistService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  onModuleInit() {
    this.redisClient = new Redis({
      host: 'localhost', 
      port: 6379,        
    });
  }

  async addToBlacklist(token: string) {
    return await this.redisClient.set(`blacklist:${token}`, 'true', 'EX', 180); // 3 mins expiration
  }

  async isBlacklisted(token: string) {
    return await this.redisClient.get(`blacklist:${token}`); 
  }

  onModuleDestroy() {
    this.redisClient.quit(); 
  }
}
