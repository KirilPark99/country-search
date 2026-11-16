import { HttpError } from './countries.js';

export function getErrorMessage(error: unknown): string | null {
  if (error instanceof Error && error.name === 'AbortError') return null;
  if (error instanceof Error && error.name === 'TimeoutError') {
    return 'The request timed out. Please try again.';
  }
  if (error instanceof HttpError) {
    return `The server returned HTTP ${error.status}. Please try again.`;
  }
  return 'Could not load countries. Check your connection and try again.';
}
