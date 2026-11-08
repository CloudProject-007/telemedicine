import { describe, expect, it } from 'vitest';
import { SlidingWindowLimiter } from '../../src/sockets/rate-limiter';

describe('SlidingWindowLimiter', () => {
  it('blocks after the limit and recovers when the window slides', () => {
    const limiter = new SlidingWindowLimiter(3, 1000);
    expect(limiter.tryConsume(0)).toBe(true);
    expect(limiter.tryConsume(100)).toBe(true);
    expect(limiter.tryConsume(200)).toBe(true);
    expect(limiter.tryConsume(300)).toBe(false);
    expect(limiter.tryConsume(1001)).toBe(true); // the event at t=0 left the window
    expect(limiter.tryConsume(1002)).toBe(false);
  });

  it('does not count rejected attempts against the window', () => {
    const limiter = new SlidingWindowLimiter(1, 1000);
    expect(limiter.tryConsume(0)).toBe(true);
    expect(limiter.tryConsume(500)).toBe(false);
    expect(limiter.tryConsume(1001)).toBe(true);
  });
});
