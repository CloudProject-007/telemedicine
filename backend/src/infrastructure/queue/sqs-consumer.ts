import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
  type Message,
} from '@aws-sdk/client-sqs';
import type { Logger } from '../logger';

const WAIT_SECONDS = 20; // long polling: fewer empty responses, lower cost
const BATCH_SIZE = 10;
const HANDLER_TIMEOUT_SECONDS = 60;
const BACKOFF_MS = 5_000;

export interface SqsConsumerOptions {
  queueUrl: string;
  region: string;
  logger: Logger;
  /**
   * Handles one message body. Resolve to delete the message. Throw to leave it on the queue, where
   * it becomes visible again after a delay and, after enough attempts, moves to the dead-letter queue.
   */
  handler: (body: string) => Promise<void>;
}

export interface SqsConsumer {
  /** Stops asking for messages and waits for the ones being handled. */
  stop: () => Promise<void>;
}

export function startSqsConsumer(options: SqsConsumerOptions): SqsConsumer {
  const { queueUrl, logger, handler } = options;
  const client = new SQSClient({ region: options.region });
  const abort = new AbortController();

  const handle = async (message: Message): Promise<void> => {
    if (!message.Body || !message.ReceiptHandle) return;
    try {
      await handler(message.Body);
      await client.send(
        new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle }),
      );
    } catch (error) {
      logger.error(
        { err: error, messageId: message.MessageId },
        'Queue message failed, will retry',
      );
    }
  };

  const loop = async (): Promise<void> => {
    while (!abort.signal.aborted) {
      try {
        const result = await client.send(
          new ReceiveMessageCommand({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: BATCH_SIZE,
            WaitTimeSeconds: WAIT_SECONDS,
            VisibilityTimeout: HANDLER_TIMEOUT_SECONDS,
          }),
          { abortSignal: abort.signal },
        );
        await Promise.all((result.Messages ?? []).map(handle));
      } catch (error) {
        if (abort.signal.aborted) return;
        logger.error({ err: error }, 'Could not read the reminder queue, retrying shortly');
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS));
      }
    }
  };

  const running = loop();
  logger.info({ queueUrl }, 'Reminder worker started');

  return {
    stop: async () => {
      abort.abort();
      await running;
      client.destroy();
    },
  };
}
