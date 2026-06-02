/**
 * True when a WebAuthn ceremony error represents a user cancellation/abort
 * rather than a real failure. `@simplewebauthn/browser` throws a `WebAuthnError`
 * carrying `code: 'ERROR_CEREMONY_ABORTED'` and wrapping the original
 * `DOMException` ('NotAllowedError' / 'AbortError') as its `cause`; some browsers
 * surface those DOMExceptions directly. Checking `err.message` (the old approach)
 * is unreliable because the message text is not guaranteed to contain the name.
 */
export function isPasskeyCancellation(err: unknown): boolean {
	const name = err instanceof Error ? err.name : '';
	const causeName = err instanceof Error && err.cause instanceof Error ? err.cause.name : '';
	const code =
		typeof err === 'object' && err !== null && 'code' in err
			? String((err as { code: unknown }).code)
			: '';
	return (
		name === 'NotAllowedError' ||
		name === 'AbortError' ||
		causeName === 'NotAllowedError' ||
		causeName === 'AbortError' ||
		code === 'ERROR_CEREMONY_ABORTED'
	);
}
