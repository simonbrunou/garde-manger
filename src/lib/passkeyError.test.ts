import { describe, it, expect } from 'bun:test';
import { isPasskeyCancellation } from './passkeyError';

describe('isPasskeyCancellation', () => {
	it('detects a bare NotAllowedError / AbortError DOMException', () => {
		const notAllowed = Object.assign(new Error('x'), { name: 'NotAllowedError' });
		const abort = Object.assign(new Error('x'), { name: 'AbortError' });
		expect(isPasskeyCancellation(notAllowed)).toBe(true);
		expect(isPasskeyCancellation(abort)).toBe(true);
	});

	it('detects a @simplewebauthn WebAuthnError by code', () => {
		const err = Object.assign(new Error('ceremony aborted'), {
			name: 'WebAuthnError',
			code: 'ERROR_CEREMONY_ABORTED'
		});
		expect(isPasskeyCancellation(err)).toBe(true);
	});

	it('detects cancellation wrapped as the error cause', () => {
		const err = new Error('wrapper', {
			cause: Object.assign(new Error(), { name: 'NotAllowedError' })
		});
		expect(isPasskeyCancellation(err)).toBe(true);
	});

	it('does NOT treat real failures as cancellation', () => {
		expect(isPasskeyCancellation(new Error('Network request failed'))).toBe(false);
		expect(isPasskeyCancellation(Object.assign(new Error(), { name: 'SecurityError' }))).toBe(
			false
		);
		expect(isPasskeyCancellation('NotAllowedError')).toBe(false); // a string, not an Error
		expect(isPasskeyCancellation(null)).toBe(false);
	});
});
