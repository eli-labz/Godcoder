/**
 * Extract error message from unknown error type.
 * Use this in catch blocks instead of (error: any).
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}

/**
 * Extract error with stack trace for logging.
 */
export function getErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  return String(error);
}
