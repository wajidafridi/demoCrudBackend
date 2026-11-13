/**
 * Tiny bridge so Axios can clear auth on HTTP 401 without importing Pinia.
 * `main.ts` registers the auth store's `clearSession` after Pinia is ready.
 */
export type UnauthorizedSessionHandler = () => void

let unauthorizedSessionHandler: UnauthorizedSessionHandler | null = null

export function registerUnauthorizedSessionHandler(handler: UnauthorizedSessionHandler): void {
  unauthorizedSessionHandler = handler
}

export function clearUnauthorizedSessionHandler(): void {
  unauthorizedSessionHandler = null
}

/** Invokes the registered handler if any; safe no-op when none is registered. */
export function handleUnauthorizedSession(): void {
  unauthorizedSessionHandler?.()
}
