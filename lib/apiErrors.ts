export function apiError(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

export function unauthorized() {
  return apiError('Unauthorized', 401);
}

export function forbidden() {
  return apiError('Forbidden', 403);
}

export function notFound(message = 'Not found') {
  return apiError(message, 404);
}

export function badRequest(message: string) {
  return apiError(message, 400);
}

export function serverError(message: string) {
  return apiError(message, 500);
}
