/**
 * Port for running something once, at a given time. The application depends on this interface
 * only, so EventBridge Scheduler can be replaced (or faked in tests) without touching business
 * logic.
 */
export interface OneTimeScheduler {
  /** Re-scheduling a name that already exists is not an error: the first schedule stays. */
  schedule(params: { name: string; runAt: Date; payload: unknown }): Promise<void>;
  /** Cancelling a schedule that does not exist (already ran, or never created) is not an error. */
  cancel(name: string): Promise<void>;
}
