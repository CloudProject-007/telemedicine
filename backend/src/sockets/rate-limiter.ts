/**
 * Small in-memory sliding-window limiter, one instance per socket connection.
 * (Per-connection state is enough: a socket is pinned to one server process.)
 */
export class SlidingWindowLimiter {
  private timestamps: number[] = [];

  constructor(
    private readonly maxEvents: number,
    private readonly windowMs: number,
  ) {}

  /** Returns true when the event is allowed and records it. */
  tryConsume(now: number = Date.now()): boolean {
    const windowStart = now - this.windowMs;
    this.timestamps = this.timestamps.filter((timestamp) => timestamp > windowStart);
    if (this.timestamps.length >= this.maxEvents) {
      return false;
    }
    this.timestamps.push(now);
    return true;
  }
}
