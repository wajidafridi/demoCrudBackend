/**
 * Accept only same-app relative paths.
 * Rejects protocol-relative URLs (`//evil.com`) and non-path values.
 */
export function resolveSafeInternalPath(redirect: unknown, fallback: string = '/'): string {
  if (typeof redirect !== 'string') {
    return fallback
  }

  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    return fallback
  }

  return redirect
}
