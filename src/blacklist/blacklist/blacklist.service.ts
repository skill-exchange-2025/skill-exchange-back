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

  async addToBlacklist(token: string,expireTime: number) {
    return await this.redisClient.setex(`blacklist:${token}`,expireTime, 'true'); //desactivated aala toul

  }

  async isBlacklisted(token: string) {
    return await this.redisClient.get(`blacklist:${token}`); 
  }

  onModuleDestroy() {
    this.redisClient.quit(); 
  }
}
