import { z } from 'zod';

/**
 * Behind CloudFront the app and the API share one origin, so VITE_API_URL can be a path such as
 * `/api/v1`. It is resolved against the page's own origin; a full URL is used as it is.
 */
const resolveUrl = (value: string, base: string): string => new URL(value, base).toString();

const envSchema = z
  .object({
    VITE_API_URL: z.string().min(1).default('http://localhost:4000/api/v1'),
    /** Where Socket.IO lives. Defaults to the API's own origin, which is how the backend serves it. */
    VITE_SOCKET_URL: z.string().min(1).optional(),
  })
  .transform((raw, context) => {
    try {
      const apiUrl = resolveUrl(raw.VITE_API_URL, window.location.origin);
      return {
        VITE_API_URL: apiUrl,
        VITE_SOCKET_URL: raw.VITE_SOCKET_URL
          ? resolveUrl(raw.VITE_SOCKET_URL, window.location.origin)
          : new URL(apiUrl).origin,
      };
    } catch {
      context.addIssue({
        code: 'custom',
        message: 'VITE_API_URL and VITE_SOCKET_URL must be URLs or paths',
      });
      return z.NEVER;
    }
  });

/** Validated at start-up so a bad deployment setting fails loudly instead of at the first request. */
export const env = envSchema.parse(import.meta.env);
