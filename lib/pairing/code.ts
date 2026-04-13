const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // 36 chars
const CODE_LENGTH = 8;

/**
 * Generate an 8-character uppercase alphanumeric pair code (A-Z, 0-9).
 * Uses crypto.getRandomValues — works in Node.js 19+ and all modern browsers.
 * Collision uniqueness is enforced at the DB level via a unique partial index.
 */
export function generatePairCode(): string {
  // Rejection sampling: discard bytes >= 252 (highest multiple of 36 <= 256)
  // so every kept byte maps to one of 36 chars with equal probability.
  const result: string[] = [];
  while (result.length < CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH * 2));
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i]!;
      if (byte < 252 && result.length < CODE_LENGTH) {
        result.push(CHARS[byte % 36]!);
      }
    }
  }
  return result.join('');
}
