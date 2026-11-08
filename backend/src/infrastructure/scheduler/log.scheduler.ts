import type { Logger } from '../logger';
import type { OneTimeScheduler } from './scheduler.types';

/** Used when EventBridge is not configured. Nothing runs later: the request is only logged. */
export class LogScheduler implements OneTimeScheduler {
  constructor(private readonly logger: Logger) {}

  schedule({ name, runAt }: { name: string; runAt: Date; payload: unknown }): Promise<void> {
    this.logger.info({ name, runAt }, '[schedule] would create a one-time schedule');
    return Promise.resolve();
  }

  cancel(name: string): Promise<void> {
    this.logger.info({ name }, '[schedule] would cancel a one-time schedule');
    return Promise.resolve();
  }
}
