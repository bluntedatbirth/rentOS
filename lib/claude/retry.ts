export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

/**
 * Returns true for errors that are transient and worth retrying:
 * - Rate limit errors (429)
 * - Server errors (500, 502, 503, 529)
 * - Network/connection errors
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Network-level errors
    if (
      msg.includes('econnreset') ||
      msg.includes('econnrefused') ||
      msg.includes('etimedout') ||
      msg.includes('fetch failed') ||
      msg.includes('network') ||
      msg.includes('socket hang up')
    ) {
      return true;
    }

    // Anthropic SDK errors expose a `status` property
    const status = (error as unknown as Record<string, unknown>).status;
    if (typeof status === 'number') {
      // 429 = rate limit, 500/502/503/529 = server issues
      return status === 429 || status >= 500;
    }
  }
  return false;
}

/**
 * Wraps an async function with exponential backoff + jitter retry logic.
 * Only retries on transient errors (rate limits, network, server errors).
 * Client errors (400-level except 429) are thrown immediately.
 */
export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelay = options?.baseDelay ?? 1000;
  const maxDelay = options?.maxDelay ?? 30000;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !isTransientError(error)) {
        throw error;
      }

      // Exponential backoff: baseDelay * 2^attempt, capped at maxDelay
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      // Add jitter: random value between 0 and the exponential delay
      const jitter = Math.random() * exponentialDelay;
      const delay = Math.min(exponentialDelay + jitter, maxDelay);

      console.warn(
        `[claude-retry] Attempt ${attempt + 1}/${maxRetries} failed with: ${
          error instanceof Error ? error.message : String(error)
        }. Retrying in ${Math.round(delay)}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should not reach here, but TypeScript needs it
  throw lastError;
}
