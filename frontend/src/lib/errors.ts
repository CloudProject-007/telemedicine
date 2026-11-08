import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api/client';

/** A message safe to show a person. Unknown errors get the fallback, never a stack trace. */
export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Try again.',
): string {
  return error instanceof ApiError ? error.message : fallback;
}

interface FieldIssue {
  path: string;
  message: string;
}

function isFieldIssues(details: unknown): details is FieldIssue[] {
  return (
    Array.isArray(details) &&
    details.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as FieldIssue).path === 'string' &&
        typeof (item as FieldIssue).message === 'string',
    )
  );
}

/**
 * Copies the API's per-field validation messages onto the matching form fields.
 * Returns true when at least one field was updated (so the caller can skip a generic toast).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  if (!(error instanceof ApiError) || !isFieldIssues(error.details)) {
    return false;
  }
  let applied = false;
  for (const issue of error.details) {
    const field = fields.find((name) => name === issue.path);
    if (field) {
      setError(field, { type: 'server', message: issue.message });
      applied = true;
    }
  }
  return applied;
}
