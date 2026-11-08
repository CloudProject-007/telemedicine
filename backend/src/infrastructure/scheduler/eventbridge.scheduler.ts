import {
  ConflictException,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ResourceNotFoundException,
  SchedulerClient,
} from '@aws-sdk/client-scheduler';
import type { OneTimeScheduler } from './scheduler.types';

/** EventBridge Scheduler wants "at(yyyy-mm-ddThh:mm:ss)", and we pass the time zone as UTC. */
export function toAtExpression(runAt: Date): string {
  return `at(${runAt.toISOString().slice(0, 19)})`;
}

export interface EventBridgeSchedulerOptions {
  region: string;
  groupName: string;
  /** The SQS queue the schedule delivers into. */
  targetArn: string;
  /** The role EventBridge Scheduler assumes to write to that queue. */
  roleArn: string;
}

/**
 * One-time schedules in EventBridge Scheduler. When one fires, its payload is put on an SQS
 * queue, and the schedule deletes itself afterwards, so finished schedules do not pile up.
 */
export class EventBridgeScheduler implements OneTimeScheduler {
  private readonly client: SchedulerClient;

  constructor(private readonly options: EventBridgeSchedulerOptions) {
    this.client = new SchedulerClient({ region: options.region });
  }

  async schedule({
    name,
    runAt,
    payload,
  }: {
    name: string;
    runAt: Date;
    payload: unknown;
  }): Promise<void> {
    try {
      await this.client.send(
        new CreateScheduleCommand({
          Name: name,
          GroupName: this.options.groupName,
          ScheduleExpression: toAtExpression(runAt),
          ScheduleExpressionTimezone: 'UTC',
          FlexibleTimeWindow: { Mode: 'OFF' },
          ActionAfterCompletion: 'DELETE',
          Target: {
            Arn: this.options.targetArn,
            RoleArn: this.options.roleArn,
            Input: JSON.stringify(payload),
          },
        }),
      );
    } catch (error) {
      if (error instanceof ConflictException) return;
      throw error;
    }
  }

  async cancel(name: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteScheduleCommand({ Name: name, GroupName: this.options.groupName }),
      );
    } catch (error) {
      if (error instanceof ResourceNotFoundException) return;
      throw error;
    }
  }
}
