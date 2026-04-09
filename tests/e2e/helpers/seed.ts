/**
 * Calls the dev seed-user API to ensure test users exist in the database.
 * Should be called in test.beforeAll or test.beforeEach when tests need
 * seeded data.
 */
export async function seedTestUsers(baseURL: string): Promise<void> {
  const response = await fetch(`${baseURL}/api/dev/seed-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`seed-user failed (${response.status}): ${text}`);
  }
}

/**
 * Generic helper to call any dev seed endpoint.
 * @param baseURL - The base URL of the app (e.g. http://localhost:3000)
 * @param endpoint - The seed endpoint path (e.g. '/api/dev/seed-user')
 * @param body - Optional JSON body to send
 */
export async function callSeedEndpoint(
  baseURL: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(`${baseURL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${endpoint} failed (${response.status}): ${text}`);
  }
  return response.json();
}
