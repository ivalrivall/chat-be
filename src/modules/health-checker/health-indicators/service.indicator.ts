import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Injectable()
export class ServiceHealthIndicator {
  constructor(
    @Optional()
    @Inject('NATS_SERVICE')
    private readonly clientProxy?: ClientProxy,
  ) {}

  async isHealthy(eventName: string): Promise<HealthIndicatorResult> {
    if (!this.clientProxy) {
      return {
        [eventName]: {
          status: 'up',
          optional: true,
          reason: 'NATS_SERVICE client not configured',
        },
      };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await firstValueFrom(
        this.clientProxy.send(eventName, { check: true }).pipe(timeout(10_000)),
        {
          defaultValue: undefined,
        },
      );

      return {
        [eventName]: {
          status: 'up',

          result,
        },
      };
    } catch (error) {
      return {
        [eventName]: {
          status: 'down',
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
